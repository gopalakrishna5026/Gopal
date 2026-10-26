import { DEMO_CREDENTIALS } from "@/lib/constants";
import { hashPassword } from "@/lib/utils/password";
import { nowIso, uid } from "@/lib/utils";
import type { RouteStop, Train, TrainRoute, TrainSchedule, User } from "@/types";
import type { RailYatraDB } from "./database";
import { SEED_TRAINS, STATIONS, type SeedTrain } from "./seed-data";

const SEED_VERSION = "1";

export function buildTrainRecords(seed: SeedTrain): {
  train: Train;
  route: TrainRoute;
  schedule: TrainSchedule;
} {
  const id = uid();
  const now = nowIso();
  const stops: RouteStop[] = seed.stops.map(([stationCode, arrival, departure, dayOffset, distanceKm]) => ({
    stationCode,
    arrival,
    departure,
    dayOffset,
    distanceKm,
  }));
  return {
    train: {
      id,
      number: seed.number,
      name: seed.name,
      type: seed.type,
      sourceCode: stops[0].stationCode,
      destinationCode: stops[stops.length - 1].stationCode,
      classes: seed.classes.map(([code, totalSeats, fare]) => ({ code, totalSeats, fare })),
      createdAt: now,
      updatedAt: now,
    },
    route: { id: uid(), trainId: id, stops, stationCodes: stops.map((s) => s.stationCode) },
    schedule: { id: uid(), trainId: id, runDays: seed.runDays },
  };
}

async function makeUser(
  data: Pick<User, "fullName" | "email" | "mobile" | "role">,
  password: string,
): Promise<User> {
  const { hash, salt } = await hashPassword(password);
  const now = nowIso();
  return { id: uid(), ...data, passwordHash: hash, passwordSalt: salt, createdAt: now, updatedAt: now };
}

/**
 * Seeds reference + demo data exactly once. A `meta.seedVersion` marker makes this
 * idempotent, so refreshes never reset records created by the user.
 */
export async function seedDatabase(db: RailYatraDB): Promise<void> {
  const marker = await db.meta.get("seedVersion");
  if (marker) return;

  const admin = await makeUser(
    { fullName: "Platform Admin", email: DEMO_CREDENTIALS.admin.email, mobile: "9000000001", role: "admin" },
    DEMO_CREDENTIALS.admin.password,
  );
  const demoUser = await makeUser(
    { fullName: "Priya Sharma", email: DEMO_CREDENTIALS.user.email, mobile: "9876543210", role: "user" },
    DEMO_CREDENTIALS.user.password,
  );

  const records = SEED_TRAINS.map(buildTrainRecords);
  const now = nowIso();

  await db.transaction(
    "rw",
    [db.meta, db.users, db.stations, db.trains, db.trainRoutes, db.trainSchedules, db.passengers, db.paymentMethods],
    async () => {
      // Re-check inside the transaction so two tabs opening simultaneously can't double-seed.
      if (await db.meta.get("seedVersion")) return;
      await db.stations.bulkPut(STATIONS);
      await db.trains.bulkAdd(records.map((r) => r.train));
      await db.trainRoutes.bulkAdd(records.map((r) => r.route));
      await db.trainSchedules.bulkAdd(records.map((r) => r.schedule));
      await db.users.bulkAdd([admin, demoUser]);
      await db.passengers.bulkAdd([
        {
          id: uid(),
          userId: demoUser.id,
          fullName: "Priya Sharma",
          age: 31,
          gender: "F",
          berthPreference: "LB",
          mobile: "9876543210",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uid(),
          userId: demoUser.id,
          fullName: "Rohan Sharma",
          age: 34,
          gender: "M",
          berthPreference: "UB",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uid(),
          userId: demoUser.id,
          fullName: "Kamla Devi",
          age: 64,
          gender: "F",
          berthPreference: "LB",
          createdAt: now,
          updatedAt: now,
        },
      ]);
      await db.paymentMethods.bulkAdd([
        {
          id: uid(),
          userId: demoUser.id,
          type: "UPI",
          label: "Personal UPI",
          upiId: "priya@okdemo",
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: uid(),
          userId: demoUser.id,
          type: "CREDIT_CARD",
          label: "Travel card",
          cardHolder: "PRIYA SHARMA",
          cardBrand: "Visa",
          last4: "1111",
          expiryMonth: 8,
          expiryYear: new Date().getFullYear() + 3,
          isDefault: false,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      await db.meta.put({ key: "seedVersion", value: SEED_VERSION });
    },
  );
}
