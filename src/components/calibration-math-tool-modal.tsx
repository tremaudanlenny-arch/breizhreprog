"use client";

import { useMemo, useState } from "react";
import { Activity, Calculator, Copy, FileCog, X, Zap } from "lucide-react";

export type CalibrationMathTool =
  | "iq-duration"
  | "afr"
  | "injector-flow"
  | "injection-duration"
  | "ramp";

type ToolMap = {
  name: string;
  address: number;
};

type Snapshot = {
  mapValues: number[][];
  sourceMapValues?: number[][];
  sourceXAxisLabels?: string[];
  sourceYAxisLabels?: string[];
  xAxisLabels: string[];
  yAxisLabels: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  mapName: string;
};

type SelectionInfo = {
  mapName: string;
  mapAddress: number;
  selectedCount: number;
  selectedCells: Array<{ row: number; col: number; address: number; value: number }>;
} | null;

type Props = {
  theme: "default" | "light" | "oled";
  tool: CalibrationMathTool;
  durationMaps?: ToolMap[];
  mafMaps?: ToolMap[];
  snapshots?: Map<number, Snapshot>;
  selection?: SelectionInfo;
  onApplyRamp?: (mapAddress: number, changes: Record<string, number>) => void;
  onApplyChanges?: (mapAddress: number, changes: Record<string, number>) => void;
  onClose: () => void;
};

const num = (value: string) => Number(value.replace(",", "."));
const fmt = (value: number, digits = 3) =>
  Number.isFinite(value)
    ? value.toLocaleString("fr-FR", { maximumFractionDigits: digits })
    : "—";

const axisNumbers = (axis?: string[]) =>
  (axis || []).map((v) => Number.parseFloat(String(v)));

const axisKind = (label: string | undefined, values: number[]) => {
  const text = String(label || "").toLowerCase();
  if (text.includes("rpm") || text.includes("engine speed")) return "rpm";
  if (text.includes("iq") || text.includes("mg/st") || text.includes("mg/stroke")) return "iq";
  const finite = values.filter(Number.isFinite);
  if (finite.length >= 2) {
    const max = Math.max(...finite);
    const min = Math.min(...finite);
    if (max > 200 || min >= 250) return "rpm";
    if (max <= 200) return "iq";
  }
  return "other";
};

const bracket = (axis: number[], target: number) => {
  const finite = axis.every(Number.isFinite);
  if (!finite || axis.length < 1 || !Number.isFinite(target)) return null;
  if (axis.length === 1) return { i0: 0, i1: 0, t: 0 };
  const asc = axis[0] <= axis[axis.length - 1];
  const work = asc ? axis : [...axis].reverse();
  let j = 0;
  if (target <= work[0]) j = 0;
  else if (target >= work[work.length - 1]) j = work.length - 2;
  else {
    for (let i = 0; i < work.length - 1; i++) {
      if (target >= work[i] && target <= work[i + 1]) {
        j = i;
        break;
      }
    }
  }
  const a = work[j];
  const b = work[j + 1];
  const t = b === a ? 0 : (target - a) / (b - a);
  return asc
    ? { i0: j, i1: j + 1, t }
    : { i0: axis.length - 1 - j, i1: axis.length - 1 - (j + 1), t };
};

const sampleMap = (
  values: number[][],
  xAxis: number[],
  yAxis: number[],
  x: number,
  y: number,
  xKind: string,
  yKind: string,
) => {
  if (!values.length || !values[0]?.length) return NaN;
  const xTarget = xKind === "rpm" ? x : xKind === "iq" ? y : x;
  const yTarget = yKind === "rpm" ? x : yKind === "iq" ? y : y;
  const xb = bracket(xAxis, xTarget);
  const yb = bracket(yAxis, yTarget);
  if (!xb || !yb) return NaN;
  const q11 = values[yb.i0]?.[xb.i0];
  const q21 = values[yb.i0]?.[xb.i1];
  const q12 = values[yb.i1]?.[xb.i0];
  const q22 = values[yb.i1]?.[xb.i1];
  if (![q11, q21, q12, q22].every(Number.isFinite)) return NaN;
  const a = q11 + (q21 - q11) * xb.t;
  const b = q12 + (q22 - q12) * xb.t;
  return a + (b - a) * yb.t;
};



