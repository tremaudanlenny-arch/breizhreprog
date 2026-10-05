"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, Html, Line, OrbitControls } from "@react-three/drei";

interface Map3DMappingEditorProps {
  values: number[][];
  minValue: number;
  maxValue: number;
  selectedCell: { row: number; col: number } | null;
  onSelectCell: (cell: { row: number; col: number }) => void;
  onChangeCell: (row: number, col: number, value: number) => void;
  xLabels: string[];
  yLabels: string[];
  decimals?: number;
  theme?: "default" | "light" | "oled";
}

const WORLD_WIDTH = 6;
const WORLD_DEPTH = 4;
const WORLD_HEIGHT = 3.6;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pointColor(t: number) {
  const h = 0.66 - t * 0.66;
  const s = 0.95;
  const l = 0.58;
  const hue2rgb = (p: number, q: number, tt: number) => {
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function MappingPoint({
  row,
  col,
  value,
  minValue,
  maxValue,
  selected,
  position,
  decimals,
  onSelect,
}: {
  row: number;
  col: number;
  value: number;
  minValue: number;
  maxValue: number;
  selected: boolean;
  position: [number, number, number];
  decimals: number;
  onSelect: (cell: { row: number; col: number }) => void;
  onStartDrag: (event: PointerEvent) => void;
}) {
  const t = maxValue === minValue ? 0.5 : (value - minValue) / (maxValue - minValue);
  return (
    <mesh
      position={position}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.nativeEvent.preventDefault();
        onSelect({ row, col });
        onStartDrag(event);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "grab";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <sphereGeometry args={[selected ? 0.105 : 0.075, selected ? 18 : 12, selected ? 18 : 12]} />
      <meshStandardMaterial
        color={pointColor(clamp(t, 0, 1))}
        emissive={selected ? "#ffffff" : pointColor(clamp(t, 0, 1))}
        emissiveIntensity={selected ? 0.7 : 0.18}
        roughness={0.35}
        metalness={0.15}
      />
      {selected && (
        <Html distanceFactor={9} position={[0, 0.18, 0]} center pointerEvents="none">
          <div className="rounded-md border border-violet-400/70 bg-black/75 px-2 py-1 text-[10px] font-mono text-white shadow-lg shadow-violet-500/20 whitespace-nowrap">
            {value.toFixed(decimals)}
          </div>
        </Html>
      )}
    </mesh>
  );
}

export function Map3DMappingEditor({
  values,
  minValue,
  maxValue,
  selectedCell,
  onSelectCell,
  onChangeCell,
  xLabels,
  yLabels,
  decimals = 2,
  theme = "default",
}: Map3DMappingEditorProps) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ row: number; col: number; startY: number; startValue: number } | null>(null);

  const effectiveMin = Number.isFinite(minValue) ? minValue : 0;
  const effectiveMax = Number.isFinite(maxValue) && maxValue > effectiveMin ? maxValue : effectiveMin + 1;
  const valueRange = effectiveMax - effectiveMin;

  const cells = useMemo(() => {
    const rows = values.length;
    const cols = values[0]?.length ?? 0;
    if (!rows || !cols) return [];
    return values.flatMap((row, r) =>
      row.map((value, c) => {
        const x = cols === 1 ? 0 : (c / (cols - 1) - 0.5) * WORLD_WIDTH;
        const y = rows === 1 ? 0 : (0.5 - r / (rows - 1)) * WORLD_DEPTH;
        const z = ((clamp(value, effectiveMin, effectiveMax) - effectiveMin) / valueRange) * WORLD_HEIGHT;
        return { row: r, col: c, value, position: [x, y, z] as [number, number, number] };
      }),
    );
  }, [values, effectiveMin, effectiveMax, valueRange]);

  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent) => {
      const active = dragRef.current;
      if (!active) return;
      const dy = event.clientY - active.startY;
      let sensitivity = valueRange / 240;
      if (event.shiftKey) sensitivity *= 2;
      if (event.ctrlKey || event.metaKey) sensitivity *= 0.25;
      const nextValue = clamp(active.startValue - dy * sensitivity, effectiveMin, effectiveMax);
      onChangeCell(active.row, active.col, nextValue);
    };

    const up = () => {
      dragRef.current = null;
      setDragging(false);
      document.body.style.cursor = "default";
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    document.body.style.cursor = "ns-resize";

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "default";
    };
  }, [dragging, effectiveMin, effectiveMax, onChangeCell, valueRange]);

  const selectedPoint = selectedCell
    ? cells.find((cell) => cell.row === selectedCell.row && cell.col === selectedCell.col)
    : null;

  const surfaceColor = theme === "light" ? "#eef2ff" : "#0f0b17";
  const gridColor = theme === "light" ? "#c4b5fd" : "#4c1d95";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ cursor: selectedPoint ? "default" : "default" }}
      title={selectedPoint ? "Glisse verticalement pour monter ou descendre le point sélectionné" : "Clique un point pour le sélectionner"}
    >
      <Canvas
        camera={{ position: [7.5, -8, 6.4], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, -4, 8]} intensity={1.5} />
        <pointLight position={[-4, 2, 4]} intensity={1.2} color="#a855f7" />

        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
            <planeGeometry args={[WORLD_WIDTH + 0.6, WORLD_DEPTH + 0.6]} />
            <meshBasicMaterial color={surfaceColor} transparent opacity={0.26} />
          </mesh>
          <Grid
            args={[WORLD_WIDTH, WORLD_DEPTH]}
            cellSize={Math.max(0.12, Math.min(0.55, WORLD_WIDTH / Math.max(values[0]?.length ?? 1, 1)))}
            sectionSize={1}
            cellThickness={0.45}
            sectionThickness={0.8}
            cellColor={gridColor}
            sectionColor="#7c3aed"
            fadeDistance={12}
            fadeStrength={1}
            infiniteGrid={false}
            position={[0, 0, 0]}
          />

          {selectedPoint && (
            <>
              <Line
                points={[
                  [selectedPoint.position[0], selectedPoint.position[1], 0],
                  selectedPoint.position,
                ]}
                color="#f0abfc"
                lineWidth={2.5}
              />
              <mesh position={[selectedPoint.position[0], selectedPoint.position[1], selectedPoint.position[2]]}>
                <sphereGeometry args={[0.15, 20, 20]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
              </mesh>
            </>
          )}

          {cells.map((cell) => (
            <MappingPoint
              key={`${cell.row}-${cell.col}`}
              row={cell.row}
              col={cell.col}
              value={cell.value}
              minValue={effectiveMin}
              maxValue={effectiveMax}
              selected={selectedCell?.row === cell.row && selectedCell?.col === cell.col}
              position={cell.position}
              decimals={decimals}
              onSelect={onSelectCell}
              onStartDrag={(event) => {
                if (event.button !== 0) return;
                const point = cells.find((candidate) => candidate.row === cell.row && candidate.col === cell.col);
                if (!point) return;
                event.preventDefault();
                dragRef.current = {
                  row: point.row,
                  col: point.col,
                  startY: event.clientY,
                  startValue: point.value,
                };
                setDragging(true);
              }}
            />
          ))}

          <axesHelper args={[2.3]} />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={3.2}
            maxDistance={18}
            target={[0, 0, WORLD_HEIGHT * 0.35]}
          />
        </group>
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-xl border border-violet-500/30 bg-black/55 px-3 py-2 text-[10px] text-white/75 backdrop-blur-md">
        <div className="font-semibold text-violet-300">MAPPING 3D</div>
        <div>Clique un point · glisse verticalement pour monter/descendre</div>
        <div className="opacity-55">Shift = x2 · Ctrl = précision fine</div>
        {selectedPoint && (
          <div className="mt-1 font-mono text-white">
            Cellule {selectedPoint.row + 1}:{selectedPoint.col + 1} · {selectedPoint.value.toFixed(decimals)}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-lg border border-white/10 bg-black/45 px-2.5 py-1.5 text-[9px] text-white/60 backdrop-blur-md">
        X: {xLabels[0] ?? "—"} → {xLabels[xLabels.length - 1] ?? "—"} · Y: {yLabels[0] ?? "—"} → {yLabels[yLabels.length - 1] ?? "—"}
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center">
          <div className="rounded-full border border-fuchsia-400/50 bg-fuchsia-950/60 px-3 py-1 text-[10px] font-semibold text-fuchsia-100 shadow-lg shadow-fuchsia-500/20">
            {selectedPoint ? `${selectedPoint.value.toFixed(decimals)} · glisser ↑ pour augmenter / ↓ pour diminuer` : "Édition"}
          </div>
        </div>
      )}
    </div>
  );
}
