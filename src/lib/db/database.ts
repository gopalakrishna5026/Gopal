import Dexie, { type EntityTable } from "dexie";
import type {
  Booking,
  BookingPassenger,
  PaymentMethod,
  Payment,
  SavedPassenger,
  SeatInventory,
  Station,
  Train,
  TrainRoute,
  TrainSchedule,
  User,
} from "@/types";

export interface MetaRecord {
  key: string;
  value: string;
}

export class RailYatraDB extends Dexie {
  users!: EntityTable<User, "id">;
  stations!: EntityTable<Station, "code">;
  trains!: EntityTable<Train, "id">;
  trainRoutes!: EntityTable<TrainRoute, "id">;
  trainSchedules!: EntityTable<TrainSchedule, "id">;
  seatInventory!: EntityTable<SeatInventory, "key">;
  passengers!: EntityTable<SavedPassenger, "id">;
  paymentMethods!: EntityTable<PaymentMethod, "id">;
  bookings!: EntityTable<Booking, "id">;
  bookingPassengers!: EntityTable<BookingPassenger, "id">;
  payments!: EntityTable<Payment, "id">;
  meta!: EntityTable<MetaRecord, "key">;

  constructor() {
    super("railyatra");

    // v1 — initial schema. Only indexed fields are listed; other fields are stored as-is.
    this.version(1).stores({
      users: "id, &email, role",
      stations: "code, name, city",
      trains: "id, &number, sourceCode, destinationCode, type",
      trainRoutes: "id, &trainId",
      trainSchedules: "id, &trainId",
      seatInventory: "key, trainId, [trainId+startDate]",
      passengers: "id, userId",
      paymentMethods: "id, userId",
      bookings: "id, &pnr, &attemptId, userId, trainId, status, journeyDate",
      bookingPassengers: "id, bookingId, inventoryKey, [inventoryKey+currentStatus]",
      payments: "id, userId, attemptId, bookingId",
      meta: "key",
    });

    // v2 — migration example: index stop codes on routes for intermediate-station
    // search and backfill the derived field on existing rows.
    this.version(2)
      .stores({
        trainRoutes: "id, &trainId, *stationCodes",
      })
      .upgrade(async (tx) => {
        await tx
          .table("trainRoutes")
          .toCollection()
          .modify((route: TrainRoute) => {
            route.stationCodes = route.stops.map((s) => s.stationCode);
          });
      });
  }
}

let instance: RailYatraDB | null = null;

/** Lazily creates the DB so nothing touches IndexedDB during server rendering. */
export function getDb(): RailYatraDB {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!instance) instance = new RailYatraDB();
  return instance;
}