function Field({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] opacity-60">{label}</div>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className="w-full rounded-lg border bg-black/20 px-3 py-2 text-xs outline-none"
          style={{ borderColor: "rgba(168,85,247,.24)" }}
        />
        {unit && <span className="shrink-0 text-[10px] opacity-50">{unit}</span>}
      </div>
    </label>
  );
}

export function CalibrationMathToolModal({
  theme,
  tool,
  durationMaps = [],
  mafMaps = [],
  snapshots,
  selection,
  onApplyRamp,
  onApplyChanges,
  onClose,
}: Props) {
  const light = theme === "light";
  const text = light ? "#111827" : "#fff";
  const muted = light ? "rgba(17,24,39,.56)" : "rgba(255,255,255,.55)";
  const border = light ? "rgba(17,24,39,.12)" : "rgba(168,85,247,.22)";

  const [durationAddress, setDurationAddress] = useState(durationMaps[0]?.address ?? 0);
  const [mafAddress, setMafAddress] = useState(mafMaps[0]?.address ?? 0);
  const [iq, setIq] = useState("50");
  const [rpm, setRpm] = useState("3000");
  const [direction, setDirection] = useState<"iq-to-duration" | "duration-to-iq">("iq-to-duration");
  const [duration, setDuration] = useState("10");

  const [targetAfr, setTargetAfr] = useState("18");
  const [afrRpmFrom, setAfrRpmFrom] = useState("1500");
  const [afrRpmTo, setAfrRpmTo] = useState("4500");

  const [injectorFlow, setInjectorFlow] = useState("50");
  const [refPressure, setRefPressure] = useState("1000");
  const [targetPressure, setTargetPressure] = useState("1200");

  const [injectionDuration, setInjectionDuration] = useState("600");
  const [durationFlow, setDurationFlow] = useState("50");

  const [rampStart, setRampStart] = useState("100");
  const [rampEnd, setRampEnd] = useState("200");
  const [rampSteps, setRampSteps] = useState("11");
  const [rampMode, setRampMode] = useState<"linear" | "smooth">("linear");
  const [copied, setCopied] = useState("");

  const selectedDuration = snapshots?.get(durationAddress);
  const selectedMaf = snapshots?.get(mafAddress);

  const afrCalculation = useMemo(() => {
    if (!selectedDuration || !selectedMaf) return null;

    const durationValues = selectedDuration.sourceMapValues ?? selectedDuration.mapValues;
    const durationX = axisNumbers(selectedDuration.sourceXAxisLabels ?? selectedDuration.xAxisLabels);
    const durationY = axisNumbers(selectedDuration.sourceYAxisLabels ?? selectedDuration.yAxisLabels);
    const durationXKind = axisKind(selectedDuration.xAxisLabel, durationX);
    const durationYKind = axisKind(selectedDuration.yAxisLabel, durationY);

    const mafValues = selectedMaf.sourceMapValues ?? selectedMaf.mapValues;
    const mafX = axisNumbers(selectedMaf.sourceXAxisLabels ?? selectedMaf.xAxisLabels);
    const mafY = axisNumbers(selectedMaf.sourceYAxisLabels ?? selectedMaf.yAxisLabels);
    const mafXKind = axisKind(selectedMaf.xAxisLabel, mafX);
    const mafYKind = axisKind(selectedMaf.yAxisLabel, mafY);

    const from = num(afrRpmFrom);
    const to = num(afrRpmTo);
    const afrTarget = num(targetAfr);
    const changes: Record<string, number> = [];
    let factorSum = 0;
    let factorCount = 0;

    if (!(from <= to) || !(afrTarget > 0)) {
      return { changes: {}, count: 0, averageFactor: NaN, durationXKind, durationYKind, mafXKind, mafYKind };
    }

    const rows = durationValues.length;
    const cols = durationValues[0]?.length ?? 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellDuration = durationValues[row]?.[col];
        if (!Number.isFinite(cellDuration)) continue;

        const xValue = durationX[col];
        const yValue = durationY[row];
        const rpmValue =
          durationXKind === "rpm" ? xValue :
          durationYKind === "rpm" ? yValue : NaN;
        const iqValue =
          durationXKind === "iq" ? xValue :
          durationYKind === "iq" ? yValue : NaN;

        if (!Number.isFinite(rpmValue) || !Number.isFinite(iqValue)) continue;
        if (rpmValue < from || rpmValue > to || iqValue <= 0) continue;

        const airMass = sampleMap(mafValues, mafX, mafY, rpmValue, iqValue, mafXKind, mafYKind);
        if (!Number.isFinite(airMass) || airMass <= 0) continue;

        const targetIq = airMass / afrTarget;
        const factor = targetIq / iqValue;
        if (!Number.isFinite(factor) || factor <= 0) continue;

        const nextValue = cellDuration * factor;
        changes[row + "-" + col] = nextValue;
        factorSum += factor;
        factorCount++;
      }
    }

    return {
      changes,
      count: Object.keys(changes).length,
      averageFactor: factorCount ? factorSum / factorCount : NaN,
      durationXKind,
      durationYKind,
      mafXKind,
      mafYKind,
    };
  }, [selectedDuration, selectedMaf, afrRpmFrom, afrRpmTo, targetAfr]);


  const ramp = useMemo(() => {
    const start = num(rampStart);
    const end = num(rampEnd);
    const steps = Math.max(2, Math.round(num(rampSteps)));
    if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
    return Array.from({ length: steps }, (_, index) => {
      const t = index / (steps - 1);
      const shaped = rampMode === "smooth" ? t * t * (3 - 2 * t) : t;
      return start + (end - start) * shaped;
    });
  }, [rampStart, rampEnd, rampSteps, rampMode]);

  const applyAfr = () => {
    if (!selectedDuration || !onApplyChanges || !afrCalculation?.count) return;
    onApplyChanges(selectedDuration === undefined ? durationAddress : durationAddress, afrCalculation.changes);
  };

  const applyRamp = () => {
    if (!selection || !onApplyRamp || selection.selectedCells.length === 0 || ramp.length === 0) return;
    const ordered = [...selection.selectedCells].sort((a, b) => a.row - b.row || a.col - b.col);
    const changes: Record<string, number> = {};
    ordered.forEach((cell, index) => {
      const source = ramp[index % ramp.length];
      changes[cell.row + "-" + cell.col] = source;
    });
    onApplyRamp(selection.mapAddress, changes);
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {}
  };

  const titles: Record<CalibrationMathTool, string> = {
    "iq-duration": "IQ ↔ durée d'injection",
    afr: "Calculateur AFR",
    "injector-flow": "Débit injecteur",
    "injection-duration": "Durée d'injection",
    ramp: "Générateur de rampe",
  };

  const body = (() => {
    switch (tool) {
      case "iq-duration":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-[10px]" style={{ borderColor: border }}>
              <div className="flex items-center gap-2 font-semibold"><FileCog className="h-3.5 w-3.5 text-violet-400" /> Fichier courant en arrière-plan</div>
              <div className="mt-1" style={{ color: muted }}>{durationMaps.length} map(s) Duration détectée(s) · données live mises à jour automatiquement.</div>
            </div>
            <label className="block">
              <div className="mb-1 text-[11px] opacity-60">Map Duration</div>
              <select value={durationAddress} onChange={(e) => setDurationAddress(Number(e.target.value))} className="w-full rounded-lg border bg-black/20 px-3 py-2 text-xs outline-none" style={{ borderColor: border }}>
                {durationMaps.map((map) => <option key={map.address} value={map.address}>{map.name}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Régime" value={rpm} onChange={setRpm} unit="tr/min" />
              <label className="block">
                <div className="mb-1 text-[11px] opacity-60">Sens du calcul</div>
                <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} className="w-full rounded-lg border bg-black/20 px-3 py-2 text-xs" style={{ borderColor: border }}>
                  <option value="iq-to-duration">IQ → durée</option>
                  <option value="duration-to-iq">Durée → IQ</option>
                </select>
              </label>
            </div>
            {direction === "iq-to-duration"
              ? <Field label="IQ" value={iq} onChange={setIq} unit="mg/coup" />
              : <Field label="Durée" value={duration} onChange={setDuration} unit="unité map" />}
            <div className="rounded-lg border p-4" style={{ borderColor: border }}>
              <div className="text-[10px] opacity-50">{direction === "iq-to-duration" ? "Durée interpolée depuis la map" : "IQ interpolée depuis la map"}</div>
              <div className="mt-1 text-2xl font-black">{fmt(durationCalculation?.result ?? NaN, 3)} {direction === "iq-to-duration" ? "unité map" : "mg/coup"}</div>
              {durationCalculation && <div className="mt-2 text-[10px]" style={{ color: muted }}>Axes détectés : X={durationCalculation.xKind} · Y={durationCalculation.yKind}</div>}
            </div>
          </div>
        );

      case "afr":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-[10px]" style={{ borderColor: border }}>
              L'outil modifie directement la map <b>Duration</b> entre les RPM choisis, en utilisant la map <b>MAF</b> sélectionnée.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-[11px] opacity-60">Map Duration</div>
                <select value={durationAddress} onChange={(e) => setDurationAddress(Number(e.target.value))} className="w-full rounded-lg border bg-black/20 px-3 py-2 text-xs" style={{ borderColor: border }}>
                  {durationMaps.map((map) => <option key={map.address} value={map.address}>{map.name}</option>)}
                </select>
              </label>
              <label className="block">
                <div className="mb-1 text-[11px] opacity-60">Map MAF</div>
                <select value={mafAddress} onChange={(e) => setMafAddress(Number(e.target.value))} className="w-full rounded-lg border bg-black/20 px-3 py-2 text-xs" style={{ borderColor: border }}>
                  {mafMaps.map((map) => <option key={map.address} value={map.address}>{map.name}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="AFR cible" value={targetAfr} onChange={setTargetAfr} unit=":1" />
              <Field label="RPM début" value={afrRpmFrom} onChange={setAfrRpmFrom} unit="tr/min" />
              <Field label="RPM fin" value={afrRpmTo} onChange={setAfrRpmTo} unit="tr/min" />
            </div>

            <div className="rounded-lg border p-4" style={{ borderColor: border }}>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><div className="text-[10px] opacity-50">Cellules</div><div className="mt-1 text-xl font-black">{afrCalculation?.count ?? 0}</div></div>
                <div><div className="text-[10px] opacity-50">Facteur moyen</div><div className="mt-1 text-xl font-black">{fmt(afrCalculation?.averageFactor ?? NaN, 3)}×</div></div>
                <div><div className="text-[10px] opacity-50">AFR cible</div><div className="mt-1 text-xl font-black">{fmt(num(targetAfr), 2)}:1</div></div>
              </div>
            </div>

            <div className="text-[10px]" style={{ color: muted }}>
              Le calcul utilise MAF / IQ cible. La durée est ajustée proportionnellement à IQ cible / IQ actuel.
            </div>

            <button type="button" disabled={!afrCalculation?.count || !onApplyChanges} onClick={applyAfr} className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-3 text-xs font-black text-white disabled:opacity-35">
              Appliquer à la map Duration
            </button>
          </div>
        );

      case "injector-flow": {
        const q = num(injectorFlow);
        const p0 = num(refPressure);
        const p1 = num(targetPressure);
        const result = q * Math.sqrt(p1 / p0);
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Débit de référence" value={injectorFlow} onChange={setInjectorFlow} unit="mg/coup" />
              <Field label="Pression de référence" value={refPressure} onChange={setRefPressure} unit="bar" />
              <Field label="Pression cible" value={targetPressure} onChange={setTargetPressure} unit="bar" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: border }}>
              <div><div className="text-[10px] opacity-50">Débit estimé</div><div className="mt-1 text-xl font-black">{fmt(result, 2)} mg/coup</div></div>
              <button type="button" onClick={() => copy("injector", String(result))} className="rounded-lg border px-3 py-2 text-[10px] font-bold" style={{ borderColor: border }}><Copy className="mr-1 inline h-3.5 w-3.5" />{copied === "injector" ? "Copié" : "Copier"}</button>
            </div>
          </div>
        );
      }

      case "injection-duration": {
        const d = num(injectionDuration);
        const q = num(durationFlow);
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Durée" value={injectionDuration} onChange={setInjectionDuration} unit="µs" />
              <Field label="Débit" value={durationFlow} onChange={setDurationFlow} unit="mg/coup/ms" />
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: border }}>
              <div className="text-[10px] opacity-50">Quantité théorique</div>
              <div className="mt-1 text-2xl font-black">{fmt((d / 1000) * q, 3)} mg/coup</div>
            </div>
          </div>
        );
      }

      case "ramp":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-[10px]" style={{ borderColor: border }}>
              Sélection active : <b>{selection?.selectedCount ?? 0}</b> cellule(s) · {selection?.mapName || "aucune map"}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Départ" value={rampStart} onChange={setRampStart} />
              <Field label="Fin" value={rampEnd} onChange={setRampEnd} />
              <Field label="Nombre de points" value={rampSteps} onChange={setRampSteps} />
            </div>
            <div className="flex gap-2">
              <select value={rampMode} onChange={(e) => setRampMode(e.target.value as "linear" | "smooth")} className="flex-1 rounded-lg border bg-black/20 px-3 py-2 text-xs" style={{ borderColor: border }}>
                <option value="linear">Linéaire</option>
                <option value="smooth">Progressive</option>
              </select>
              <button type="button" onClick={() => copy("ramp", ramp.join(", "))} className="rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: border }}><Copy className="mr-1 inline h-3.5 w-3.5" />{copied === "ramp" ? "Copié" : "Copier"}</button>
            </div>
            <div className="max-h-48 overflow-auto rounded-lg border p-3 font-mono text-[11px]" style={{ borderColor: border }}>
              {ramp.map((value, index) => <div key={index} className="flex items-center justify-between border-b border-white/5 py-1 last:border-0"><span className="opacity-45">#{index + 1}</span><span>{value.toFixed(6)}</span></div>)}
            </div>
            <button type="button" disabled={!selection?.selectedCount || !onApplyRamp} onClick={applyRamp} className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-3 text-xs font-black text-white disabled:opacity-35">
              <Zap className="mr-2 inline h-4 w-4" />Appliquer à la sélection
            </button>
          </div>
        );
    }
  })();

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.76)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-2xl rounded-2xl border shadow-2xl" style={{ background: light ? "rgba(255,255,255,.98)" : "linear-gradient(145deg,rgba(18,11,30,.99),rgba(7,9,15,.995))", color: text, borderColor: border }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: border }}>
          <div className="flex items-center gap-2 font-black"><Calculator className="h-5 w-5 text-fuchsia-400" />{titles[tool]}</div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">{body}</div>
      </div>
    </div>
  );
}
