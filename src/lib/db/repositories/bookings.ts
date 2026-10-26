import { differenceInCalendarDays } from "date-fns";
import { ADVANCE_BOOKING_DAYS, MAX_PASSENGERS, QUOTA_INFO, SENIOR_AGE } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { quoteCancellation } from "@/lib/rules/cancellation";
import { bookingTotals } from "@/lib/rules/fare";
import { describeSeat, pickSeat, racUsed, seatsAvailable, wlUsed } from "@/lib/rules/inventory";
import { generateBookingId, generatePaymentReference, generatePnr, nowIso, parseDateKey, uid } from "@/lib/utils";
import type {
  BerthPreference,
  Booking,
  BookingPassenger,
  BookingStatus,
  BookingWithPassengers,
  ClassCode,
  Gender,
  PassengerStatus,
  Payment,
  PaymentMethodType,
  Quota,
  SeatInventory,
} from "@/types";
import { getDb } from "../database";
import { peekInventory } from "./inventory";
import { buildJourney, getTrain } from "./trains";

export interface BookingPassengerInput {
  fullName: string;
  age: number;
  gender: Gender;
  berthPreference: BerthPreference;
}

export interface CreateBookingInput {
  userId: string;
  attemptId: string;
  trainId: string;
  fromCode: string;
  toCode: string;
  journeyDate: string;
  classCode: ClassCode;
  quota: Quota;
  passengers: BookingPassengerInput[];
  bookOnlyIfConfirmed: boolean;
  /** Total the user agreed to pay; booking fails if the fare changed meanwhile. */
  expectedTotal: number;
  payment: { methodType: PaymentMethodType; methodLabel: string };
}

function deriveStatus(passengers: Pick<BookingPassenger, "currentStatus">[]): BookingStatus {
  const active = passengers.filter((p) => p.currentStatus !== "CAN");
  if (!active.length) return "CANCELLED";
  if (active.some((p) => p.currentStatus === "WL")) return "WAITING_LIST";
  if (active.some((p) => p.currentStatus === "RAC")) return "RAC";
  return "CONFIRMED";
}

function validateQuota(quota: Quota, passengers: BookingPassengerInput[]) {
  if (passengers.length < 1) throw new AppError("INVALID", "Add at least one passenger.");
  if (passengers.length > MAX_PASSENGERS) {
    throw new AppError("INVALID", `A maximum of ${MAX_PASSENGERS} passengers can be booked per ticket.`);
  }
  if (quota === "LD" && passengers.some((p) => p.gender !== "F")) {
    throw new AppError("INVALID", "Ladies quota can be used only when all passengers are female.");
  }
  if (quota === "SS" && passengers.some((p) => p.age < SENIOR_AGE[p.gender])) {
    throw new AppError("INVALID", "Senior Citizen quota requires men aged 60+ and women aged 58+.");
  }
  if (quota === "TQ" && passengers.length > 4) {
    throw new AppError("INVALID", "A maximum of 4 passengers is allowed on a Tatkal ticket.");
  }
}

function confirmPassenger(inv: SeatInventory, p: BookingPassenger, seatIndex: number) {
  const seat = describeSeat(inv.classCode, inv.seatOffset, seatIndex);
  inv.allocatedSeats.push(seatIndex);
  p.currentStatus = "CNF";
  p.currentPosition = null;
  p.queueSeq = null;
  p.seatIndex = seatIndex;
  p.coach = seat.coach;
  p.berthNumber = seat.berthNumber;
  p.berthType = seat.berthType;
}

/**
 * Moves waiting passengers forward after seats / RAC slots free up.
 * Queue order: pre-generated ("phantom") passengers first, then app passengers by queueSeq.
 * Runs inside the caller's transaction; returns booking ids whose passengers changed.
 */
