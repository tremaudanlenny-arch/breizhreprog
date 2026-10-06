export interface VagtunerPack {
  id: string;
  name: string;
  ecu: string;
  vehicles: string[];
  mapCount: number;
}

export const VAGTUNER_PACKS: VagtunerPack[] = [
  {
    id: "bmw-330d-e46-edc15c4",
    name: "BMW 330D E46 184ch EDC15C4",
    ecu: "EDC15C4",
    vehicles: ["BMW 330D", "E46", "184"],
    mapCount: 32,
  },
  {
    id: "golf-4-tdi130-edc15p",
    name: "Golf 4 TDI130 EDC15P+",
    ecu: "EDC15P+",
    vehicles: ["Golf 4", "TDI130", "1.9 TDI", "130"],
    mapCount: 38,
  },
  {
    id: "ibiza-tdi130-edc15p",
    name: "Ibiza TDI130 EDC15P+",
    ecu: "EDC15P+",
    vehicles: ["Ibiza", "TDI130", "1.9 TDI", "130"],
    mapCount: 212,
  },
  {
    id: "golf-5-tdi105-edc16u1",
    name: "Golf 5 TDI105 EDC16U1",
    ecu: "EDC16U1",
    vehicles: ["Golf 5", "TDI105", "1.9 TDI", "105"],
    mapCount: 62,
  },
];

export function detectVagtunerVehicleHint(project: {
  project_name?: string;
  file_name?: string;
  original_name?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  engine_type?: string;
  ecu_type?: string;
}): { label: string; exact: boolean } {
  const text = [
    project.project_name,
    project.file_name,
    project.original_name,
    project.vehicle_brand,
    project.vehicle_model,
    project.engine_type,
    project.ecu_type,
  ].filter(Boolean).join(" ").toLowerCase();

  if (/(2\.0|2,0).*hdi.*90|hdi.*90.*(2\.0|2,0)/i.test(text)) {
    return { label: "2.0 HDi 90", exact: false };
  }
  if (/golf\s*4.*130|tdi\s*130.*golf\s*4/i.test(text)) {
    return { label: "Golf 4 TDI 130", exact: true };
  }
  if (/ibiza.*130|130.*ibiza/i.test(text)) {
    return { label: "Ibiza TDI 130", exact: true };
  }
  if (/golf\s*5.*105|tdi\s*105.*golf\s*5/i.test(text)) {
    return { label: "Golf 5 TDI 105", exact: true };
  }
  if (/330d.*e46|e46.*330d/i.test(text)) {
    return { label: "BMW 330D E46 184", exact: true };
  }

  return { label: project.ecu_type || "ECU non identifié", exact: false };
}

export function scoreVagtunerPack(pack: VagtunerPack, project: Parameters<typeof detectVagtunerVehicleHint>[0]): number {
  const text = [
    project.project_name,
    project.file_name,
    project.original_name,
    project.vehicle_brand,
    project.vehicle_model,
    project.engine_type,
    project.ecu_type,
  ].filter(Boolean).join(" ").toLowerCase();

  let score = 0;
  if (text.includes(pack.ecu.toLowerCase())) score += 4;
  for (const key of pack.vehicles) {
    if (text.includes(key.toLowerCase())) score += 2;
  }
  return score;
}
