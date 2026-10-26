import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initDatabase, getDb } from "@/lib/db";
import { cancelBooking, createBooking, getBooking, type CreateBookingInput } from "@/lib/db/repositories/bookings";
import { createTrain, fareFor, getTrain } from "@/lib/db/repositories/trains";
import { registerUser } from "@/lib/db/repositories/users";
import { AppError } from "@/lib/errors";
import { bookingTotals } from "@/lib/rules/fare";
import { createDefaultInventory, getAvailability, inventoryKey } from "@/lib/rules/inventory";
import { shiftDateKey, todayKey, uid } from "@/lib/utils";
import type { SeatInventory, TrainWithDetails } from "@/types";

const JOURNEY_DATE = shiftDateKey(todayKey(), 7);
let userId: string;
let train: TrainWithDetails;
let trainSeq = 0;

beforeAll(async () => {
  await initDatabase();
  userId = (await registerUser({ fullName: "Test User", email: "t@test.dev", mobile: "9876500000", password: "Test@1234" })).id;
});

/** Fresh train per test, with a hand-set SL/GN inventory so outcomes are exact. */
beforeEach(async () => {
  trainSeq++;
  const id = await createTrain({
    number: String(90000 + trainSeq),
    name: `Test Express ${trainSeq}`,
    type: "Express",
    runDays: [0, 1, 2, 3, 4, 5, 6],
    classes: [{ code: "SL", totalSeats: 100, fare: 500 }],
    stops: [
      { stationCode: "NDLS", arrival: null, departure: "10:00", dayOffset: 0, distanceKm: 0 },
      { stationCode: "JP", arrival: "15:00", departure: null, dayOffset: 0, distanceKm: 300 },
    ],
  });
  train = (await getTrain(id))!;
});

async function setInventory(patch: Partial<SeatInventory>) {
  const base = createDefaultInventory({
    trainId: train.id,
    startDate: JOURNEY_DATE,
    classCode: "SL",
    quota: "GN",
    totalSeats: 100,
  });
  await getDb().seatInventory.put({
    ...base,
    phantomConfirmed: 0,
    phantomRac: 0,
    phantomWl: 0,
    ...patch,
  });
}

function bookingInput(passengers: number, overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  const fare = fareFor(train, "SL", "GN", "NDLS", "JP");
  return {
    userId,
    attemptId: uid(),
    trainId: train.id,
    fromCode: "NDLS",
    toCode: "JP",
    journeyDate: JOURNEY_DATE,
    classCode: "SL",
    quota: "GN",
    passengers: Array.from({ length: passengers }, (_, i) => ({
      fullName: `Passenger ${i + 1}`,
      age: 30 + i,
      gender: "F" as const,
      berthPreference: "NP" as const,
    })),
    bookOnlyIfConfirmed: false,
    expectedTotal: bookingTotals(Array.from({ length: passengers }, () => fare)).totalAmount,
    payment: { methodType: "UPI", methodLabel: "UPI · test@ok" },
    ...overrides,
  };
}

const key = () => inventoryKey(train.id, JOURNEY_DATE, "SL", "GN");
const inventory = async () => (await getDb().seatInventory.get(key()))!;

