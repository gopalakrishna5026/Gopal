/**
 * SIMULATED cancellation rules (simplified; not official railway refund rules).
 *
 * Confirmed passengers (by time left before departure from the boarding station):
 *   > 48 h      → flat class charge (1A ₹240, 2A ₹200, 3A/CC ₹180, SL ₹120, 2S ₹60)
 *   48 h – 12 h → 25% of fare (minimum the flat charge)
 *   12 h – 4 h  → 50% of fare (minimum the flat charge)
 *   < 4 h       → no refund
 *   Tatkal      → no refund for confirmed passengers
 * RAC / Waiting list passengers: ₹60 clerkage per passenger.
 * Convenience fee is never refunded. Online cancellation closes 30 min before departure.
 */
import { CLASS_INFO, RAC_CLERKAGE } from "@/lib/constants";
import type { BookingWithPassengers } from "@/types";

export interface CancellationQuote {
  eligible: boolean;
  reason?: string;
  hoursToDeparture: number;
  lines: { passengerId: string; name: string; status: string; fare: number; charge: number }[];
  charges: number;
  refundAmount: number;
  ruleApplied: string;
}

export function quoteCancellation(booking: BookingWithPassengers, now = new Date()): CancellationQuote {
  const hours = (new Date(booking.departureAt).getTime() - now.getTime()) / 3_600_000;
  const base: CancellationQuote = {
    eligible: false,
    hoursToDeparture: hours,
    lines: [],
    charges: 0,
    refundAmount: 0,
    ruleApplied: "",
  };

  if (booking.status === "CANCELLED") return { ...base, reason: "This booking is already cancelled." };
  if (hours < 0.5) {
    return {
      ...base,
      reason: "Online cancellation closes 30 minutes before departure.",
    };
  }

  const flat = CLASS_INFO[booking.classCode].minCancellationCharge;
  let rule: string;
  const confirmedCharge = (fare: number): number => {
    if (booking.quota === "TQ") return fare;
    if (hours > 48) return Math.min(fare, flat);
    if (hours > 12) return Math.min(fare, Math.max(fare * 0.25, flat));
    if (hours > 4) return Math.min(fare, Math.max(fare * 0.5, flat));
    return fare;
  };
  if (booking.quota === "TQ") rule = "Confirmed Tatkal tickets are non-refundable";
  else if (hours > 48) rule = `More than 48 h before departure — flat ₹${flat} per confirmed passenger`;
  else if (hours > 12) rule = "48–12 h before departure — 25% of fare (min. flat charge)";
  else if (hours > 4) rule = "12–4 h before departure — 50% of fare (min. flat charge)";
  else rule = "Less than 4 h before departure — no refund on confirmed berths";

  const lines = booking.passengers
    .filter((p) => p.currentStatus !== "CAN")
    .map((p) => {
      const charge =
        p.currentStatus === "CNF" ? confirmedCharge(p.fare) : Math.min(p.fare, RAC_CLERKAGE);
      return {
        passengerId: p.id,
        name: p.fullName,
        status: p.currentStatus,
        fare: p.fare,
        charge: Math.round(charge),
      };
    });

  if (lines.some((l) => l.status !== "CNF")) {
    rule += `; ₹${RAC_CLERKAGE} clerkage per RAC/WL passenger`;
  }

  const charges = lines.reduce((s, l) => s + l.charge, 0);
  const fares = lines.reduce((s, l) => s + l.fare, 0);
  return {
    eligible: true,
    hoursToDeparture: hours,
    lines,
    charges,
    refundAmount: Math.max(0, fares - charges),
    ruleApplied: `${rule}. Convenience fee is non-refundable.`,
  };
}