async function fillVacancies(inv: SeatInventory): Promise<Set<string>> {
  const db = getDb();
  const touched = new Set<string>();
  const queue = async (status: "RAC" | "WL") =>
    (await db.bookingPassengers.where("[inventoryKey+currentStatus]").equals([inv.key, status]).toArray()).sort(
      (a, b) => (a.queueSeq ?? 0) - (b.queueSeq ?? 0),
    );

  // 1. Free seats → front of RAC, or front of WL when RAC is empty.
  while (seatsAvailable(inv) > 0 && (racUsed(inv) > 0 || wlUsed(inv) > 0)) {
    const fromRac = racUsed(inv) > 0;
    if (fromRac ? inv.phantomRac > 0 : inv.phantomWl > 0) {
      if (fromRac) inv.phantomRac--;
      else inv.phantomWl--;
      inv.phantomConfirmed++;
      continue;
    }
    const front = (await queue(fromRac ? "RAC" : "WL"))[0];
    if (!front) break; // counters out of sync — never loop forever
    const seat = pickSeat(inv, front.berthPreference);
    if (seat === null) break;
    if (fromRac) inv.racCount--;
    else inv.wlCount--;
    confirmPassenger(inv, front, seat);
    await db.bookingPassengers.put(front);
    touched.add(front.bookingId);
  }

  // 2. Free RAC slots → front of WL.
  while (racUsed(inv) < inv.racCapacity && wlUsed(inv) > 0) {
    if (inv.phantomWl > 0) {
      inv.phantomWl--;
      inv.phantomRac++;
      continue;
    }
    const front = (await queue("WL"))[0];
    if (!front) break;
    inv.wlCount--;
    inv.racCount++;
    front.currentStatus = "RAC";
    front.queueSeq = ++inv.queueCounter;
    await db.bookingPassengers.put(front);
    touched.add(front.bookingId);
  }

  // 3. Renumber queue positions.
  for (const [status, phantom] of [
    ["RAC", inv.phantomRac],
    ["WL", inv.phantomWl],
  ] as const) {
    const list = await queue(status);
    for (let i = 0; i < list.length; i++) {
      const position = phantom + i + 1;
      if (list[i].currentPosition !== position) {
        list[i].currentPosition = position;
        await db.bookingPassengers.put(list[i]);
        touched.add(list[i].bookingId);
      }
    }
  }
  return touched;
}

async function refreshBookingStatuses(bookingIds: Iterable<string>) {
  const db = getDb();
  for (const id of bookingIds) {
    const passengers = await db.bookingPassengers.where("bookingId").equals(id).toArray();
    const booking = await db.bookings.get(id);
    if (!booking || booking.status === "CANCELLED") continue;
    const status = deriveStatus(passengers);
    if (status !== booking.status) await db.bookings.update(id, { status, updatedAt: nowIso() });
  }
}

const BOOKING_TABLES = () => {
  const db = getDb();
  return [
    db.bookings,
    db.bookingPassengers,
    db.seatInventory,
    db.payments,
    db.trains,
    db.trainRoutes,
    db.trainSchedules,
  ];
};