describe("seat inventory consistency", () => {
  it("sells the last seat exactly once when two checkouts race", async () => {
    await setInventory({ capacity: 1, racCapacity: 0, wlCapacity: 0 });

    const results = await Promise.allSettled([createBooking(bookingInput(1)), createBooking(bookingInput(1))]);

    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0].reason as AppError).code).toBe("INSUFFICIENT_AVAILABILITY");

    const inv = await inventory();
    expect(inv.allocatedSeats).toHaveLength(1);
    expect(getAvailability(inv).kind).toBe("NOT_AVAILABLE");
  });

  it("is idempotent for the same checkout attempt (no duplicate confirmation)", async () => {
    await setInventory({ capacity: 5 });
    const input = bookingInput(2);

    const [a, b] = await Promise.all([createBooking(input), createBooking(input)]);

    expect(a.id).toBe(b.id);
    expect(await getDb().bookings.where("attemptId").equals(input.attemptId).count()).toBe(1);
    expect((await inventory()).allocatedSeats).toHaveLength(2);
  });

  it("refuses when 'book only if confirmed' cannot be honoured, leaving inventory untouched", async () => {
    await setInventory({ capacity: 1, racCapacity: 2, wlCapacity: 2 });

    await expect(createBooking(bookingInput(2, { bookOnlyIfConfirmed: true }))).rejects.toMatchObject({
      code: "AVAILABILITY_CHANGED",
    });
    const inv = await inventory();
    expect(inv.allocatedSeats).toHaveLength(0);
    expect(inv.racCount).toBe(0);
  });

  it("allots CNF → RAC → WL in order and promotes the queue on cancellation", async () => {
    await setInventory({ capacity: 1, racCapacity: 1, wlCapacity: 2 });

    const a = await createBooking(bookingInput(1));
    const b = await createBooking(bookingInput(1));
    const c = await createBooking(bookingInput(1));
    expect([a.status, b.status, c.status]).toEqual(["CONFIRMED", "RAC", "WAITING_LIST"]);

    await cancelBooking({ bookingId: a.id, userId });

    const bAfter = (await getBooking(b.id))!;
    const cAfter = (await getBooking(c.id))!;
    expect(bAfter.status).toBe("CONFIRMED");
    expect(bAfter.passengers[0].coach).toMatch(/^S\d+$/);
    expect(cAfter.status).toBe("RAC");
    expect(cAfter.passengers[0].currentPosition).toBe(1);

    const inv = await inventory();
    expect(inv.allocatedSeats).toHaveLength(1);
    expect(inv.racCount).toBe(1);
    expect(inv.wlCount).toBe(0);
  });

  it("serves pre-generated queue passengers before app passengers", async () => {
    await setInventory({ capacity: 1, phantomConfirmed: 0, racCapacity: 1, phantomRac: 0, wlCapacity: 3, phantomWl: 0 });
    const a = await createBooking(bookingInput(1)); // CNF
    await getDb().seatInventory.update(key(), { phantomRac: 1 }); // someone else holds RAC 1
    await getDb().seatInventory.update(key(), { phantomWl: 1 }); // and WL 1
    const waiting = await createBooking(bookingInput(1)); // WL 2
    expect((await getBooking(waiting.id))!.passengers[0].currentPosition).toBe(2);

    await cancelBooking({ bookingId: a.id, userId });

    const inv = await inventory();
    expect(inv.phantomConfirmed).toBe(1); // phantom RAC got the seat
    expect(inv.phantomRac).toBe(1); // phantom WL moved up to RAC
    const after = (await getBooking(waiting.id))!;
    expect(after.passengers[0].currentStatus).toBe("WL");
    expect(after.passengers[0].currentPosition).toBe(1);
  });

  it("never lets inventory go negative across repeated cancel attempts", async () => {
    await setInventory({ capacity: 3 });
    const booking = await createBooking(bookingInput(2));
    await cancelBooking({ bookingId: booking.id, userId });
    await expect(cancelBooking({ bookingId: booking.id, userId })).rejects.toMatchObject({ code: "NOT_CANCELLABLE" });

    const inv = await inventory();
    expect(inv.allocatedSeats).toHaveLength(0);
    expect(getAvailability(inv)).toMatchObject({ kind: "AVAILABLE", count: 3 });
  });

  it("enforces quota eligibility", async () => {
    await setInventory({ capacity: 5 });
    const male = bookingInput(1, { quota: "LD" });
    male.passengers[0].gender = "M";
    await expect(createBooking(male)).rejects.toMatchObject({ code: "INVALID" });
  });

  it("rejects a booking whose fare changed since review", async () => {
    await setInventory({ capacity: 5 });
    await expect(createBooking(bookingInput(1, { expectedTotal: 1 }))).rejects.toMatchObject({
      code: "AVAILABILITY_CHANGED",
    });
  });
});
