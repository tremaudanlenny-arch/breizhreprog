"use client";

import { useMemo, useState } from "react";
import { Activity, Calculator, Copy, Gauge, X, Zap } from "lucide-react";

export type CalibrationMathTool =
  | "rpm"
  | "iq-duration"
  | "afr"
  | "injector-flow"
  | "injection-duration"
  | "ramp";

type Props = {
  theme: "default" | "light" | "oled";
  tool: CalibrationMathTool;
  onClose: () => void;
};

const num = (value: string) => Number(value.replace(",", "."));
const fmt = (value: number, digits = 3) =>
  Number.isFinite(value)
    ? value.toLocaleString("fr-FR", { maximumFractionDigits: digits })
    : "—";

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

export function CalibrationMathToolModal({ theme, tool, onClose }: Props) {
  const light = theme === "light";
  const text = light ? "#111827" : "#fff";
  const muted = light ? "rgba(17,24,39,.56)" : "rgba(255,255,255,.55)";
  const border = light ? "rgba(17,24,39,.12)" : "rgba(168,85,247,.22)";

  const [rpm, setRpm] = useState("3000");
  const [degrees, setDegrees] = useState("1");

  const [iq, setIq] = useState("50");
  const [fuelDensity, setFuelDensity] = useState("0.832");
  const [flow, setFlow] = useState("100");

  const [afr, setAfr] = useState("14.7");

  const [injectorFlow, setInjectorFlow] = useState("550");
  const [refPressure, setRefPressure] = useState("3");
  const [targetPressure, setTargetPressure] = useState("4");

  const [duration, setDuration] = useState("0.601");

  const [rampStart, setRampStart] = useState("100");
  const [rampEnd, setRampEnd] = useState("200");
  const [rampSteps, setRampSteps] = useState("11");
  const [rampMode, setRampMode] = useState<"linear" | "smooth">("linear");

  const [copied, setCopied] = useState("");

  const rpmResult = useMemo(() => {
    const r = num(rpm);
    const d = num(degrees);
    if (!(r > 0) || !(d >= 0)) return null;
    const oneDegreeUs = 60000000 / (r * 360);
    return {
      oneDegreeUs,
      angleUs: oneDegreeUs * d,
      frequencyHz: r / 60,
      cycleMs: 60000 / r,
    };
  }, [rpm, degrees]);

  const iqResult = useMemo(() => {
    const q = num(iq);
    const density = num(fuelDensity);
    const qFlow = num(flow);
    if (!(q >= 0) || !(density > 0) || !(qFlow > 0)) return null;
    const volumeMm3 = q / density;
    const durationMs = volumeMm3 / qFlow;
    return { volumeMm3, durationMs, durationUs: durationMs * 1000 };
  }, [iq, fuelDensity, flow]);

  const injectorResult = useMemo(() => {
    const qRef = num(injectorFlow);
    const pRef = num(refPressure);
    const pTarget = num(targetPressure);
    if (!(qRef > 0) || !(pRef > 0) || !(pTarget > 0)) return null;
    return qRef * Math.sqrt(pTarget / pRef);
  }, [injectorFlow, refPressure, targetPressure]);

  const durationResult = useMemo(() => {
    const d = num(duration);
    const q = num(flow);
    if (!(d >= 0) || !(q > 0)) return null;
    return d * q;
  }, [duration, flow]);

  const afrResult = Number(afr.replace(",", "."));

  const ramp = useMemo(() => {
    const start = num(rampStart);
    const end = num(rampEnd);
    const steps = Math.max(2, Math.round(num(rampSteps)));
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(steps)) return [];
    return Array.from({ length: steps }, (_, index) => {
      const t = index / (steps - 1);
      const shaped = rampMode === "smooth" ? t * t * (3 - 2 * t) : t;
      return start + (end - start) * shaped;
    });
  }, [rampStart, rampEnd, rampSteps, rampMode]);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {}
  };

  const titles: Record<CalibrationMathTool, string> = {
    rpm: "Convertisseur RPM",
    "iq-duration": "IQ → durée d'injection",
    afr: "Calculateur AFR",
    "injector-flow": "Débit injecteur",
    "injection-duration": "Durée d'injection",
    ramp: "Générateur de rampe",
  };

  const renderBody = () => {
    switch (tool) {
      case "rpm":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Régime" value={rpm} onChange={setRpm} unit="tr/min" />
              <Field label="Angle" value={degrees} onChange={setDegrees} unit="°" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border p-3" style={{ borderColor: border }}>
                <div className="opacity-50">1° vilebrequin</div>
                <div className="mt-1 text-lg font-black">{fmt(rpmResult?.oneDegreeUs ?? NaN, 2)} µs</div>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: border }}>
                <div className="opacity-50">Angle demandé</div>
                <div className="mt-1 text-lg font-black">{fmt(rpmResult?.angleUs ?? NaN, 2)} µs</div>
              </div>
            </div>
            <div className="text-[10px]" style={{ color: muted }}>
              Fréquence : {fmt(rpmResult?.frequencyHz ?? NaN, 2)} Hz · tour complet : {fmt(rpmResult?.cycleMs ?? NaN, 3)} ms
            </div>
          </div>
        );

      case "iq-duration":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="IQ" value={iq} onChange={setIq} unit="mg/cp" />
              <Field label="Densité carburant" value={fuelDensity} onChange={setFuelDensity} unit="g/cm³" />
              <Field label="Débit" value={flow} onChange={setFlow} unit="mm³/ms" />
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-center text-xs" style={{ borderColor: border }}>
              <div><div className="opacity-50">Volume</div><div className="mt-1 font-black">{fmt(iqResult?.volumeMm3 ?? NaN, 2)} mm³</div></div>
              <div><div className="opacity-50">Durée</div><div className="mt-1 font-black">{fmt(iqResult?.durationMs ?? NaN, 4)} ms</div></div>
              <div><div className="opacity-50">Durée</div><div className="mt-1 font-black">{fmt(iqResult?.durationUs ?? NaN, 0)} µs</div></div>
            </div>
            <div className="text-[10px]" style={{ color: muted }}>
              Estimation hydraulique configurable. Ce n'est pas la caractéristique réelle de l'ECU/injecteur.
            </div>
          </div>
        );

      case "afr":
        return (
          <div className="space-y-4">
            <Field label="AFR" value={afr} onChange={setAfr} />
            <div className="rounded-lg border p-4" style={{ borderColor: border }}>
              <div className="text-[10px] opacity-50">Valeur AFR</div>
              <div className="mt-1 text-3xl font-black">{fmt(afrResult, 3)}</div>
            </div>
            <div className="text-[10px]" style={{ color: muted }}>
              Outil AFR uniquement, sans conversion Lambda.
            </div>
          </div>
        );

      case "injector-flow":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Débit de référence" value={injectorFlow} onChange={setInjectorFlow} unit="cc/min" />
              <Field label="Pression de référence" value={refPressure} onChange={setRefPressure} unit="bar" />
              <Field label="Pression cible" value={targetPressure} onChange={setTargetPressure} unit="bar" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: border }}>
              <div>
                <div className="text-[10px] opacity-50">Débit estimé à la pression cible</div>
                <div className="mt-1 text-xl font-black">{fmt(injectorResult ?? NaN, 2)} cc/min</div>
              </div>
              <button type="button" onClick={() => copy("injector", String(injectorResult ?? ""))} className="rounded-lg border px-3 py-2 text-[10px] font-bold" style={{ borderColor: border }}>
                <Copy className="mr-1 inline h-3.5 w-3.5" />{copied === "injector" ? "Copié" : "Copier"}
              </button>
            </div>
          </div>
        );

      case "injection-duration":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Durée" value={duration} onChange={setDuration} unit="ms" />
              <Field label="Débit" value={flow} onChange={setFlow} unit="mm³/ms" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: border }}>
              <div>
                <div className="text-[10px] opacity-50">Quantité théorique</div>
                <div className="mt-1 text-xl font-black">{fmt(durationResult ?? NaN, 2)} mm³</div>
              </div>
              <button type="button" onClick={() => copy("duration", String(durationResult ?? ""))} className="rounded-lg border px-3 py-2 text-[10px] font-bold" style={{ borderColor: border }}>
                <Copy className="mr-1 inline h-3.5 w-3.5" />{copied === "duration" ? "Copié" : "Copier"}
              </button>
            </div>
          </div>
        );

      case "ramp":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Départ" value={rampStart} onChange={setRampStart} />
              <Field label="Fin" value={rampEnd} onChange={setRampEnd} />
              <Field label="Nombre de points" value={rampSteps} onChange={setRampSteps} />
            </div>
            <div className="flex gap-2">
              <select value={rampMode} onChange={(e) => setRampMode(e.target.value as "linear" | "smooth")} className="flex-1 rounded-lg border bg-black/20 px-3 py-2 text-xs outline-none" style={{ borderColor: border }}>
                <option value="linear">Linéaire</option>
                <option value="smooth">Progressive</option>
              </select>
              <button type="button" onClick={() => copy("ramp", ramp.map((v) => Number(v.toFixed(6))).join(", "))} className="rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: border }}>
                <Copy className="mr-1 inline h-3.5 w-3.5" />{copied === "ramp" ? "Copié" : "Copier"}
              </button>
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border p-3 font-mono text-[11px]" style={{ borderColor: border }}>
              {ramp.map((value, index) => (
                <div key={index} className="flex items-center justify-between border-b border-white/5 py-1 last:border-0">
                  <span className="opacity-45">#{index + 1}</span><span>{value.toFixed(6)}</span>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.76)", backdropFilter: "blur(10px)" }}>
      <div className="w-full max-w-2xl rounded-2xl border shadow-2xl" style={{ background: light ? "rgba(255,255,255,.98)" : "linear-gradient(145deg,rgba(18,11,30,.99),rgba(7,9,15,.995))", color: text, borderColor: border }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: border }}>
          <div className="flex items-center gap-2 font-black"><Calculator className="h-5 w-5 text-fuchsia-400" />{titles[tool]}</div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">{renderBody()}</div>
      </div>
    </div>
  );
}
