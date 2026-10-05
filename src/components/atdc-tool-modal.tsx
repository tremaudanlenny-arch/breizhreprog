"use client";

import { Calculator, X, Zap } from "lucide-react";

export interface AtdcSourceMap {
  name: string;
  address: number;
  size?: number;
  correction_factor?: number;
  offset?: number;
  data_type?: string;
  is_little_endian?: boolean;
  x_label?: string;
  y_label?: string;
  x_axis_values?: number[] | null;
  y_axis_values?: number[] | null;
  dimensions?: {
    TwoDimensional?: { rows: number; cols: number };
    OneDimensional?: { length: number };
  };
}

interface AtdcToolModalProps {
  theme: "default" | "light" | "oled";
  durationMaps: AtdcSourceMap[];
  soiMaps: AtdcSourceMap[];
  selectedMap: AtdcSourceMap | null;
  soi: number;
  onSelectMap: (map: AtdcSourceMap) => void;
  onSelectSoi: (soi: number) => void;
  onOpen: () => void;
  onClose: () => void;
}

export function AtdcToolModal({
  theme,
  durationMaps,
  soiMaps,
  selectedMap,
  soi,
  onSelectMap,
  onSelectSoi,
  onOpen,
  onClose,
}: AtdcToolModalProps) {
  const isLight = theme === "light";
  const surface = isLight ? "rgba(255,255,255,0.96)" : theme === "oled" ? "rgba(12,12,14,0.97)" : "rgba(24,27,37,0.97)";
  const text = isLight ? "#111827" : "#ffffff";
  const muted = isLight ? "rgba(17,24,39,0.55)" : "rgba(255,255,255,0.55)";
  const border = isLight ? "rgba(15,20,35,0.12)" : "rgba(255,255,255,0.10)";
  const findDuration = (ti: number) =>
    durationMaps.find((m) => new RegExp("(?:injector\\s+)?duration\\s+0?" + ti + "(?:\\D|$)", "i").test(m.name));

  const findSoi = (value: number) =>
    soiMaps.find((m) => new RegExp("start\\s+of\\s+injection\\s+" + value + "(?:°C?|\\s|$)", "i").test(m.name));

  const selectedSoiMap = findSoi(soi);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ background: "radial-gradient(circle at center, rgba(124,58,237,0.16), rgba(0,0,0,0.68))", backdropFilter: "blur(8px)" }}>
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: theme === "light"
            ? surface
            : "linear-gradient(145deg, rgba(18,12,30,0.98), rgba(9,11,18,0.98))",
          border: `1px solid ${theme === "light" ? border : "rgba(168,85,247,0.35)"}`,
          color: text,
          boxShadow: theme === "light"
            ? "0 24px 70px rgba(0,0,0,0.22)"
            : "0 0 25px rgba(139,92,246,0.16), 0 24px 90px rgba(0,0,0,0.7)",
        }}
      >
        <div className="absolute -inset-20 bg-gradient-to-r from-violet-600/10 via-fuchsia-500/10 to-cyan-400/10 blur-3xl animate-pulse pointer-events-none" />
        <div className="relative flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-500">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-black tracking-wide">Calculateur ATDC</div>
              <div className="text-[11px]" style={{ color: muted }}>ATDC = TI − SOI cellule par cellule</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: muted }}>Temps d'injection</div>
            {durationMaps.length === 0 ? (
              <div className="rounded-lg px-3 py-3 text-xs" style={{ background: isLight ? "#f3f4f6" : "rgba(255,255,255,0.05)", color: muted }}>
                Aucune map Injector Duration 00 à 05 détectée.
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 5].map((ti) => {
                  const map = findDuration(ti);
                  const selected = map?.address === selectedMap?.address;
                  return (
                    <button
                      key={ti}
                      type="button"
                      disabled={!map}
                      onClick={() => map && onSelectMap(map)}
                      className="rounded-lg px-2 py-2.5 text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: selected
                          ? "linear-gradient(135deg, #7c3aed, #d946ef)"
                          : isLight ? "#f3f4f6" : "rgba(255,255,255,0.06)",
                        color: selected ? "#fff" : text,
                        border: `1px solid ${selected ? "transparent" : border}`,
                      }}
                    >
                      TI{ti}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedMap && (
              <div className="mt-2 text-[11px] truncate" style={{ color: muted }}>
                Duration : <span style={{ color: text }}>{selectedMap.name}</span>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-medium mb-2" style={{ color: muted }}>Map Start of injection (SOI)</div>
            <div className="grid grid-cols-5 gap-2">
              {[90, 80, 70, 60, 50].map((value) => {
                const map = findSoi(value);
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={!map}
                    onClick={() => map && onSelectSoi(value)}
                    className="rounded-lg px-2 py-2.5 text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: soi === value
                        ? "rgba(124,58,237,0.22)"
                        : isLight ? "#f3f4f6" : "rgba(255,255,255,0.06)",
                      color: text,
                      border: `1px solid ${soi === value ? "#8b5cf6" : border}`,
                    }}
                  >
                    {value}°
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[11px]" style={{ color: selectedSoiMap ? muted : "#f87171" }}>
              {selectedSoiMap
                ? <>SOI : <span style={{ color: text }}>{selectedSoiMap.name}</span></>
                : <>Aucune map Start of injection {soi}° détectée.</>}
            </div>
          </div>

          <div className="rounded-lg px-3 py-3 text-center" style={{ background: isLight ? "#f8fafc" : "rgba(255,255,255,0.04)", border: `1px solid ${border}` }}>
            <div className="text-[11px]" style={{ color: muted }}>Formule</div>
            <div className="text-lg font-bold mt-0.5">ATDC = TI(cellule) − SOI(cellule)</div>
          </div>

          <button
            type="button"
            disabled={!selectedMap || !selectedSoiMap}
            onClick={onOpen}
            className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500 hover:brightness-110 transition"
          >
            <span className="inline-flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Ouvrir la map ATDC
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
