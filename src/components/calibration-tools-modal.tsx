"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Gauge,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";

export interface CalibrationToolsMap {
  name: string;
  address: number;
  size: number;
  category?: string;
  subcategory?: string;
  dimensions?: {
    TwoDimensional?: { rows: number; cols: number };
    OneDimensional?: { length: number };
  };
  correction_factor?: number;
  offset?: number;
  unit?: string;
  x_label?: string;
  y_label?: string;
}

interface Props {
  theme: "default" | "light" | "oled";
  maps: CalibrationToolsMap[];
  modifications: Map<number, Record<string, number>>;
  fileName?: string;
  ecuType?: string;
  onOpenMap: (map: CalibrationToolsMap) => void;
  onRestoreSnapshot?: (changes: Map<number, Record<string, number>>) => void;
  onClose: () => void;
}

type Severity = "ok" | "warn" | "error";

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

function CheckRow({ severity, title, detail }: { severity: Severity; title: string; detail: string }) {
  const icon =
    severity === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
    severity === "warn" ? <AlertTriangle className="h-4 w-4 text-amber-400" /> :
    <AlertTriangle className="h-4 w-4 text-red-400" />;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
      style={{ borderColor: "rgba(168,85,247,.18)", background: "rgba(255,255,255,.03)" }}
    >
      {icon}
      <div className="min-w-0">
        <div className="text-xs font-semibold">{title}</div>
        <div className="mt-0.5 text-[11px] opacity-60">{detail}</div>
      </div>
    </div>
  );
}

