"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Cuboid, Gauge, Calculator, RotateCcw, X, Zap } from "lucide-react";
import type { InjectionMapSnapshot } from "./injection-calculator-modal";

export interface CalibrationMap {
  name: string;
  address: number;
  size: number;
  category?: string;
  subcategory?: string;
}

interface Props {
  theme: "default" | "light" | "oled";
  maps: CalibrationMap[];
  durationMaps: CalibrationMap[];
  soiMaps: CalibrationMap[];
  snapshots: Map<number, InjectionMapSnapshot>;
  modifications: Map<number, Record<string, number>>;
  onOpenMap3D: (map: CalibrationMap) => void;
  onOpenInjectionCalculator: (targetIq: number, targetAtdc: number) => void;
  onOpenAtdc: () => void;
  onResetLive: () => void;
  onClose: () => void;
}

function finiteNumbers(values: number[][]) {
  return values.flat().filter(Number.isFinite);
}

function stats(snapshot?: InjectionMapSnapshot) {
  if (!snapshot) return null;
  const values = finiteNumbers(snapshot.sourceMapValues ?? snapshot.mapValues);
  if (!values.length) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    rows: (snapshot.sourceMapValues ?? snapshot.mapValues).length,
    cols: (snapshot.sourceMapValues ?? snapshot.mapValues)[0]?.length ?? 0,
  };
}

