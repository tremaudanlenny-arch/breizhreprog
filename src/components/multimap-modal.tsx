"use client";

import React from "react";
import { CircleGauge, Copy, Layers3, X, Zap } from "lucide-react";
import type { VagtunerPack } from "@/lib/vagtuner-catalog";

interface MultimapVersion {
  id: string;
  name: string;
  isCurrent?: boolean;
}

interface MultimapModalProps {
  theme: "default" | "light" | "oled";
  projectKey: string;
  versions: MultimapVersion[];
  currentVersionId: string | null;
  vehicleHint: string;
  vagtunerCandidates: Array<{ pack: VagtunerPack; score: number }>;
  allVagtunerPacks: VagtunerPack[];
  onSelectVersion: (id: string) => void;
  onImportVagtunerPack: (pack: VagtunerPack) => void;
  onClose: () => void;
}

type SwitchMode = "manual" | "pedal" | "clutch";

const SLOT_COUNT = 3;

interface SwitchConfig {
  mode: SwitchMode;
  pedalThreshold: number;
  clutchActiveSlot: number;
  manualSlot: number;
}

export function MultimapModal({
  theme,
  projectKey,
  versions,
  currentVersionId,
  vehicleHint,
  vagtunerCandidates,
  allVagtunerPacks,
  onSelectVersion,
  onImportVagtunerPack,
  onClose,
}: MultimapModalProps) {
  const light = theme === "light";
  const surface = light ? "rgba(255,255,255,.98)" : "rgba(13,16,24,.99)";
  const text = light ? "#111827" : "#fff";
  const muted = light ? "rgba(17,24,39,.55)" : "rgba(255,255,255,.55)";
  const border = light ? "rgba(15,20,35,.12)" : "rgba(255,255,255,.10)";
  const key = "breizhreprog-multimap-config:" + projectKey;

  const [slots, setSlots] = React.useState<(string | null)[]>(Array.from({ length: SLOT_COUNT }, () => null));
  const [config, setConfig] = React.useState<SwitchConfig>({
    mode: "manual",
    pedalThreshold: 80,
    clutchActiveSlot: 1,
    manualSlot: 0,
  });
  const [simulationPedal, setSimulationPedal] = React.useState(0);
  const [simulationClutch, setSimulationClutch] = React.useState(false);
  const [activeSlot, setActiveSlot] = React.useState(0);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      if (Array.isArray(parsed?.slots)) {
        setSlots(Array.from({ length: SLOT_COUNT }, (_, i) =>
          typeof parsed.slots[i] === "string" ? parsed.slots[i] : null
        ));
      }
      if (parsed?.config && typeof parsed.config === "object") {
        setConfig((prev) => ({ ...prev, ...parsed.config }));
      }
    } catch {}
  }, [key]);

  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ slots, config }));
    } catch {}
  }, [key, slots, config]);

  const resolvedSlots = slots.map((id) => versions.find((v) => v.id === id) || null);

  const simulatedSlot = React.useMemo(() => {
    if (config.mode === "manual") return config.manualSlot;
    if (config.mode === "clutch") return simulationClutch ? config.clutchActiveSlot : 0;
    return simulationPedal >= config.pedalThreshold ? 1 : 0;
  }, [config, simulationClutch, simulationPedal]);

  const selectSlot = (slot: number) => {
    setActiveSlot(slot);
    const versionId = slots[slot];
    if (versionId) onSelectVersion(versionId);
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)" }}>
      <div
        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{
          background: surface,
          color: text,
          border: "1px solid " + (light ? border : "rgba(168,85,247,.34)"),
          boxShadow: "0 30px 100px rgba(0,0,0,.65)",
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border, background: surface }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-500">
              <Layers3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-lg">Multimap</div>
              <div className="text-[11px]" style={{ color: muted }}>
                3 profils · switch logiciel pédale / embrayage / manuel
              </div>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/10" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-xl border p-4" style={{ borderColor: border, background: light ? "#f8fafc" : "rgba(255,255,255,.03)" }}>
            <div className="flex items-center gap-2 mb-3">
              <CircleGauge className="w-4 h-4 text-violet-400" />
              <span className="font-semibold text-sm">Configuration du switch</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["manual", "Manuel"],
                ["pedal", "Pédale"],
                ["clutch", "Embrayage"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, mode }))}
                  className="rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{
                    background: config.mode === mode ? "linear-gradient(135deg,#7c3aed,#d946ef)" : (light ? "#fff" : "rgba(255,255,255,.05)"),
                    color: config.mode === mode ? "#fff" : text,
                    border: "1px solid " + (config.mode === mode ? "transparent" : border),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {config.mode === "pedal" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: muted }}>Seuil accélérateur</span>
                  <strong>{config.pedalThreshold}%</strong>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={config.pedalThreshold}
                  onChange={(e) => setConfig((p) => ({ ...p, pedalThreshold: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <button className="flex-1 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: border }} onClick={() => setSimulationPedal(0)}>Pédale 0%</button>
                  <button className="flex-1 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: border }} onClick={() => setSimulationPedal(config.pedalThreshold)}>Pédale seuil</button>
                  <button className="flex-1 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: border }} onClick={() => setSimulationPedal(100)}>Pédale 100%</button>
                </div>
              </div>
            )}

            {config.mode === "clutch" && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSimulationClutch(false)}
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold border"
                  style={{ borderColor: border, background: !simulationClutch ? "rgba(124,58,237,.12)" : undefined }}
                >
                  Embrayage relâché
                </button>
                <button
                  type="button"
                  onClick={() => setSimulationClutch(true)}
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold border"
                  style={{ borderColor: border, background: simulationClutch ? "rgba(124,58,237,.12)" : undefined }}
                >
                  Embrayage appuyé
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-sm">Profils Multimap</div>
                <div className="text-[11px]" style={{ color: muted }}>Sélectionne jusqu'à 3 versions/calibrations.</div>
              </div>
              <div className="text-[11px]" style={{ color: muted }}>
                Profil simulé : <strong style={{ color: text }}>Map {simulatedSlot + 1}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Array.from({ length: SLOT_COUNT }, (_, index) => {
                const version = resolvedSlots[index];
                const active = currentVersionId === version?.id;
                return (
                  <div key={index} className="rounded-xl border p-3" style={{ borderColor: active ? "#8b5cf6" : border, background: active ? "rgba(124,58,237,.10)" : (light ? "rgba(248,250,252,.75)" : "rgba(255,255,255,.03)") }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm">Map {index + 1}</div>
                      {active && <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400">ACTIVE</span>}
                    </div>
                    <select
                      value={slots[index] || ""}
                      onChange={(e) => setSlots((prev) => {
                        const next = [...prev];
                        next[index] = e.target.value || null;
                        return next;
                      })}
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                      style={{ background: light ? "#fff" : "#161a23", color: text, border: "1px solid " + border }}
                    >
                      <option value="">Profil non attribué</option>
                      {versions.map((version) => (
                        <option key={version.id} value={version.id}>{version.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!version}
                      onClick={() => selectSlot(index)}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white disabled:opacity-35"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Charger ce profil
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 rounded-xl px-4 py-3 text-[11px]" style={{ background: light ? "#f8fafc" : "rgba(255,255,255,.035)", border: "1px solid " + border, color: muted }}>
              Ce mode gère les profils et la logique de sélection dans le logiciel. Le patch binaire du switch réel en roulant reste spécifique à l'ECU et n'est pas inventé automatiquement.
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: border }}>
            <div className="flex items-center gap-2 mb-2">
              <Layers3 className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-sm">Mappacks VAGTuner</span>
            </div>
            <div className="text-[11px] mb-3" style={{ color: muted }}>
              Cartographie détectée : <strong style={{ color: text }}>{vehicleHint}</strong>
            </div>

            {vagtunerCandidates.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold mb-2 text-emerald-400">Correspondances probables</div>
                <div className="grid gap-2">
                  {vagtunerCandidates.slice(0, 3).map(({ pack, score }) => (
                    <div key={pack.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: border }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{pack.name}</div>
                        <div className="text-[10px]" style={{ color: muted }}>{pack.mapCount} maps · score {Math.min(100, score * 10)}%</div>
                      </div>
                      <button type="button" onClick={() => onImportVagtunerPack(pack)} className="px-3 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 text-white text-xs font-semibold">
                        Associer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[11px] font-semibold mb-2" style={{ color: muted }}>Catalogue VAGTuner embarqué</div>
            <div className="grid gap-2">
              {allVagtunerPacks.map((pack) => (
                <div key={pack.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: border }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{pack.name}</div>
                    <div className="text-[10px]" style={{ color: muted }}>{pack.mapCount} maps · {pack.ecu}</div>
                  </div>
                  <button type="button" onClick={() => onImportVagtunerPack(pack)} className="px-3 py-2 rounded-lg border text-xs font-semibold" style={{ borderColor: border }}>
                    Importer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
