import { describe, expect, it } from "vitest";
import { quoteCancellation } from "./cancellation";
import { passengerFare, segmentFare } from "./fare";
import { createDefaultInventory, getAvailability, pickSeat, quotaSplit } from "./inventory";
import type { BookingWithPassengers } from "@/types";

describe("fare rules", () => {
  it("pro-rates by distance with a 20% floor", () => {
    expect(segmentFare(1000, 500, 1000)).toBe(500);
    expect(segmentFare(1000, 50, 1000)).toBe(200);
  });
  it("applies quota pricing", () => {
    expect(passengerFare(1000, "TQ")).toBe(1300);
    expect(passengerFare(1000, "SS")).toBe(600);
    expect(passengerFare(1000, "GN")).toBe(1000);
  });
});

describe("inventory rules", () => {
  it("splits every seat across quotas", () => {
    const split = quotaSplit(288);
    const total = Object.values(split).reduce((s, q) => s + q.capacity, 0);
    expect(total).toBe(288);
    expect(split.TQ.offset).toBe(split.GN.capacity);
  });
  it("is deterministic for the same bucket", () => {
    const args = { trainId: "t", startDate: "2030-01-10", classCode: "3A" as const, quota: "GN" as const, totalSeats: 288, today: new Date(2030, 0, 1) };
    expect(createDefaultInventory(args)).toMatchObject({ ...createDefaultInventory(args), updatedAt: expect.any(String) });
  });
  it("honours berth preference when a matching berth is free", () => {
    const inv = { ...createDefaultInventory({ trainId: "t", startDate: "2030-01-10", classCode: "SL", quota: "GN", totalSeats: 72 }), phantomConfirmed: 0 };
    expect(pickSeat(inv, "UB")).toBe(2); // berth 3 = UB in the SL cycle
    expect(pickSeat(inv, "SU")).toBe(7);
  });
  it("reports RAC / WL / not available", () => {
    const inv = { ...createDefaultInventory({ trainId: "t", startDate: "2030-01-10", classCode: "SL", quota: "GN", totalSeats: 100 }), capacity: 1, phantomConfirmed: 1, racCapacity: 2, phantomRac: 1, wlCapacity: 1, phantomWl: 0 };
    expect(getAvailability(inv)).toMatchObject({ kind: "RAC", label: "RAC 02" });
    expect(getAvailability({ ...inv, phantomRac: 2 })).toMatchObject({ kind: "WL", label: "WL 01" });
    expect(getAvailability({ ...inv, phantomRac: 2, phantomWl: 1 }).kind).toBe("NOT_AVAILABLE");
  });
});

describe("cancellation rules", () => {
  const booking = (hoursAhead: number, patch: Partial<BookingWithPassengers> = {}): BookingWithPassengers =>
    ({
      status: "CONFIRMED",
      quota: "GN",
      classCode: "SL",
      departureAt: new Date(Date.now() + hoursAhead * 3_600_000).toISOString(),
      convenienceFee: 35.4,
      passengers: [
        { id: "a", fullName: "A", fare: 1000, currentStatus: "CNF" },
        { id: "b", fullName: "B", fare: 1000, currentStatus: "WL" },
      ],
      ...patch,
    }) as BookingWithPassengers;

  it("charges a flat fee more than 48h out, clerkage for WL", () => {
    const q = quoteCancellation(booking(72));
    expect(q.charges).toBe(120 + 60);
    expect(q.refundAmount).toBe(2000 - 180);
  });
  it("charges 25% / 50% closer to departure", () => {
    expect(quoteCancellation(booking(24)).lines[0].charge).toBe(250);
    expect(quoteCancellation(booking(6)).lines[0].charge).toBe(500);
    expect(quoteCancellation(booking(2)).lines[0].charge).toBe(1000);
  });
  it("gives no refund on confirmed Tatkal", () => {
    expect(quoteCancellation(booking(72, { quota: "TQ" })).lines[0].charge).toBe(1000);
  });
  it("blocks cancelled bookings and departures within 30 minutes", () => {
    expect(quoteCancellation(booking(72, { status: "CANCELLED" })).eligible).toBe(false);
    expect(quoteCancellation(booking(0.2)).eligible).toBe(false);
  });
});
