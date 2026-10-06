"use client";

import React from "react";
import { Archive, Download, FileUp, X } from "lucide-react";

interface MappackManagerModalProps {
  theme: "default" | "light" | "oled";
  packs: Array<{ source: string; label: string; count: number }>;
  onImport: () => void;
  onExport: (source: string) => void;
  onClose: () => void;
}

export function MappackManagerModal({
  theme,
  packs,
  onImport,
  onExport,
  onClose,
}: MappackManagerModalProps) {
  const light = theme === "light";
  const text = light ? "#111827" : "#fff";
  const muted = light ? "rgba(17,24,39,.55)" : "rgba(255,255,255,.55)";
  const border = light ? "rgba(15,20,35,.12)" : "rgba(255,255,255,.10)";
  const surface = light ? "rgba(255,255,255,.97)" : "rgba(14,17,24,.98)";

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.66)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl" style={{ background: surface, color: text, border: "1px solid " + border }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-cyan-400">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-lg">Gestionnaire de Mappacks</div>
              <div className="text-[11px]" style={{ color: muted }}>JSON WinOLS + VAGTuner .vtkp + définitions importées</div>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/10" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <button
            type="button"
            onClick={onImport}
            className="w-full rounded-xl px-4 py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-semibold"
          >
            <FileUp className="w-4 h-4" />
            Importer un mappack (.json / .vtkp / .xdf)
          </button>

          <div className="grid gap-2">
            {packs.length === 0 ? (
              <div className="rounded-xl border px-4 py-6 text-center text-sm" style={{ borderColor: border, color: muted }}>
                Aucun mappack de définitions importé.
              </div>
            ) : (
              packs.map((pack) => (
                <div key={pack.source} className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: border, background: light ? "rgba(248,250,252,.75)" : "rgba(255,255,255,.035)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{pack.label}</div>
                    <div className="text-[11px]" style={{ color: muted }}>{pack.count} map(s) · source {pack.source}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onExport(pack.source)}
                    className="px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:bg-white/10"
                    style={{ borderColor: border }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exporter
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl px-4 py-3 text-[11px]" style={{ background: light ? "#f8fafc" : "rgba(255,255,255,.035)", border: "1px solid " + border, color: muted }}>
            Les .vtkp sont compatibles avec le format de mappack utilisé par VAGTuner : les définitions sont exportées, pas la ROM.
          </div>
        </div>
      </div>
    </div>
  );
}
