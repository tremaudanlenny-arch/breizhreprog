import type { ExportMapData } from "./mappack-export";
import { isBigEndianEcu } from "./ecu-endianness";

type VtkpMap = Record<string, string | number | null>;

function hex(addr: number | null | undefined): string {
  if (!addr || addr <= 0) return "0";
  return Math.trunc(addr).toString(16).toUpperCase();
}

function num(v: number | null | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function factor(v: number | null | undefined): string {
  return num(v, 1).toString().replace(/\.0+$/, "");
}

function offset(v: number | null | undefined): string {
  return num(v, 0).toString();
}

function dims(m: ExportMapData) {
  const d = m.dimensions?.TwoDimensional;
  if (d) return { rows: d.rows, cols: d.cols };
  const one = m.dimensions?.OneDimensional;
  return { rows: one ? 1 : 1, cols: one?.length ?? 1 };
}

function dataTypeInfo(m: ExportMapData): { lecture: string; signed: string } {
  const dt = (m.data_type || "").toLowerCase();
  if (dt === "uint8" || dt === "int8") return { lecture: "8", signed: dt === "int8" ? "1" : "0" };
  return { lecture: "16", signed: dt === "int16" ? "1" : "0" };
}

/**
 * Export portable d'un mappack VAGTuner (.vtkp).
 * Le fichier contient uniquement les définitions, jamais la ROM.
 */
export function buildVagtunerMappack(
  maps: ExportMapData[],
  ecuType: string,
  sortMode: "address" | "name" | "name-desc" = "address",
): { Version: string; ExportDate: string; MapCount: number; Maps: VtkpMap[] } {
  const sorted = [...maps].sort((a, b) => {
    if (sortMode === "name") return (a.name || "").localeCompare(b.name || "");
    if (sortMode === "name-desc") return (b.name || "").localeCompare(a.name || "");
    return (a.address || 0) - (b.address || 0);
  });

  const endianness = isBigEndianEcu(ecuType) ? "BE" : "LE";

  const vtkpMaps = sorted.map((m) => {
    const { rows, cols } = dims(m);
    const { lecture, signed } = dataTypeInfo(m);
    return {
      Nom: m.name || "Map",
      Description: m.description || "-",
      Unite: m.unit || "-",
      Taille: cols + " x " + rows,
      Adresse: hex(m.address),
      Facteur: factor(m.correction_factor),
      Offset: offset(m.offset),
      AdresseX: hex(m.x_axis_address),
      FacteurX: factor(m.x_axis_correction),
      OffsetX: offset(m.x_axis_offset),
      UniteX: m.x_label || "-",
      AdresseY: hex(m.y_axis_address),
      FacteurY: factor(m.y_axis_correction),
      OffsetY: offset(m.y_axis_offset),
      UniteY: m.y_label || "-",
      PrecisionZ: 2,
      Endianness: endianness,
      Lecture: Number(lecture),
      ColonnesX: cols,
      LignesY: rows,
      Longueur: rows * cols,
      PrecisionX: 0,
      PrecisionY: 0,
      bSigned: Number(signed),
    } satisfies VtkpMap;
  });

  return {
    Version: "1.0",
    ExportDate: new Date().toISOString().slice(0, 19).replace("T", " "),
    MapCount: vtkpMaps.length,
    Maps: vtkpMaps,
  };
}

export function serializeVagtunerMappack(pack: ReturnType<typeof buildVagtunerMappack>): Uint8Array {
  const text = JSON.stringify(pack, null, 2).replace(/\n/g, "\r\n") + "\r\n";
  const bytes = new TextEncoder().encode("\uFEFF" + text);
  return bytes;
}

export function vagtunerMappackFileName(baseName: string): string {
  const safe = baseName.trim() || "project";
  return safe.endsWith(".vtkp") ? safe : safe + ".vtkp";
}
