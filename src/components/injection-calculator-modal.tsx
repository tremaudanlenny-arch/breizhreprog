"use client";

import { useMemo, useState } from "react";
import { Calculator, X, Zap } from "lucide-react";

export interface InjectionMapDefinition {
  name: string;
  address: number;
}

export interface InjectionMapSnapshot {
  mapValues: number[][];
  xAxisLabels: string[];
  yAxisLabels: string[];
  xAxisLabel: string;
  yAxisLabel: string;
  mapName: string;
}

export interface InjectionApplyResult {
  changes: Map<number, Record<string, number>>;
  axisChanges: Map<number, { x?: string[]; y?: string[] }>;
}

interface Props {
  theme: "default" | "light" | "oled";
  durationMaps: InjectionMapDefinition[];
  soiMaps: InjectionMapDefinition[];
  snapshots: Map<number, InjectionMapSnapshot>;
  onApply: (result: InjectionApplyResult) => void;
  onClose: () => void;
}

type AxisMode = "x" | "y";
type Direction = "duration-to-soi" | "soi-to-duration";

const parseAxis = (labels: string[]) =>
  labels.map((label) => Number(String(label).replace(",", ".")));

function nearestOrBracket(values: number[], target: number) {
  const valid = values.map((value, index) => ({ value, index })).filter((x) => Number.isFinite(x.value));
  if (!valid.length) return { index: 0, lower: 0, upper: 0, t: 0, exact: false };

  let best = valid[0];
  for (const item of valid) {
    if (Math.abs(item.value - target) < Math.abs(best.value - target)) best = item;
  }

  const ascending = valid[0].value <= valid[valid.length - 1].value;
  for (let i = 0; i < values.length - 1; i++) {
    const a = values[i];
    const b = values[i + 1];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (target >= lo && target <= hi) {
      const t = a === b ? 0 : (target - a) / (b - a);
      return {
        index: Math.abs(target - a) <= Math.abs(target - b) ? i : i + 1,
        lower: i,
        upper: i + 1,
        t,
        exact: target === a || target === b,
      };
    }
  }

  // The axis can be descending; the nearest point is still the safe write target.
  return { index: best.index, lower: best.index, upper: best.index, t: 0, exact: false, ascending };
}

function interpolateRow(row: number[], info: { lower: number; upper: number; t: number }) {
  const a = row[info.lower];
  const b = row[info.upper];
  if (Number.isFinite(a) && Number.isFinite(b)) return a + (b - a) * info.t;
  return Number.isFinite(a) ? a : b;
}

function interpolateColumn(values: number[][], col: number, info: { lower: number; upper: number; t: number }) {
  const a = values[info.lower]?.[col];
  const b = values[info.upper]?.[col];
  if (Number.isFinite(a) && Number.isFinite(b)) return a + (b - a) * info.t;
  return Number.isFinite(a) ? a : b;
}

function resampleIndex(index: number, targetCount: number, sourceCount: number) {
  if (targetCount <= 1 || sourceCount <= 1) return 0;
  return Math.max(0, Math.min(sourceCount - 1, Math.round((index / (targetCount - 1)) * (sourceCount - 1))));
}

function replaceAxisValue(labels: string[], target: number) {
  if (!labels.length) return labels;
  const values = parseAxis(labels);
  const info = nearestOrBracket(values, target);
  const next = [...labels];
  next[info.index] = String(Number(target.toFixed(2)));

  // Refuse a replacement that would invert an otherwise monotonic axis.
  const nums = parseAxis(next);
  let direction = 0;
  for (let i = 1; i < nums.length; i++) {
    if (!Number.isFinite(nums[i - 1]) || !Number.isFinite(nums[i])) continue;
    const d = Math.sign(nums[i] - nums[i - 1]);
    if (!d) continue;
    if (!direction) direction = d;
    if (d !== direction) return labels;
  }
  return next;
}

