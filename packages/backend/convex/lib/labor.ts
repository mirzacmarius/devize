import { isHourUnit } from "./text";

// The legal floor for an hour of labour in construction, so a Tarif or a line
// item's labour price below it is flagged before the Deviz goes out. The
// sector's minimum gross wage is 4.582 lei a month (OUG 156/2024, kept for
// 2026) for 165,334 hours a month on average; the Deviz adds CAM on top, so
// the floor is the gross wage alone.
export const laborFloor = {
  // From when the figures hold, as YYYY-MM-DD.
  from: "2025-01-01",
  monthlyGross: 4582,
  monthlyHours: 165.334,
  // Lei for one hour at the minimum, rounded to bani.
  hourly: Math.round((4582 / 165.334) * 100) / 100,
} as const;

/**
 * Whether a labour price is below the legal minimum for an hour of work. Only
 * labour counted in hours is compared; a price per m² or per piece says
 * nothing about the wage behind it.
 */
export function belowLaborFloor(resource: {
  kind: string;
  unit: string;
  unitPrice: number;
}): boolean {
  return (
    resource.kind === "labor" &&
    isHourUnit(resource.unit) &&
    resource.unitPrice > 0 &&
    resource.unitPrice < laborFloor.hourly
  );
}
