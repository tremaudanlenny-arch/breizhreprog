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
  onChangeCells?: (changes: Array<{ row: number; col: number; value: number }>) => void;
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
  onToggleSelection,
  onStartDrag,
  onBrushMove,
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
  onToggleSelection: (cell: { row: number; col: number }, additive: boolean) => void;
  onStartDrag: (event: ThreeEvent<PointerEvent>, cell: { row: number; col: number }) => void;
  onBrushMove: (event: ThreeEvent<PointerEvent>, cell: { row: number; col: number }) => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const t = maxValue === minValue ? 0.5 : (value - minValue) / (maxValue - minValue);
  const color = pointColor(clamp(t, 0, 1));

  return (
    <group position={position}>
      {/* Gros volume de sélection, sans depth test : le point reste cliquable
          même quand la surface ou la grille passe devant à l'écran. */}
      {/* Surface de saisie dédiée : le sol et la grille ont leur raycast
          désactivé plus bas, donc seule cette poignée reçoit les clics. */}
      <mesh
        renderOrder={1000}
        onPointerDownCapture={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.nativeEvent.preventDefault();
          onSelect({ row, col });
          onToggleSelection({ row, col }, event.shiftKey);
          onStartDrag(event, { row, col });
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          onBrushMove(event, { row, col });
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover();
          onBrushMove(event, { row, col });
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onLeave();
        }}
      >
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.28 : 0.12}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* Poignée visible : assez grosse pour être attrapée sans viser au pixel. */}
      <mesh renderOrder={1001} raycast={() => null}>
        <sphereGeometry args={[selected ? 0.16 : 0.12, selected ? 24 : 18, selected ? 24 : 18]} />
        <meshBasicMaterial
          color={selected ? "#ffffff" : color}
          transparent={false}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {selected && (
        <>
          <Line
            raycast={() => null}
            points={[
              [0, 0, -position[2]],
              [0, 0, 0],
            ]}
            color="#f0abfc"
            lineWidth={2.5}
          />
          <mesh position={[0, 0, 0.02]} renderOrder={1002} raycast={() => null}>
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
  onChangeCells,
  xLabels,
  yLabels,
  decimals = 2,
  theme = "default",
}: Map3DMappingEditorProps) {
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(1);
  const [editText, setEditText] = useState("");
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [percentValue, setPercentValue] = useState(5);
  const historyRef = useRef<number[][][]>([]);
  const futureRef = useRef<number[][][]>([]);
  const dragRef = useRef<{ row: number; col: number; startY: number; startValue: number } | null>(null);
  const brushStartValuesRef = useRef<Map<string, number>>(new Map());
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
    brushStartValuesRef.current.clear();
    draggingRef.current = false;
    setDragging(false);
    if (controlsRef.current) controlsRef.current.enabled = true;
    document.body.style.cursor = "default";
  };

  const applyBrushValue = (cell: { row: number; col: number }, clientY: number, fast = false) => {
    const drag = dragRef.current;
    if (!drag || !draggingRef.current) return;
    const key = `${cell.row}-${cell.col}`;
    const point = cells.find((candidate) => candidate.row === cell.row && candidate.col === cell.col);
    if (!point) return;

    if (!brushStartValuesRef.current.has(key)) {
      brushStartValuesRef.current.set(key, point.value);
    }

    const startValue = brushStartValuesRef.current.get(key) ?? point.value;
    let sensitivity = valueRange / 220;
    if (fast) sensitivity *= 2;
    const dy = clientY - drag.startY;
    const nextValue = clamp(startValue - dy * sensitivity, effectiveMin, effectiveMax);
    onChangeCell(cell.row, cell.col, nextValue);
  };

  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent) => {
      const active = dragRef.current;
      if (!active) return;
      applyBrushValue({ row: active.row, col: active.col }, event.clientY, event.shiftKey);
    };

    const up = () => endDrag();
    const cancel = () => endDrag();

    window.addEventListener("pointermove", move, { capture: true, passive: false });
    window.addEventListener("pointerup", up, { capture: true, once: true });
    window.addEventListener("pointercancel", cancel, { capture: true, once: true });

    document.body.style.cursor = "ns-resize";
    return () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
      document.body.style.cursor = "default";
    };
  }, [dragging, effectiveMin, effectiveMax, onChangeCell, valueRange, cells]);

  const startDrag = (event: ThreeEvent<PointerEvent>, cell: { row: number; col: number }) => {
    if (event.button !== 0) return;
    const point = cells.find((candidate) => candidate.row === cell.row && candidate.col === cell.col);
    if (!point) return;

    draggingRef.current = true;
    brushStartValuesRef.current.clear();
    brushStartValuesRef.current.set(`${cell.row}-${cell.col}`, point.value);
    dragRef.current = {
      row: point.row,
      col: point.col,
      startY: event.clientY,
      startValue: point.value,
    };

    if (controlsRef.current) controlsRef.current.enabled = false;
    setDragging(true);
    document.body.style.cursor = "ns-resize";
  };

  const handleBrushMove = (event: ThreeEvent<PointerEvent>, cell: { row: number; col: number }) => {
    if (!draggingRef.current) return;
    event.stopPropagation();
    applyBrushValue(cell, event.clientY, event.shiftKey);
  };

  const selectedKey = selectedCell ? `${selectedCell.row}-${selectedCell.col}` : null;
  const effectiveSelection = useMemo(() => {
    const next = new Set(selectedCells);
    if (selectedKey) next.add(selectedKey);
    return Array.from(next)
      .map((key) => {
        const [row, col] = key.split("-").map(Number);
        return cells.find((cell) => cell.row === row && cell.col === col);
      })
      .filter(Boolean) as typeof cells;
  }, [cells, selectedCells, selectedKey]);

  const pushHistory = () => {
    historyRef.current = [...historyRef.current.slice(-30), values.map((row) => [...row])];
    futureRef.current = [];
  };

  const applyChanges = (changes: Array<{ row: number; col: number; value: number }>) => {
    if (!changes.length) return;
    pushHistory();
    if (onChangeCells) {
      onChangeCells(changes);
      return;
    }
    changes.forEach((change) => onChangeCell(change.row, change.col, change.value));
  };

  const restoreSnapshot = (snapshot: number[][]) => {
    const changes: Array<{ row: number; col: number; value: number }> = [];
    values.forEach((row, r) => {
      row.forEach((value, col) => {
        const target = snapshot[r]?.[col];
        if (Number.isFinite(target) && Math.abs(target - value) > 1e-9) {
          changes.push({ row: r, col, value: target });
        }
      });
    });
    if (!changes.length) return;
    if (onChangeCells) onChangeCells(changes);
    else changes.forEach((change) => onChangeCell(change.row, change.col, change.value));
  };

  const undo = () => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    futureRef.current = [...futureRef.current.slice(-30), values.map((row) => [...row])];
    restoreSnapshot(previous);
  };

  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current = [...historyRef.current.slice(-30), values.map((row) => [...row])];
    restoreSnapshot(next);
  };

  const applySelectionOperation = (
    operation: "add" | "subtract" | "percent" | "flatten" | "smooth" | "interpolate" | "slopeX" | "slopeY" | "mirrorX" | "mirrorY",
  ) => {
    if (!effectiveSelection.length) return;
    const next = values.map((row) => [...row]);

    if (operation === "flatten") {
      const avg = effectiveSelection.reduce((sum, point) => sum + point.value, 0) / effectiveSelection.length;
      effectiveSelection.forEach((point) => { next[point.row][point.col] = avg; });
    } else if (operation === "interpolate") {
      if (effectiveSelection.length < 2) return;
      const ordered = [...effectiveSelection].sort((a, b) => (a.row - b.row) || (a.col - b.col));
      const first = ordered[0].value;
      const last = ordered[ordered.length - 1].value;
      ordered.forEach((point, index) => {
        const t = ordered.length === 1 ? 0 : index / (ordered.length - 1);
        next[point.row][point.col] = first + (last - first) * t;
      });
    } else if (operation === "smooth") {
      effectiveSelection.forEach((point) => {
        let sum = 0;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = point.row + dr;
            const cc = point.col + dc;
            const value = values[rr]?.[cc];
            if (Number.isFinite(value)) { sum += value; count++; }
          }
        }
        if (count) next[point.row][point.col] = sum / count;
      });
    } else if (operation === "slopeX" || operation === "slopeY") {
      const grouped = new Map<number, typeof effectiveSelection>();
      effectiveSelection.forEach((point) => {
        const key = operation === "slopeX" ? point.row : point.col;
        const group = grouped.get(key) ?? [];
        group.push(point);
        grouped.set(key, group);
      });
      grouped.forEach((group) => {
        const ordered = [...group].sort((a, b) => operation === "slopeX" ? a.col - b.col : a.row - b.row);
        if (ordered.length < 2) return;
        const first = ordered[0].value;
        const last = ordered[ordered.length - 1].value;
        ordered.forEach((point, index) => {
          const t = index / (ordered.length - 1);
          next[point.row][point.col] = first + (last - first) * t;
        });
      });
    } else if (operation === "mirrorX" || operation === "mirrorY") {
      const keys = new Set(effectiveSelection.map((point) => `${point.row}-${point.col}`));
      effectiveSelection.forEach((point) => {
        const targetRow = operation === "mirrorY"
          ? Math.min(...effectiveSelection.filter((p) => p.col === point.col).map((p) => p.row))
            + Math.max(...effectiveSelection.filter((p) => p.col === point.col).map((p) => p.row))
            - point.row
          : point.row;
        const targetCol = operation === "mirrorX"
          ? Math.min(...effectiveSelection.filter((p) => p.row === point.row).map((p) => p.col))
            + Math.max(...effectiveSelection.filter((p) => p.row === point.row).map((p) => p.col))
            - point.col
          : point.col;
        if (keys.has(`${targetRow}-${targetCol}`)) next[point.row][point.col] = values[targetRow]?.[targetCol] ?? point.value;
      });
    } else {
      effectiveSelection.forEach((point) => {
        const delta = operation === "add" ? step : operation === "subtract" ? -step : 0;
        const multiplier = operation === "percent" ? 1 + percentValue / 100 : 1;
        next[point.row][point.col] = clamp(
          (point.value + delta) * multiplier,
          effectiveMin,
          effectiveMax,
        );
      });
    }

    const changes: Array<{ row: number; col: number; value: number }> = [];
    effectiveSelection.forEach((point) => {
      const value = clamp(next[point.row][point.col], effectiveMin, effectiveMax);
      if (Math.abs(value - values[point.row][point.col]) > 1e-9) {
        changes.push({ row: point.row, col: point.col, value });
      }
    });
    applyChanges(changes);
  };

  const selectedPoint = selectedCell
    ? cells.find((cell) => cell.row === selectedCell.row && cell.col === selectedCell.col)
    : null;

  useEffect(() => {
    if (selectedPoint) setEditText(String(Number(selectedPoint.value.toFixed(decimals))));
  }, [selectedPoint?.row, selectedPoint?.col, selectedPoint?.value, decimals]);

  useEffect(() => {
    setSelectedCells((previous) => {
      const valid = new Set<string>();
      previous.forEach((key) => {
        const [row, col] = key.split("-").map(Number);
        if (values[row]?.[col] !== undefined) valid.add(key);
      });
      return valid.size === previous.size ? previous : valid;
    });
  }, [values]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const applyExactValue = () => {
    if (!selectedPoint) return;
    const parsed = Number(editText.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    applyChanges([{
      row: selectedPoint.row,
      col: selectedPoint.col,
      value: clamp(parsed, effectiveMin, effectiveMax),
    }]);
  };

  const adjustSelected = (delta: number) => {
    if (!selectedPoint) return;
    applyChanges([{
      row: selectedPoint.row,
      col: selectedPoint.col,
      value: clamp(selectedPoint.value + delta, effectiveMin, effectiveMax),
    }]);
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
          <mesh
            raycast={() => null}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, -0.02]}
            renderOrder={0}
          >
            <planeGeometry args={[WORLD_WIDTH + 0.6, WORLD_DEPTH + 0.6]} />
            <meshBasicMaterial color={surfaceColor} transparent opacity={0.26} />
          </mesh>

          <Grid
            raycast={() => null}
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
              onToggleSelection={(cell, additive) => {
                setSelectedCells((previous) => {
                  const next = new Set(additive ? previous : []);
                  const key = `${cell.row}-${cell.col}`;
                  if (additive && next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                });
              }}
              onStartDrag={startDrag}
              onBrushMove={handleBrushMove}
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
        <div>Un point par case · clique = sélectionner · glisse ↑ / ↓</div>
        <div className="opacity-55">Traverse les points pendant le drag pour dessiner · Shift = plus rapide · Ctrl+Z / Ctrl+Y</div>

        {selectedPoint && (
          <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="font-mono text-white mb-1">
              Cellule {selectedPoint.row + 1}:{selectedPoint.col + 1} · {selectedPoint.value.toFixed(decimals)}
              {effectiveSelection.length > 1 ? ` · ${effectiveSelection.length} sélectionnées` : ""}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" className="rounded-md bg-white/10 px-2 py-1 font-bold hover:bg-white/20" onClick={() => applySelectionOperation("subtract")}>−</button>
              <button type="button" className="rounded-md bg-white/10 px-2 py-1 font-bold hover:bg-white/20" onClick={() => applySelectionOperation("add")}>+</button>
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
                onKeyDown={(e) => { if (e.key === "Enter") applyExactValue(); }}
                className="w-20 rounded-md border border-violet-400/30 bg-black/30 px-1.5 py-1 text-right font-mono text-[10px] text-white outline-none"
                inputMode="decimal"
                aria-label="Valeur exacte"
              />
              <button type="button" className="rounded-md bg-violet-600/70 px-2 py-1 font-semibold text-white hover:bg-violet-500" onClick={applyExactValue}>OK</button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              <button type="button" className="rounded-md bg-cyan-500/15 px-2 py-1 text-[9px] text-cyan-200 hover:bg-cyan-500/25" onClick={() => applySelectionOperation("percent")}>% {percentValue}</button>
              <input
                value={percentValue}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(",", "."));
                  if (Number.isFinite(v)) setPercentValue(v);
                }}
                className="w-14 rounded-md border border-white/15 bg-black/30 px-1.5 py-1 text-center font-mono text-[9px] text-white outline-none"
                inputMode="decimal"
                aria-label="Pourcentage"
              />
              <button type="button" className="rounded-md bg-violet-500/15 px-2 py-1 text-[9px] text-violet-200 hover:bg-violet-500/25" onClick={() => applySelectionOperation("smooth")}>Smooth</button>
              <button type="button" className="rounded-md bg-violet-500/15 px-2 py-1 text-[9px] text-violet-200 hover:bg-violet-500/25" onClick={() => applySelectionOperation("interpolate")}>Interpolate</button>
              <button type="button" className="rounded-md bg-violet-500/15 px-2 py-1 text-[9px] text-violet-200 hover:bg-violet-500/25" onClick={() => applySelectionOperation("flatten")}>Flatten</button>
            </div>

            <div className="mt-1 flex flex-wrap gap-1">
              <button type="button" className="rounded-md bg-fuchsia-500/15 px-2 py-1 text-[9px] text-fuchsia-200 hover:bg-fuchsia-500/25" onClick={() => applySelectionOperation("slopeX")}>Pente X</button>
              <button type="button" className="rounded-md bg-fuchsia-500/15 px-2 py-1 text-[9px] text-fuchsia-200 hover:bg-fuchsia-500/25" onClick={() => applySelectionOperation("slopeY")}>Pente Y</button>
              <button type="button" className="rounded-md bg-amber-500/15 px-2 py-1 text-[9px] text-amber-200 hover:bg-amber-500/25" onClick={() => applySelectionOperation("mirrorX")}>Miroir X</button>
              <button type="button" className="rounded-md bg-amber-500/15 px-2 py-1 text-[9px] text-amber-200 hover:bg-amber-500/25" onClick={() => applySelectionOperation("mirrorY")}>Miroir Y</button>
            </div>

            <div className="mt-1 flex gap-1">
              <button type="button" disabled={!historyRef.current.length} className="rounded-md bg-white/10 px-2 py-1 text-[9px] disabled:opacity-30" onClick={undo}>↶ Undo</button>
              <button type="button" disabled={!futureRef.current.length} className="rounded-md bg-white/10 px-2 py-1 text-[9px] disabled:opacity-30" onClick={redo}>↷ Redo</button>
            </div>
          </div>
        )      </div>

      <div className="absolute left-3 bottom-3 z-20 rounded-lg border border-white/10 bg-black/45 px-2.5 py-1.5 text-[9px] text-white/60 backdrop-blur-md">
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