export function InjectionCalculatorModal({
  theme,
  durationMaps,
  soiMaps,
  snapshots,
  onApply,
  onClose,
}: Props) {
  const isLight = theme === "light";
  const surface = isLight ? "rgba(255,255,255,.97)" : "linear-gradient(145deg, rgba(19,11,31,.98), rgba(8,10,17,.99))";
  const text = isLight ? "#111827" : "#fff";
  const muted = isLight ? "rgba(17,24,39,.55)" : "rgba(255,255,255,.55)";
  const border = isLight ? "rgba(15,20,35,.12)" : "rgba(168,85,247,.25)";

  const [targetIqText, setTargetIqText] = useState("85");
  const [targetAtdcText, setTargetAtdcText] = useState("9");
  const [axisMode, setAxisMode] = useState<AxisMode>("x");
  const [direction, setDirection] = useState<Direction>("duration-to-soi");
  const [adjustAxis, setAdjustAxis] = useState(true);
  const [durationAddress, setDurationAddress] = useState(durationMaps[0]?.address ?? 0);
  const [soiAddress, setSoiAddress] = useState(soiMaps[0]?.address ?? 0);

  const targetIq = Number(targetIqText.replace(",", "."));
  const targetAtdc = Number(targetAtdcText.replace(",", "."));

  const durationSnapshot = snapshots.get(durationAddress);
  const soiSnapshot = snapshots.get(soiAddress);

  const calculation = useMemo(() => {
    if (!durationSnapshot || !soiSnapshot || !Number.isFinite(targetIq) || !Number.isFinite(targetAtdc)) return null;

    const source = direction === "duration-to-soi" ? durationSnapshot : soiSnapshot;
    const target = direction === "duration-to-soi" ? soiSnapshot : durationSnapshot;

    const sourceAxis = axisMode === "x" ? parseAxis(source.xAxisLabels) : parseAxis(source.yAxisLabels);
    const targetAxis = axisMode === "x" ? parseAxis(target.xAxisLabels) : parseAxis(target.yAxisLabels);
    const sourceInfo = nearestOrBracket(sourceAxis, targetIq);
    const targetInfo = nearestOrBracket(targetAxis, targetIq);

    const sourceOtherCount = axisMode === "x"
      ? source.mapValues.length
      : source.mapValues[0]?.length ?? 0;
    const targetOtherCount = axisMode === "x"
      ? target.mapValues.length
      : target.mapValues[0]?.length ?? 0;

    const sourceValues: number[] = [];
    for (let i = 0; i < sourceOtherCount; i++) {
      const sourceIndex = i;
      if (axisMode === "x") {
        const row = source.mapValues[sourceIndex] || [];
        sourceValues.push(interpolateRow(row, sourceInfo));
      } else {
        sourceValues.push(interpolateColumn(source.mapValues, sourceIndex, sourceInfo));
      }
    }

    const targetValues = sourceValues.map((value, i) => {
      const transformed = direction === "duration-to-soi"
        ? value - targetAtdc
        : value + targetAtdc;
      return Number(transformed.toFixed(2));
    });

    const mappedTargetValues = targetValues.slice(0, targetOtherCount).map((_, targetIndex) => {
      const sourceIndex = resampleIndex(targetIndex, targetOtherCount, sourceValues.length);
      return Number(targetValues[sourceIndex].toFixed(2));
    });

    const nextAxis = adjustAxis
      ? (axisMode === "x"
        ? replaceAxisValue(target.xAxisLabels, targetIq)
        : replaceAxisValue(target.yAxisLabels, targetIq))
      : (axisMode === "x" ? target.xAxisLabels : target.yAxisLabels);

    const sourceAxisChanged = adjustAxis
      ? (axisMode === "x"
        ? replaceAxisValue(source.xAxisLabels, targetIq)
        : replaceAxisValue(source.yAxisLabels, targetIq))
      : (axisMode === "x" ? source.xAxisLabels : source.yAxisLabels);

    return {
      source,
      target,
      sourceInfo,
      targetInfo,
      mappedTargetValues,
      targetColumnOrRow: targetInfo.index,
      targetAxisLabels: nextAxis,
      sourceAxisLabels: sourceAxisChanged,
      sourceAxis,
      targetAxis,
    };
  }, [
    adjustAxis,
    axisMode,
    direction,
    durationSnapshot,
    soiSnapshot,
    targetAtdc,
    targetIq,
  ]);

  const targetMapReady = !!calculation && calculation.mappedTargetValues.length > 0;

  const apply = () => {
    if (!calculation || !targetMapReady) return;

    const changes = new Map<number, Record<string, number>>();
    const axisChanges = new Map<number, { x?: string[]; y?: string[] }>();

    const target = calculation.target;
    const targetAxisIndex = calculation.targetColumnOrRow;
    const cellChanges: Record<string, number> = {};

    if (axisMode === "x") {
      for (let row = 0; row < target.mapValues.length; row++) {
        const value = calculation.mappedTargetValues[row] ?? calculation.mappedTargetValues[calculation.mappedTargetValues.length - 1];
        if (!Number.isFinite(value)) continue;
        cellChanges[`${row}-${targetAxisIndex}`] = value;
      }
    } else {
      const cols = target.mapValues[0]?.length ?? 0;
      for (let col = 0; col < cols; col++) {
        const value = calculation.mappedTargetValues[col] ?? calculation.mappedTargetValues[calculation.mappedTargetValues.length - 1];
        if (!Number.isFinite(value)) continue;
        cellChanges[`${targetAxisIndex}-${col}`] = value;
      }
    }

    changes.set(targetAddress(), cellChanges);

    if (adjustAxis) {
      const sourceAddress = direction === "duration-to-soi" ? durationAddress : soiAddress;
      const targetAddressValue = direction === "duration-to-soi" ? soiAddress : durationAddress;
      if (axisMode === "x") {
        axisChanges.set(sourceAddress, { x: calculation.sourceAxisLabels });
        axisChanges.set(targetAddressValue, { x: calculation.targetAxisLabels });
      } else {
        axisChanges.set(sourceAddress, { y: calculation.sourceAxisLabels });
        axisChanges.set(targetAddressValue, { y: calculation.targetAxisLabels });
      }
    }

    onApply({ changes, axisChanges });
  };

  const targetAddress = () => (direction === "duration-to-soi" ? soiAddress : durationAddress);

  const selectedSourceName = direction === "duration-to-soi"
    ? durationSnapshot?.mapName || durationMaps.find((m) => m.address === durationAddress)?.name || "Duration"
    : soiSnapshot?.mapName || soiMaps.find((m) => m.address === soiAddress)?.name || "SOI";
  const selectedTargetName = direction === "duration-to-soi"
    ? soiSnapshot?.mapName || soiMaps.find((m) => m.address === soiAddress)?.name || "SOI"
    : durationSnapshot?.mapName || durationMaps.find((m) => m.address === durationAddress)?.name || "Duration";

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" style={{ background: "radial-gradient(circle at center, rgba(124,58,237,.18), rgba(0,0,0,.72))", backdropFilter: "blur(9px)" }}>
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl border shadow-2xl"
        style={{ background: surface, color: text, borderColor: border, boxShadow: "0 0 34px rgba(139,92,246,.18), 0 28px 100px rgba(0,0,0,.75)" }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: border }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-500/25">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-black tracking-wide">Calculateur Injection</div>
              <div className="text-[11px]" style={{ color: muted }}>IQ cible → Duration / SOI avec ATDC cible</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[calc(92vh-76px)] overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="rounded-xl border p-3" style={{ borderColor: border }}>
              <div className="mb-1 text-[11px]" style={{ color: muted }}>Quantité cible</div>
              <div className="flex items-center gap-2">
                <input value={targetIqText} onChange={(e) => setTargetIqText(e.target.value)} className="w-full rounded-lg border bg-black/20 px-3 py-2 text-sm outline-none" style={{ borderColor: border }} inputMode="decimal" />
                <span className="text-xs opacity-60">mg/cp</span>
              </div>
            </label>
            <label className="rounded-xl border p-3" style={{ borderColor: border }}>
              <div className="mb-1 text-[11px]" style={{ color: muted }}>ATDC cible</div>
              <div className="flex items-center gap-2">
                <input value={targetAtdcText} onChange={(e) => setTargetAtdcText(e.target.value)} className="w-full rounded-lg border bg-black/20 px-3 py-2 text-sm outline-none" style={{ borderColor: border }} inputMode="decimal" />
                <span className="text-xs opacity-60">°</span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="rounded-xl border p-3" style={{ borderColor: border }}>
              <div className="mb-1 text-[11px]" style={{ color: muted }}>Source Duration</div>
              <select value={durationAddress} onChange={(e) => setDurationAddress(Number(e.target.value))} className="w-full rounded-lg border bg-black/20 px-3 py-2 text-sm" style={{ borderColor: border }}>
                {durationMaps.map((map) => <option key={map.address} value={map.address}>{map.name}</option>)}
              </select>
            </label>
            <label className="rounded-xl border p-3" style={{ borderColor: border }}>
              <div className="mb-1 text-[11px]" style={{ color: muted }}>Source / cible SOI</div>
              <select value={soiAddress} onChange={(e) => setSoiAddress(Number(e.target.value))} className="w-full rounded-lg border bg-black/20 px-3 py-2 text-sm" style={{ borderColor: border }}>
                {soiMaps.map((map) => <option key={map.address} value={map.address}>{map.name}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="rounded-xl border p-3" style={{ borderColor: border }}>
              <div className="mb-1 text-[11px]" style={{ color: muted }}>Axe quantité</div>
              <select value={axisMode} onChange={(e) => setAxisMode(e.target.value as AxisMode)} className="w-full rounded-lg border bg-black/20 px-3 py-2 text-sm" style={{ borderColor: border }}>
                <option value="x">Axe X</option>
                <option value="y">Axe Y</option>
              </select>
            </label>
            <label className="rounded-xl border p-3" style={{ borderColor: border }}>
              <div className="mb-1 text-[11px]" style={{ color: muted }}>Calcul</div>
              <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className="w-full rounded-lg border bg-black/20 px-3 py-2 text-sm" style={{ borderColor: border }}>
                <option value="duration-to-soi">Duration → SOI</option>
                <option value="soi-to-duration">SOI → Duration</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer" style={{ borderColor: border }}>
              <input type="checkbox" checked={adjustAxis} onChange={(e) => setAdjustAxis(e.target.checked)} />
              <span className="text-xs">Ajuster l'axe à {Number.isFinite(targetIq) ? targetIq : "—"} mg</span>
            </label>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: border }}>
            {!durationSnapshot || !soiSnapshot ? (
              <div className="text-sm text-amber-300">Ouvre au moins une fois les maps Duration et SOI pour que l'outil récupère leurs valeurs et leurs axes.</div>
            ) : !calculation ? (
              <div className="text-sm text-red-300">Impossible de calculer : vérifie la quantité et l'ATDC.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div><div className="opacity-50">Source</div><div className="font-semibold">{selectedSourceName}</div></div>
                  <div><div className="opacity-50">Cible</div><div className="font-semibold">{selectedTargetName}</div></div>
                  <div><div className="opacity-50">Col/ligne quantité</div><div className="font-mono font-semibold">{calculation.targetColumnOrRow + 1}</div></div>
                </div>
                <div className="mt-4 overflow-auto rounded-lg border" style={{ borderColor: border }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: border }}>
                        <th className="px-3 py-2 text-left">Position</th>
                        <th className="px-3 py-2 text-right">Valeur source</th>
                        <th className="px-3 py-2 text-right">Valeur cible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculation.mappedTargetValues.slice(0, 12).map((value, index) => {
                        const sourceIndex = resampleIndex(index, calculation.mappedTargetValues.length, calculation.mappedTargetValues.length);
                        const sourceValue = direction === "duration-to-soi"
                          ? value + targetAtdc
                          : value - targetAtdc;
                        return (
                          <tr key={index} className="border-b border-white/5 last:border-0">
                            <td className="px-3 py-1.5 font-mono">{index + 1}</td>
                            <td className="px-3 py-1.5 text-right">{sourceValue.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-fuchsia-300">{value.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 rounded-lg bg-violet-500/10 px-3 py-2 text-[11px]" style={{ color: muted }}>
                  Formule utilisée : ATDC = TI − SOI. La valeur cible est écrite uniquement sur la ligne/colonne correspondant à {Number.isFinite(targetIq) ? targetIq : "la cible"} mg, puis les autres lignes sont interpolées sur la dimension restante.
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={apply}
            disabled={!targetMapReady}
            className="w-full rounded-xl px-4 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-35 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 hover:brightness-110"
          >
            <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" />Appliquer au projet</span>
          </button>
        </div>
      </div>
    </div>
  );
}
