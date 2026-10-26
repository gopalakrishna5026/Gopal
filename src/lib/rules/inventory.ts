/**
 * SIMULATED seat-inventory rules. These are deliberately simplified and are not
 * how Indian Railways' PRS works. See README → "Simulation rules".
 *
 * - Each class's seats are split across quotas (GN 70%, TQ 15%, LD 5%, SS 10%).
 * - Seats taken by "other passengers" are generated deterministically from a hash of
 *   (train, date, class, quota), so the same search always shows the same numbers.
 * - Only berth classes (2A, 3A, SL) have RAC. Waiting list is capped per bucket.
 * - Queues are FIFO: pre-generated passengers are always ahead of passengers
 *   booked in this app.
 */
import { differenceInCalendarDays } from "date-fns";
import { CLASS_INFO, QUOTA_INFO, QUOTAS } from "@/lib/constants";
import { hashString, parseDateKey } from "@/lib/utils";
import type {
  Availability,
  BerthPreference,
  ClassCode,
  Quota,
  SeatInventory,
} from "@/types";

export function inventoryKey(
  trainId: string,
  startDate: string,
  classCode: ClassCode,
  quota: Quota,
): string {
  return `${trainId}|${startDate}|${classCode}|${quota}`;
}

export function quotaSplit(totalSeats: number): Record<Quota, { offset: number; capacity: number }> {
  const tq = Math.floor(totalSeats * QUOTA_INFO.TQ.share);
  const ld = Math.floor(totalSeats * QUOTA_INFO.LD.share);
  const ss = Math.floor(totalSeats * QUOTA_INFO.SS.share);
  const gn = totalSeats - tq - ld - ss;
  const sizes: Record<Quota, number> = { GN: gn, TQ: tq, LD: ld, SS: ss };
  let offset = 0;
  const out = {} as Record<Quota, { offset: number; capacity: number }>;
  for (const q of QUOTAS) {
    out[q] = { offset, capacity: sizes[q] };
    offset += sizes[q];
  }
  return out;
}

/** Builds the initial (never-booked-in-app) state of an inventory bucket. */
export function createDefaultInventory(params: {
  trainId: string;
  startDate: string;
  classCode: ClassCode;
  quota: Quota;
  totalSeats: number;
  today?: Date;
}): SeatInventory {
  const { trainId, startDate, classCode, quota, totalSeats } = params;
  const key = inventoryKey(trainId, startDate, classCode, quota);
  const { offset, capacity } = quotaSplit(totalSeats)[quota];
  const racCapacity = CLASS_INFO[classCode].hasRac && capacity >= 10 ? Math.round(capacity * 0.1) : 0;
  const wlCapacity = capacity === 0 ? 0 : Math.max(5, Math.round(capacity * 0.25));

  const daysAhead = differenceInCalendarDays(parseDateKey(startDate), params.today ?? new Date());
  let demand = 0.35 + ((hashString(key) % 1000) / 1000) * 0.85;
  if (daysAhead <= 2) demand += 0.2;
  else if (daysAhead > 30) demand -= 0.25;
  if (quota === "TQ") demand += 0.15;
  demand = Math.min(1.6, Math.max(0.05, demand));

  const demandSeats = Math.round(demand * capacity);
  const phantomConfirmed = Math.min(capacity, demandSeats);
  const overflow = Math.max(0, demandSeats - capacity);
  const phantomRac = Math.min(overflow, racCapacity);
  const phantomWl = Math.min(Math.max(0, overflow - racCapacity), wlCapacity);

  return {
    key,
    trainId,
    startDate,
    classCode,
    quota,
    seatOffset: offset,
    capacity,
    racCapacity,
    wlCapacity,
    phantomConfirmed,
    phantomRac,
    phantomWl,
    allocatedSeats: [],
    racCount: 0,
    wlCount: 0,
    queueCounter: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function seatsAvailable(inv: SeatInventory): number {
  return Math.max(0, inv.capacity - inv.phantomConfirmed - inv.allocatedSeats.length);
}

export function racUsed(inv: SeatInventory): number {
  return inv.phantomRac + inv.racCount;
}

export function wlUsed(inv: SeatInventory): number {
  return inv.phantomWl + inv.wlCount;
}

export function getAvailability(inv: SeatInventory): Availability {
  const available = seatsAvailable(inv);
  if (available > 0) {
    return { kind: "AVAILABLE", count: available, label: `AVAILABLE ${available}` };
  }
  if (racUsed(inv) < inv.racCapacity) {
    const next = racUsed(inv) + 1;
    return { kind: "RAC", count: next, label: `RAC ${pad(next)}` };
  }
  if (wlUsed(inv) < inv.wlCapacity) {
    const next = wlUsed(inv) + 1;
    return { kind: "WL", count: next, label: `WL ${pad(next)}` };
  }
  return { kind: "NOT_AVAILABLE", count: 0, label: "NOT AVAILABLE" };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export interface SeatLabel {
  coach: string;
  berthNumber: number;
  berthType: string;
}

export function describeSeat(classCode: ClassCode, seatOffset: number, relIndex: number): SeatLabel {
  const info = CLASS_INFO[classCode];
  const absolute = seatOffset + relIndex;
  const coachNo = Math.floor(absolute / info.seatsPerCoach) + 1;
  const berthNumber = (absolute % info.seatsPerCoach) + 1;
  return {
    coach: `${info.coachPrefix}${coachNo}`,
    berthNumber,
    berthType: info.berthCycle[(berthNumber - 1) % info.berthCycle.length],
  };
}

/**
 * Picks a free seat index honouring the berth preference when possible.
 * The lowest `phantomConfirmed` free indices are treated as held by other passengers.
 * Returns null when no seat is free.
 */
export function pickSeat(inv: SeatInventory, preference: BerthPreference): number | null {
  const taken = new Set(inv.allocatedSeats);
  let phantomToSkip = inv.phantomConfirmed;
  let fallback: number | null = null;
  for (let i = 0; i < inv.capacity; i++) {
    if (taken.has(i)) continue;
    if (phantomToSkip > 0) {
      phantomToSkip--;
      continue;
    }
    if (preference === "NP") return i;
    if (describeSeat(inv.classCode, inv.seatOffset, i).berthType === preference) return i;
    if (fallback === null) fallback = i;
  }
  return fallback;
}
