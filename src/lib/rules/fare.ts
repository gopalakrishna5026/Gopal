import { CONVENIENCE_FEE, SENIOR_DISCOUNT, TATKAL_MULTIPLIER } from "@/lib/constants";
import type { Quota } from "@/types";

/** Pro-rates a full-route fare to the travelled segment (min 20% of full fare). */
export function segmentFare(fullFare: number, segmentKm: number, totalKm: number): number {
  if (totalKm <= 0) return fullFare;
  const ratio = Math.max(0.2, Math.min(1, segmentKm / totalKm));
  return Math.round(fullFare * ratio);
}

export function passengerFare(segment: number, quota: Quota): number {
  switch (quota) {
    case "TQ":
      return Math.round(segment * TATKAL_MULTIPLIER);
    case "SS":
      return Math.round(segment * (1 - SENIOR_DISCOUNT));
    default:
      return segment;
  }
}

export function bookingTotals(fares: number[]) {
  const baseFare = fares.reduce((sum, f) => sum + f, 0);
  const convenienceFee = fares.length ? CONVENIENCE_FEE : 0;
  return {
    baseFare,
    convenienceFee,
    totalAmount: Math.round((baseFare + convenienceFee) * 100) / 100,
  };
}
