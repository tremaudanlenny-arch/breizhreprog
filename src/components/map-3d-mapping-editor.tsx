"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
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
  onStartDrag,
  onHover,
  onLeave,
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
  onStartDrag: (event: ThreeEvent<PointerEvent>, cell: { row: number; col: number }) => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const t = maxValue === minValue ? 0.5 : (value - minValue) / (maxValue - minValue);
  const color = pointColor(clamp(t, 0, 1));

  return (
    <group position={position}>
      {/* Gros volume de sélection, sans depth test : le point reste cliquable
          même quand la surface ou la grille passe devant à l'écran. */}
      <mesh
        renderOrder={1000}
        onPointerDownCapture={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.nativeEvent.preventDefault();
          onSelect({ row, col });
          onStartDrag(event, { row, col });
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover();
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onLeave();
        }}
      >
        <sphereGeometry args={[0.28, 18, 18]} />
        <meshBasicMaterial transparent opacity={0.01} depthTest={false} depthWrite={false} />
      </mesh>

      {/* Poignée visible : elle est volontairement plus grosse que l'ancienne
          bille pour qu'on puisse réellement "prendre" un point à la souris. */}
      <mesh renderOrder={1001}>
        <sphereGeometry args={[selected ? 0.14 : 0.105, selected ? 22 : 16, selected ? 22 : 16]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#ffffff" : color}
          emissiveIntensity={selected ? 1.2 : 0.3}
          roughness={0.3}
          metalness={0.1}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {selected && (
        <>
          <Line
            points={[
              [0, 0, -position[2]],
              [0, 0, 0],
            ]}
            color="#f0abfc"
            lineWidth={2.5}
          />
          <mesh position={[0, 0, 0.02]} renderOrder={1002}>
            <sphereGeometry args={[0.19, 20, 20]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.2} depthTest={false} depthWrite={false} />
          </mesh>
          <Html distanceFactor={9} position={[0, 0.23, 0]} center pointerEvents="none">
            <div className="rounded-md border border-violet-400/70 bg-black/80 px-2 py-1 text-[10px] font-mono text-white shadow-lg shadow-violet-500/20 whitespace-nowrap">
              {value.toFixed(decimals)}
            </div>
          </Html>
        </>
      )}
    </group>
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
  const [step, setStep] = useState(1);
  const [editText, setEditText] = useState("");
  const dragRef = useRef<{ row: number; col: number; startY: number; startValue: number } | null>(null);
  const draggingRef = useRef(false);
  const controlsRef = useRef<any>(null);
  const draggingRef = useRef(false);
  const controlsRef = useRef<any>(null);

  const effectiveMin = Number.isFinite(minValue) ? minValue : 0;
  const effectiveMax = Number.isFinite(maxValue) && maxValue > effectiveMin ? maxValue : effectiveMin + 1;
  const valueRange = Math.max(effectiveMax - effectiveMin, 1e-9);

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

  const endDrag = () => {
    dragRef.current = null;
    draggingRef.current = false;
    setDragging(false);
    if (controlsRef.current) controlsRef.current.enabled = true;
    document.body.style.cursor = "default";
  };

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

    const up = () => endDrag();
    const cancel = () => endDrag();

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });

    document.body.style.cursor = "ns-resize";
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      document.body.style.cursor = "default";
    };
  }, [dragging, effectiveMin, effectiveMax, onChangeCell, valueRange]);

  const startDrag = (event: ThreeEvent<PointerEvent>, cell: { row: number; col: number }) => {
    if (event.button !== 0) return;
    const point = cells.find((candidate) => candidate.row === cell.row && candidate.col === cell.col);
    if (!point) return;

    draggingRef.current = true;
    dragRef.current = {
      row: point.row,
      col: point.col,
      startY: event.clientY,
      startValue: point.value,
    };

    // Désactiver immédiatement OrbitControls via la ref, avant même que
    // React ait le temps de rerendre avec enabled={false}.
    if (controlsRef.current) controlsRef.current.enabled = false;
    setDragging(true);
    document.body.style.cursor = "ns-resize";
  };

  const selectedPoint = selectedCell
    ? cells.find((cell) => cell.row === selectedCell.row && cell.col === selectedCell.col)
    : null;

  useEffect(() => {
    if (selectedPoint) setEditText(String(Number(selectedPoint.value.toFixed(decimals))));
  }, [selectedPoint?.row, selectedPoint?.col, selectedPoint?.value, decimals]);

  const applyExactValue = () => {
    if (!selectedPoint) return;
    const parsed = Number(editText.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    onChangeCell(
      selectedPoint.row,
      selectedPoint.col,
      clamp(parsed, effectiveMin, effectiveMax),
    );
  };

  const adjustSelected = (delta: number) => {
    if (!selectedPoint) return;
    onChangeCell(
      selectedPoint.row,
      selectedPoint.col,
      clamp(selectedPoint.value + delta, effectiveMin, effectiveMax),
    );
  };

  const surfaceColor = theme === "light" ? "#eef2ff" : "#0f0b17";
  const gridColor = theme === "light" ? "#c4b5fd" : "#4c1d95";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ touchAction: "none" }}
      title={selectedPoint ? "Glisse verticalement sur une poignée pour modifier la valeur" : "Clique une poignée pour la sélectionner"}
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
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.02]} renderOrder={0}>
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
              onStartDrag={startDrag}
              onHover={() => {
                if (!draggingRef.current) document.body.style.cursor = "grab";
              }}
              onLeave={() => {
                if (!draggingRef.current) document.body.style.cursor = "default";
              }}
            />
          ))}

          <axesHelper args={[2.3]} />

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enabled={!dragging}
            enableDamping
            dampingFactor={0.08}
            minDistance={3.2}
            maxDistance={18}
            target={[0, 0, WORLD_HEIGHT * 0.35]}
          />
        </group>
      </Canvas>

      <div className="absolute left-3 top-3 z-20 w-[330px] rounded-xl border border-violet-500/30 bg-black/65 px-3 py-2 text-[10px] text-white/75 backdrop-blur-md">
        <div className="font-semibold text-violet-300">MAPPING 3D — ÉDITION</div>
        <div>Clique une poignée puis glisse ↑ / ↓ pour modifier la cellule.</div>
        <div className="opacity-55">Shift = x2 · Ctrl = précision fine · caméra bloquée pendant le drag</div>

        {selectedPoint && (
          <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="font-mono text-white mb-1">
              Cellule {selectedPoint.row + 1}:{selectedPoint.col + 1} · {selectedPoint.value.toFixed(decimals)}
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" className="rounded-md bg-white/10 px-2 py-1 font-bold hover:bg-white/20" onClick={() => adjustSelected(-step)}>−</button>
              <button type="button" className="rounded-md bg-white/10 px-2 py-1 font-bold hover:bg-white/20" onClick={() => adjustSelected(step)}>+</button>
              <span className="text-white/40 ml-1">pas</span>
              <input
                value={step}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(",", "."));
                  if (Number.isFinite(v) && v > 0) setStep(v);
                }}
                className="w-14 rounded-md border border-white/15 bg-black/30 px-1.5 py-1 text-center font-mono text-[10px] text-white outline-none"
                inputMode="decimal"
              />
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyExactValue();
                }}
                className="ml-auto w-24 rounded-md border border-violet-400/30 bg-black/30 px-1.5 py-1 text-right font-mono text-[10px] text-white outline-none"
                inputMode="decimal"
                aria-label="Valeur exacte"
              />
              <button type="button" className="rounded-md bg-violet-600/70 px-2 py-1 font-semibold text-white hover:bg-violet-500" onClick={applyExactValue}>OK</button>
            </div>
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