export function CalibrationToolsModal({
  theme,
  maps,
  modifications,
  fileName,
  ecuType,
  onOpenMap,
  onRestoreSnapshot,
  onClose,
}: Props) {
  const light = theme === "light";
  const border = light ? "rgba(17,24,39,.12)" : "rgba(168,85,247,.22)";
  const card = light ? "rgba(248,250,252,.96)" : "rgba(255,255,255,.035)";
  const text = light ? "#111827" : "#fff";
  const muted = light ? "rgba(17,24,39,.56)" : "rgba(255,255,255,.55)";
  const [tab, setTab] = useState<"analyse" | "map" | "doctor" | "snapshots">("analyse");
  const [sensor, setSensor] = useState<"3" | "4" | "6">("4");
  const [filter, setFilter] = useState("");
  const [snapshotName, setSnapshotName] = useState("Test calibration");
  const [savedMessage, setSavedMessage] = useState("");
  const [storedSnapshots, setStoredSnapshots] = useState<Array<{
    key: string;
    name: string;
    createdAt: string;
    modifications: Array<{ address: number; cells: Record<string, number> }>;
  }>>([]);

  const changed = useMemo(
    () => maps.filter((map) => Object.keys(modifications.get(map.address) || {}).length > 0),
    [maps, modifications],
  );

  const changedCells = useMemo(
    () => changed.reduce((sum, map) => sum + Object.keys(modifications.get(map.address) || {}).length, 0),
    [changed, modifications],
  );

  const groups = useMemo(() => {
    const names = changed.map((m) => normalize(m.name));
    const has = (needle: string) => names.some((name) => name.includes(needle));
    return {
      boost: has("boost") || has("turbo") || has("pression"),
      boostLimiter: names.some((name) => /limiter/.test(name) && /(boost|turbo|pression)/.test(name)),
      iq: names.some((name) => /(duration|injection|iq|smoke|couple|torque)/.test(name)),
      smoke: has("smoke") || has("fum"),
      torque: has("torque") || has("couple"),
    };
  }, [changed]);

  const checks: Array<{ severity: Severity; title: string; detail: string }> = [];
  if (!changed.length) {
    checks.push({
      severity: "ok",
      title: "Aucune modification détectée",
      detail: "Le fichier est encore au même état que la base de travail en mémoire.",
    });
  } else {
    checks.push({
      severity: "ok",
      title: changed.length + " map(s) modifiée(s)",
      detail: changedCells + " cellule(s) changée(s) dans cette session.",
    });
  }

  if (groups.boost && !groups.boostLimiter) {
    checks.push({
      severity: "warn",
      title: "Boost : limiteur associé non détecté dans les modifications",
      detail: "Vérifie manuellement Boost Request / Boost Limiter / protections. Ce contrôle ne garantit pas l'absence de coupure.",
    });
  } else if (groups.boost && groups.boostLimiter) {
    checks.push({
      severity: "ok",
      title: "Chaîne boost repérée",
      detail: "Au moins une map de pression/boost et un limiteur associé sont modifiés.",
    });
  } else {
    checks.push({
      severity: "ok",
      title: "Boost non modifié dans cette session",
      detail: "Aucune map de pression/boost clairement identifiée n'est dans les modifications actuelles.",
    });
  }

  if (groups.iq && !groups.torque) {
    checks.push({
      severity: "warn",
      title: "IQ modifié sans limiteur couple repéré",
      detail: "Vérifie Driver Wish / Torque Limiter / Smoke Limiter avant export.",
    });
  } else if (groups.iq && groups.torque) {
    checks.push({
      severity: "ok",
      title: "Chaîne carburant repérée",
      detail: "Des maps liées à l'IQ et au couple sont présentes dans les modifications.",
    });
  }

  checks.push({
    severity: "ok",
    title: "ATDC / Duration",
    detail: "Le contrôle numérique détaillé reste celui du moteur live ATDC / Injection Calculator.",
  });

  checks.push({
    severity: "ok",
    title: "Checksum",
    detail: "Le checksum doit encore être validé par le moteur checksum au moment de l'export.",
  });

  const sensorRatio = Number(sensor) / 3;
  const affectedSensorMaps = maps.filter((m) =>
    /(map|boost|turbo|pressure|pression|sensor|capteur)/.test(normalize(m.name)),
  );

  const filteredMaps = maps.filter((map) => {
    const needle = normalize(filter.trim());
    if (!needle) return true;
    return normalize(map.name).includes(needle)
      || ("0x" + map.address.toString(16)).includes(needle.replace(/^0x/, ""));
  });

  const saveSnapshot = () => {
    const payload = {
      format: "breizh-reprog-calibration-snapshot",
      version: 1,
      createdAt: new Date().toISOString(),
      fileName,
      ecuType,
      name: snapshotName || "Snapshot",
      modifications: Array.from(modifications.entries()).map(([address, cells]) => ({
        address,
        cells,
      })),
    };

    try {
      localStorage.setItem(
        "breizhreprog-snapshot:" + payload.name + ":" + payload.createdAt,
        JSON.stringify(payload),
      );
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        (snapshotName || "calibration").replace(/[^a-z0-9_-]+/gi, "_") +
        ".breizh-calibration.json";
      link.click();
      URL.revokeObjectURL(url);
      setSavedMessage("Snapshot sauvegardé.");
      refreshStoredSnapshots();
    } catch {
      setSavedMessage("Impossible de sauvegarder le snapshot.");
    }
  };

  const refreshStoredSnapshots = () => {
    try {
      const items: typeof storedSnapshots = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("breizhreprog-snapshot:")) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.fileName !== fileName) continue;
        items.push({
          key,
          name: parsed.name || "Snapshot",
          createdAt: parsed.createdAt || "",
          modifications: Array.isArray(parsed.modifications) ? parsed.modifications : [],
        });
      }
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setStoredSnapshots(items.slice(0, 20));
    } catch {
      setStoredSnapshots([]);
    }
  };

  const restoreSnapshot = (snapshot: typeof storedSnapshots[number]) => {
    if (!onRestoreSnapshot) return;
    const changes = new Map<number, Record<string, number>>();
    snapshot.modifications.forEach((entry) => changes.set(Number(entry.address), { ...entry.cells }));
    onRestoreSnapshot(changes);
    setSavedMessage("Snapshot restauré dans la session.");
  };

  useEffect(() => { if (tab === "snapshots") refreshStoredSnapshots(); }, [tab, fileName]);

  const tabs = [
    ["analyse", "Analyse avant export", ShieldCheck],
    ["map", "MAP sensor", Gauge],
    ["doctor", "Map Doctor", Activity],
    ["snapshots", "Snapshots", Save],
  ] as const;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="w-full max-w-6xl max-h-[94vh] overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: light ? "rgba(255,255,255,.98)" : "linear-gradient(145deg,rgba(18,11,30,.99),rgba(7,9,15,.995))",
          color: text,
          borderColor: border,
        }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: border }}>
          <div>
            <div className="flex items-center gap-2 font-black">
              <SlidersHorizontal className="h-5 w-5 text-fuchsia-400" />
              Calibration Tools
            </div>
            <div className="mt-1 text-[11px]" style={{ color: muted }}>
              Analyse et préparation avant export · {fileName || "fichier courant"} · {ecuType || "ECU non précisé"}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-[210px_1fr] min-h-[650px]">
          <div className="border-r p-3 space-y-1" style={{ borderColor: border }}>
            {tabs.map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold"
                style={{
                  background: tab === id ? "linear-gradient(90deg,rgba(124,58,237,.28),rgba(168,85,247,.16))" : "transparent",
                  color: tab === id ? text : muted,
                }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto p-5 space-y-4">
            {tab === "analyse" && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border p-3" style={{ borderColor: border, background: card }}>
                    <div className="text-[10px]" style={{ color: muted }}>Maps modifiées</div>
                    <div className="mt-1 text-2xl font-black">{changed.length}</div>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: border, background: card }}>
                    <div className="text-[10px]" style={{ color: muted }}>Cellules</div>
                    <div className="mt-1 text-2xl font-black">{changedCells}</div>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: border, background: card }}>
                    <div className="text-[10px]" style={{ color: muted }}>Boost</div>
                    <div className="mt-1 text-lg font-black">{groups.boost ? "ACTIF" : "—"}</div>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: border, background: card }}>
                    <div className="text-[10px]" style={{ color: muted }}>Carburant</div>
                    <div className="mt-1 text-lg font-black">{groups.iq ? "ACTIF" : "—"}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">Contrôles avant export</div>
                    <div className="text-[11px]" style={{ color: muted }}>
                      Contrôles de cohérence, pas une garantie de comportement réel du véhicule.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSavedMessage("Analyse recalculée.")}
                    className="rounded-lg border px-3 py-2 text-xs font-bold"
                    style={{ borderColor: border }}
                  >
                    <RefreshCw className="mr-2 inline h-4 w-4" />
                    Analyser
                  </button>
                </div>

                <div className="space-y-2">
                  {checks.map((check, index) => <CheckRow key={index} {...check} />)}
                </div>
              </>
            )}

            {tab === "map" && (
              <>
                <div className="rounded-xl border p-4" style={{ borderColor: border, background: card }}>
                  <div className="flex items-center gap-2 font-bold">
                    <Gauge className="h-4 w-4 text-cyan-400" />
                    Assistant MAP sensor
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: muted }}>
                    Repère de plage par rapport à un capteur 3 bar. Le transfert tension → pression réel doit être vérifié avec le capteur utilisé.
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {(["3", "4", "6"] as const).map((bar) => (
                      <button
                        key={bar}
                        type="button"
                        onClick={() => setSensor(bar)}
                        className="rounded-xl border p-4 text-center"
                        style={{
                          borderColor: sensor === bar ? "rgba(168,85,247,.75)" : border,
                          background: sensor === bar ? "rgba(124,58,237,.16)" : "transparent",
                        }}
                      >
                        <div className="text-xl font-black">{bar} bar</div>
                        <div className="text-[10px]" style={{ color: muted }}>
                          {(Number(bar) / 3).toFixed(2)}× plage
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg border px-3 py-3 text-xs" style={{ borderColor: border }}>
                    <div className="font-semibold">Préparation {sensor} bar</div>
                    <div className="mt-1" style={{ color: muted }}>
                      Ratio indicatif : ×{sensorRatio.toFixed(2)} · maps potentiellement concernées : {affectedSensorMaps.length}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-4" style={{ borderColor: border, background: card }}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold">Maps potentiellement liées</div>
                    <span className="text-[10px]" style={{ color: muted }}>{affectedSensorMaps.length}</span>
                  </div>
                  <div className="mt-3 space-y-2 max-h-72 overflow-auto">
                    {affectedSensorMaps.slice(0, 20).map((map) => (
                      <button
                        type="button"
                        key={map.address}
                        onClick={() => onOpenMap(map)}
                        className="w-full rounded-lg border px-3 py-2 text-left hover:bg-white/5"
                        style={{ borderColor: border }}
                      >
                        <div className="text-xs font-semibold">{map.name}</div>
                        <div className="text-[10px] font-mono" style={{ color: muted }}>
                          0x{map.address.toString(16).toUpperCase()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === "doctor" && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">Map Doctor</div>
                    <div className="text-[11px]" style={{ color: muted }}>
                      Contrôle de structure et état des modifications.
                    </div>
                  </div>
                  <Search className="h-4 w-4 opacity-50" />
                </div>

                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Rechercher une map ou une adresse…"
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-xs outline-none"
                  style={{ borderColor: border }}
                />

                <div className="grid gap-2 md:grid-cols-2">
                  {filteredMaps.slice(0, 30).map((map) => {
                    const dims = map.dimensions?.TwoDimensional
                      ? map.dimensions.TwoDimensional.rows + "×" + map.dimensions.TwoDimensional.cols
                      : map.dimensions?.OneDimensional
                        ? map.dimensions.OneDimensional.length + "×1"
                        : "dimensions inconnues";
                    const changedCount = Object.keys(modifications.get(map.address) || {}).length;
                    const structural = map.size > 0 && (map.dimensions?.TwoDimensional?.rows ?? 1) > 0;

                    return (
                      <div key={map.address} className="rounded-xl border p-3" style={{ borderColor: border, background: card }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold">{map.name}</div>
                            <div className="text-[10px] font-mono" style={{ color: muted }}>
                              0x{map.address.toString(16).toUpperCase()} · {dims}
                            </div>
                          </div>
                          {structural
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span style={{ color: muted }}>{changedCount} cellule(s) modifiée(s)</span>
                          <button type="button" onClick={() => onOpenMap(map)} className="rounded-md border px-2 py-1 font-semibold" style={{ borderColor: border }}>
                            Ouvrir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {tab === "snapshots" && (
              <>
                <div className="rounded-xl border p-4" style={{ borderColor: border, background: card }}>
                  <div className="flex items-center gap-2 font-bold">
                    <Save className="h-4 w-4 text-violet-400" />
                    Snapshot de calibration
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: muted }}>
                    Sauvegarde non destructive des modifications actuelles dans un fichier JSON.
                  </div>
                  <input
                    value={snapshotName}
                    onChange={(e) => setSnapshotName(e.target.value)}
                    className="mt-4 w-full rounded-lg border bg-transparent px-3 py-2 text-xs outline-none"
                    style={{ borderColor: border }}
                  />
                  <button
                    type="button"
                    onClick={saveSnapshot}
                    className="mt-3 rounded-lg px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-500"
                  >
                    <Download className="mr-2 inline h-4 w-4" />
                    Sauvegarder le snapshot
                  </button>
                  {savedMessage && <div className="mt-3 text-xs text-emerald-400">{savedMessage}</div>}
                </div>
                <div className="rounded-xl border p-4" style={{ borderColor: border, background: card }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold">Snapshots disponibles</div>
                      <div className="text-[10px]" style={{ color: muted }}>Restauration en mémoire, avec historique Undo.</div>
                    </div>
                    <button type="button" onClick={refreshStoredSnapshots} className="rounded-lg border px-3 py-2 text-[10px] font-semibold" style={{ borderColor: border }}>
                      Actualiser
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {storedSnapshots.length === 0 ? (
                      <div className="text-[11px]" style={{ color: muted }}>Aucun snapshot trouvé pour ce fichier.</div>
                    ) : storedSnapshots.map((snapshot) => (
                      <div key={snapshot.key} className="flex items-center gap-3 rounded-lg border px-3 py-2" style={{ borderColor: border }}>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">{snapshot.name}</div>
                          <div className="text-[10px] font-mono" style={{ color: muted }}>{snapshot.createdAt} · {snapshot.modifications.length} maps</div>
                        </div>
                        <button type="button" onClick={() => restoreSnapshot(snapshot)} disabled={!onRestoreSnapshot}
                          className="rounded-lg px-3 py-2 text-[10px] font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 disabled:opacity-40">
                          Restaurer
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="rounded-xl border p-3 text-[10px]" style={{ borderColor: border, color: muted }}>
              Ces contrôles servent à repérer les incohérences évidentes avant export. Ils ne remplacent pas une validation réelle du véhicule.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