export function CalibrationWorkspaceModal({
  theme,
  maps,
  durationMaps,
  soiMaps,
  snapshots,
  modifications,
  onOpenMap3D,
  onOpenInjectionCalculator,
  onOpenAtdc,
  onResetLive,
  onClose,
}: Props) {
  const light = theme === "light";
  const surface = light ? "rgba(255,255,255,.98)" : "linear-gradient(145deg, rgba(18,11,30,.99), rgba(7,9,15,.995))";
  const text = light ? "#111827" : "#fff";
  const muted = light ? "rgba(17,24,39,.58)" : "rgba(255,255,255,.55)";
  const border = light ? "rgba(17,24,39,.12)" : "rgba(168,85,247,.23)";
  const card = light ? "rgba(248,250,252,.92)" : "rgba(255,255,255,.035)";
  const [targetIq, setTargetIq] = useState("85");
  const [targetAtdc, setTargetAtdc] = useState("9");
  const [filter, setFilter] = useState("");

  const allCalibrationMaps = useMemo(() => {
    const byAddress = new Map<number, CalibrationMap>();
    for (const map of maps) byAddress.set(map.address, map);
    return Array.from(byAddress.values());
  }, [maps]);

  const durationStatuses = durationMaps.map((map) => ({
    map,
    snapshot: snapshots.get(map.address),
    status: snapshots.has(map.address) ? "LIVE" : "WAIT",
    stats: stats(snapshots.get(map.address)),
  }));
  const soiStatuses = soiMaps.map((map) => ({
    map,
    snapshot: snapshots.get(map.address),
    status: snapshots.has(map.address) ? "LIVE" : "WAIT",
    stats: stats(snapshots.get(map.address)),
  }));

  const changedCellCount = Array.from(modifications.values()).reduce((sum, cells) => sum + Object.keys(cells).length, 0);
  const changedMapCount = Array.from(modifications.values()).filter((cells) => Object.keys(cells).length > 0).length;
  const invalidEditCount = Array.from(modifications.values()).reduce(
    (sum, cells) => sum + Object.values(cells).filter((value) => !Number.isFinite(value)).length,
    0,
  );

  const filteredMaps = allCalibrationMaps.filter((map) => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return (map.name || "").toLowerCase().includes(needle)
      || ("0x" + map.address.toString(16)).includes(needle.replace(/^0x/, ""));
  });

  const iq = Number(targetIq.replace(",", "."));
  const atdc = Number(targetAtdc.replace(",", "."));
  const targetValid = Number.isFinite(iq) && iq >= 0 && Number.isFinite(atdc);

  const statusChip = (status: string) => (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold"
      style={{
        background: status === "LIVE" ? "rgba(34,197,94,.13)" : "rgba(245,158,11,.12)",
        color: status === "LIVE" ? "#4ade80" : "#fbbf24",
        border: "1px solid " + (status === "LIVE" ? "rgba(34,197,94,.22)" : "rgba(245,158,11,.22)"),
      }}
    >
      {status === "LIVE" ? <CheckCircle2 className="h-3 w-3" /> : <Activity className="h-3 w-3 animate-pulse" />}
      {status}
    </span>
  );

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)" }}>
      <div className="relative w-full max-w-6xl max-h-[94vh] overflow-hidden rounded-2xl border shadow-2xl" style={{ background: surface, color: text, borderColor: border }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: border }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-500/20">
              <Gauge className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-black tracking-wide">Calibration Workspace</div>
              <div className="text-[11px]" style={{ color: muted }}>Centre de calibration live — aucune map source n’a besoin d’être ouverte</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(94vh-76px)] overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border p-3" style={{ background: card, borderColor: border }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: muted }}>Maps modifiées</div>
              <div className="mt-1 text-2xl font-black">{changedMapCount}</div>
            </div>
            <div className="rounded-xl border p-3" style={{ background: card, borderColor: border }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: muted }}>Cellules modifiées</div>
              <div className="mt-1 text-2xl font-black">{changedCellCount}</div>
            </div>
            <div className="rounded-xl border p-3" style={{ background: card, borderColor: border }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: muted }}>Sources live</div>
              <div className="mt-1 text-2xl font-black">{durationStatuses.filter(x => x.status === "LIVE").length + soiStatuses.filter(x => x.status === "LIVE").length}</div>
            </div>
            <div className="rounded-xl border p-3" style={{ background: card, borderColor: border }}>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: muted }}>Cohérence</div>
              <div className={"mt-1 text-lg font-black " + (invalidEditCount ? "text-red-400" : "text-emerald-400")}>
                {invalidEditCount ? "ERREUR" : "OK"}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-4">
            <div className="rounded-xl border p-4" style={{ background: card, borderColor: border }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-fuchsia-400" />
                <div className="font-bold">Calibration injection rapide</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="rounded-lg border p-3" style={{ borderColor: border }}>
                  <div className="text-[10px]" style={{ color: muted }}>IQ cible</div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      value={targetIq}
                      onChange={(e) => setTargetIq(e.target.value)}
                      className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono outline-none"
                      style={{ borderColor: border }}
                      inputMode="decimal"
                    />
                    <span className="text-[11px]" style={{ color: muted }}>mg</span>
                  </div>
                </label>
                <label className="rounded-lg border p-3" style={{ borderColor: border }}>
                  <div className="text-[10px]" style={{ color: muted }}>ATDC cible</div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      value={targetAtdc}
                      onChange={(e) => setTargetAtdc(e.target.value)}
                      className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono outline-none"
                      style={{ borderColor: border }}
                      inputMode="decimal"
                    />
                    <span className="text-[11px]" style={{ color: muted }}>°</span>
                  </div>
                </label>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!targetValid}
                  onClick={() => onOpenInjectionCalculator(iq, atdc)}
                  className="rounded-lg px-3 py-2.5 text-sm font-bold disabled:opacity-35 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white"
                >
                  <span className="inline-flex items-center gap-2"><Calculator className="h-4 w-4" />Calculer {Number.isFinite(iq) ? iq : "—"} mg</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAtdc}
                  className="rounded-lg border px-3 py-2.5 text-sm font-bold hover:bg-white/5"
                  style={{ borderColor: border }}
                >
                  <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4" />Ouvrir ATDC live</span>
                </button>
              </div>
              <div className="mt-3 rounded-lg border px-3 py-2 text-[11px]" style={{ borderColor: border, color: muted }}>
                Le moteur live travaille sur les maps Duration/SOI en arrière-plan. Tu peux donc rester dans ce panneau pendant toute la calibration.
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ background: card, borderColor: border }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold">Duration / SOI</div>
                  <div className="text-[10px]" style={{ color: muted }}>{durationMaps.length} Duration · {soiMaps.length} SOI détectées</div>
                </div>
                <button type="button" onClick={onResetLive} className="rounded-lg border p-2 hover:bg-white/5" style={{ borderColor: border }} title="Rafraîchir les sources">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {[...durationStatuses, ...soiStatuses].slice(0, 12).map(({ map, status, stats: mapStats }) => (
                  <div key={map.address} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: border }}>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">{map.name}</div>
                      <div className="text-[10px] font-mono" style={{ color: muted }}>
                        {"0x" + map.address.toString(16).toUpperCase()} · {mapStats ? (mapStats.rows + "×" + mapStats.cols) : "chargement"}
                      </div>
                    </div>
                    {statusChip(status)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ background: card, borderColor: border }}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <div className="font-bold">Maps de calibration</div>
                <div className="text-[10px]" style={{ color: muted }}>Accès direct à la 3D, sans chercher dans l’arbre</div>
              </div>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Rechercher une map ou une adresse…"
                className="w-full sm:w-72 rounded-lg border bg-transparent px-3 py-2 text-xs outline-none"
                style={{ borderColor: border }}
              />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredMaps.slice(0, 18).map((map) => {
                const changed = Object.keys(modifications.get(map.address) || {}).length;
                return (
                  <div key={map.address} className="rounded-lg border p-3" style={{ borderColor: border }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold">{map.name}</div>
                        <div className="font-mono text-[10px]" style={{ color: muted }}>{"0x" + map.address.toString(16).toUpperCase()}</div>
                      </div>
                      {changed > 0 && (
                        <span className="rounded-full bg-violet-500/15 px-2 py-1 text-[9px] font-bold text-violet-300">{changed} mod.</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenMap3D(map)}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold hover:bg-white/5"
                      style={{ borderColor: border }}
                    >
                      <Cuboid className="h-4 w-4" />Ouvrir en 3D
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {invalidEditCount > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{invalidEditCount} valeur(s) non numérique(s) sont présentes dans les modifications. Corrige-les avant export.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