/**
 * Confirms a booking atomically. Everything — the availability check, seat allocation,
 * inventory update, booking + passengers + payment rows — happens in one IndexedDB
 * read-write transaction, which IndexedDB serialises against any other booking in any tab.
 * That is what stops the last seat from being sold twice.
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const db = getDb();
  validateQuota(input.quota, input.passengers);

  return db.transaction("rw", BOOKING_TABLES(), async () => {
    // Idempotency: retrying the same checkout attempt returns the original booking.
    const prior = await db.bookings.where("attemptId").equals(input.attemptId).first();
    if (prior) return prior;

    const train = await getTrain(input.trainId);
    if (!train) throw new AppError("NOT_FOUND", "This train is no longer available.");
    const journey = await buildJourney(train, input.fromCode, input.toCode, input.journeyDate, input.quota);
    if (!journey) throw new AppError("INVALID", "This train does not run on the selected date for this journey.");
    if (journey.departed) throw new AppError("INVALID", "This train has already departed.");
    const ahead = differenceInCalendarDays(parseDateKey(input.journeyDate), new Date());
    if (ahead > ADVANCE_BOOKING_DAYS) {
      throw new AppError("INVALID", `Bookings open ${ADVANCE_BOOKING_DAYS} days before the journey.`);
    }
    const offer = journey.classes.find((c) => c.code === input.classCode);
    if (!offer) throw new AppError("INVALID", `Class ${input.classCode} is not offered on this train.`);

    const fares = input.passengers.map(() => offer.fare);
    const totals = bookingTotals(fares);
    if (Math.abs(totals.totalAmount - input.expectedTotal) > 0.009) {
      throw new AppError(
        "AVAILABILITY_CHANGED",
        "The fare for this journey changed while you were booking. Please review the new fare.",
      );
    }

    const inv = await peekInventory(train, journey.startDate, input.classCode, input.quota);
    const bookingId = generateBookingId();
    const passengers: BookingPassenger[] = [];

    for (const [i, p] of input.passengers.entries()) {
      const record: BookingPassenger = {
        id: uid(),
        bookingId,
        inventoryKey: inv.key,
        serial: i + 1,
        fullName: p.fullName.trim(),
        age: p.age,
        gender: p.gender,
        berthPreference: p.berthPreference,
        fare: fares[i],
        bookingStatus: "CNF",
        bookingPosition: null,
        currentStatus: "CNF",
        currentPosition: null,
        queueSeq: null,
        seatIndex: null,
        coach: null,
        berthNumber: null,
        berthType: null,
      };
      const seat = seatsAvailable(inv) > 0 ? pickSeat(inv, p.berthPreference) : null;
      if (seat !== null) {
        confirmPassenger(inv, record, seat);
      } else if (racUsed(inv) < inv.racCapacity) {
        inv.racCount++;
        record.currentStatus = record.bookingStatus = "RAC";
        record.currentPosition = record.bookingPosition = racUsed(inv);
        record.queueSeq = ++inv.queueCounter;
      } else if (wlUsed(inv) < inv.wlCapacity) {
        inv.wlCount++;
        record.currentStatus = record.bookingStatus = "WL";
        record.currentPosition = record.bookingPosition = wlUsed(inv);
        record.queueSeq = ++inv.queueCounter;
      } else {
        throw new AppError(
          "INSUFFICIENT_AVAILABILITY",
          `Not enough seats or waiting-list slots left in ${input.classCode} (${QUOTA_INFO[input.quota].label}) for ${input.passengers.length} passenger(s).`,
        );
      }
      passengers.push(record);
    }

    if (input.bookOnlyIfConfirmed && passengers.some((p) => p.currentStatus !== "CNF")) {
      throw new AppError(
        "AVAILABILITY_CHANGED",
        "Confirmed berths are no longer available for all passengers, and you chose to book only if confirmed.",
      );
    }

    let pnr = generatePnr();
    while (await db.bookings.where("pnr").equals(pnr).count()) pnr = generatePnr();

    const now = nowIso();
    const paymentId = uid();
    const booking: Booking = {
      id: bookingId,
      pnr,
      userId: input.userId,
      trainId: train.id,
      trainNumber: train.number,
      trainName: train.name,
      fromCode: input.fromCode,
      toCode: input.toCode,
      journeyDate: input.journeyDate,
      trainStartDate: journey.startDate,
      departureTime: journey.from.departure!,
      arrivalTime: journey.to.arrival!,
      departureAt: journey.departureAt,
      arrivalAt: journey.arrivalAt,
      distanceKm: journey.distanceKm,
      classCode: input.classCode,
      quota: input.quota,
      inventoryKey: inv.key,
      passengerCount: passengers.length,
      ...totals,
      status: deriveStatus(passengers),
      paymentId,
      attemptId: input.attemptId,
      createdAt: now,
      updatedAt: now,
    };
    const payment: Payment = {
      id: paymentId,
      userId: input.userId,
      attemptId: input.attemptId,
      bookingId,
      methodType: input.payment.methodType,
      methodLabel: input.payment.methodLabel,
      amount: totals.totalAmount,
      status: "SUCCESS",
      reference: generatePaymentReference(),
      createdAt: now,
    };

    inv.updatedAt = now;
    await db.seatInventory.put(inv);
    await db.bookings.add(booking);
    await db.bookingPassengers.bulkAdd(passengers);
    await db.payments.add(payment);
    return booking;
  });
}

/** Records a payment that never resulted in a booking (declined, or reversed after a failed booking). */
export async function recordUnbookedPayment(params: {
  userId: string;
  attemptId: string;
  amount: number;
  methodType: PaymentMethodType;
  methodLabel: string;
  status: "FAILED" | "REVERSED";
  failureReason: string;
}): Promise<Payment> {
  const payment: Payment = {
    id: uid(),
    bookingId: null,
    reference: generatePaymentReference(),
    createdAt: nowIso(),
    ...params,
  };
  await getDb().payments.add(payment);
  return payment;
}

