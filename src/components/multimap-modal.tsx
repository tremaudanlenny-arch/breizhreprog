"use client";

import { Copy, Layers3, X, Zap } from "lucide-react";

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
  onSelectVersion: (id: string) => void;
  onClose: () => void;
}

const SLOT_COUNT = 6;

export function MultimapModal({
  theme,
  projectKey,
  versions,
  currentVersionId,
  onSelectVersion,
  onClose,
}: MultimapModalProps) {
  const light = theme === "light";
  const surface = light ? "rgba(255,255,255,.97)" : "rgba(13,16,24,.98)";
  const text = light ? "#111827" : "#fff";
  const muted = light ? "rgba(17,24,39,.55)" : "rgba(255,255,255,.55)";
  const border = light ? "rgba(15,20,35,.12)" : "rgba(255,255,255,.10)";
  const key = "breizhreprog-multimap-slots:" + projectKey;

  const [slots, setSlots] = React.useState<(string | null)[]>(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.from({ length: SLOT_COUNT }, (_, i) =>
        typeof parsed?.[i] === "string" ? parsed[i] : null
      );
    } catch {
      return Array.from({ length: SLOT_COUNT }, () => null);
    }
  });

  React.useEffect(() => {
    localStorage.setItem(key, JSON.stringify(slots));
  }, [key, slots]);

  const setSlot = (index: number, versionId: string) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = versionId || null;
      return next;
    });
  };

  const clearSlot = (index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.66)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: surface,
          color: text,
          border: "1px solid " + (light ? border : "rgba(168,85,247,.32)"),
          boxShadow: "0 30px 100px rgba(0,0,0,.55)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-500">
              <Layers3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-lg">Multimap</div>
              <div className="text-[11px]" style={{ color: muted }}>
                Gestionnaire de 6 profils de calibration inspiré du système VAGTuner
              </div>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/10" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {slots.map((versionId, index) => {
              const selected = versions.find((v) => v.id === versionId);
              const active = currentVersionId === versionId;
              return (
                <div key={index} className="rounded-xl border p-3" style={{ borderColor: border, background: light ? "rgba(248,250,252,.8)" : "rgba(255,255,255,.035)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">Map {index + 1}</div>
                    {active && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <select
                    value={versionId || ""}
                    onChange={(e) => setSlot(index, e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                    style={{
                      background: light ? "#fff" : "#161a23",
                      color: text,
                      border: "1px solid " + border,
                    }}
                  >
                    <option value="">Profil non attribué</option>
                    {versions.map((version) => (
                      <option key={version.id} value={version.id}>
                        {version.name}{version.isCurrent ? " (actuel)" : ""}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      disabled={!selected}
                      onClick={() => selected && onSelectVersion(selected.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white disabled:opacity-35"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Charger
                    </button>
                    <button
                      type="button"
                      disabled={!versionId}
                      onClick={() => clearSlot(index)}
                      className="px-3 py-2 rounded-lg text-xs border disabled:opacity-35"
                      style={{ borderColor: border }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl px-4 py-3 text-[11px]" style={{ background: light ? "#f8fafc" : "rgba(255,255,255,.035)", border: "1px solid " + border, color: muted }}>
            Ce mode gère les profils/calibrations du projet. Le vrai switch matériel d'une cartographie en roulant nécessite une méthode ECU spécifique ; il n'est pas généré automatiquement ici.
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