export async function getBooking(id: string): Promise<BookingWithPassengers | undefined> {
  const db = getDb();
  const booking = await db.bookings.get(id);
  if (!booking) return undefined;
  const passengers = await db.bookingPassengers.where("bookingId").equals(id).sortBy("serial");
  return { ...booking, passengers };
}

export async function getPayment(id: string) {
  return getDb().payments.get(id);
}

export async function listUserBookings(userId: string): Promise<Booking[]> {
  const items = await getDb().bookings.where("userId").equals(userId).toArray();
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function cancelBooking(params: {
  bookingId: string;
  userId: string;
  isAdmin?: boolean;
}): Promise<Booking> {
  const db = getDb();
  return db.transaction("rw", BOOKING_TABLES(), async () => {
    const booking = await getBooking(params.bookingId);
    if (!booking) throw new AppError("NOT_FOUND", "Booking not found.");
    if (booking.userId !== params.userId && !params.isAdmin) {
      throw new AppError("FORBIDDEN", "You can only cancel your own bookings.");
    }
    const quote = quoteCancellation(booking);
    if (!quote.eligible) throw new AppError("NOT_CANCELLABLE", quote.reason ?? "This booking cannot be cancelled.");

    const inv = await db.seatInventory.get(booking.inventoryKey);
    if (!inv) throw new AppError("NOT_FOUND", "Seat inventory for this booking is missing.");

    // Remove this booking's passengers from seats / queues first, so that the
    // promotion step can never promote a passenger of the booking being cancelled.
    const releasedSeats = new Set<number>();
    for (const p of booking.passengers) {
      const previous: PassengerStatus = p.currentStatus;
      if (previous === "CAN") continue;
      if (previous === "CNF" && p.seatIndex !== null) releasedSeats.add(p.seatIndex);
      if (previous === "RAC") inv.racCount--;
      if (previous === "WL") inv.wlCount--;
      p.currentStatus = "CAN";
      p.currentPosition = null;
      p.queueSeq = null;
      await db.bookingPassengers.put(p);
    }
    inv.allocatedSeats = inv.allocatedSeats.filter((s) => !releasedSeats.has(s));

    const touched = await fillVacancies(inv);
    touched.delete(booking.id);
    inv.updatedAt = nowIso();
    await db.seatInventory.put(inv);
    await refreshBookingStatuses(touched);

    const cancellation = {
      cancelledAt: nowIso(),
      charges: quote.charges,
      refundAmount: quote.refundAmount,
    };
    await db.bookings.update(booking.id, { status: "CANCELLED", cancellation, updatedAt: cancellation.cancelledAt });
    await db.payments.update(booking.paymentId, { status: "REFUNDED", refundAmount: quote.refundAmount });
    return { ...booking, status: "CANCELLED" as const, cancellation };
  });
}

export async function getInventorySnapshot(key: string) {
  return getDb().seatInventory.get(key);
}

export async function adminStats() {
  const db = getDb();
  const [trains, routes, users, bookings] = await Promise.all([
    db.trains.count(),
    db.trainRoutes.count(),
    db.users.where("role").equals("user").count(),
    db.bookings.toArray(),
  ]);
  const byStatus = { CONFIRMED: 0, RAC: 0, WAITING_LIST: 0, CANCELLED: 0 } as Record<BookingStatus, number>;
  let revenue = 0;
  for (const b of bookings) {
    byStatus[b.status]++;
    revenue += b.status === "CANCELLED" ? b.totalAmount - (b.cancellation?.refundAmount ?? 0) : b.totalAmount;
  }
  const latest = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  return { trains, routes, users, bookings: bookings.length, byStatus, revenue, latest };
}
