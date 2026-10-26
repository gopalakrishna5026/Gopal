import { AppError } from "@/lib/errors";
import { createDefaultInventory, getAvailability, inventoryKey } from "@/lib/rules/inventory";
import type { Availability, ClassCode, Quota, SeatInventory, Train } from "@/types";
import { getDb } from "../database";

function totalSeatsFor(train: Train, classCode: ClassCode): number {
  const config = train.classes.find((c) => c.code === classCode);
  if (!config) throw new AppError("INVALID", `${train.number} does not have class ${classCode}.`);
  return config.totalSeats;
}

/** Reads a bucket without writing: stored state if it exists, else the deterministic default. */
export async function peekInventory(
  train: Train,
  startDate: string,
  classCode: ClassCode,
  quota: Quota,
): Promise<SeatInventory> {
  const key = inventoryKey(train.id, startDate, classCode, quota);
  const stored = await getDb().seatInventory.get(key);
  return (
    stored ??
    createDefaultInventory({ trainId: train.id, startDate, classCode, quota, totalSeats: totalSeatsFor(train, classCode) })
  );
}

/** Batch variant used by search: one IndexedDB read for many buckets. */
export async function peekAvailabilities(
  requests: { train: Train; startDate: string; classCode: ClassCode; quota: Quota }[],
): Promise<Map<string, Availability>> {
  const keys = requests.map((r) => inventoryKey(r.train.id, r.startDate, r.classCode, r.quota));
  const stored = await getDb().seatInventory.bulkGet(keys);
  const out = new Map<string, Availability>();
  requests.forEach((r, i) => {
    const inv =
      stored[i] ??
      createDefaultInventory({
        trainId: r.train.id,
        startDate: r.startDate,
        classCode: r.classCode,
        quota: r.quota,
        totalSeats: totalSeatsFor(r.train, r.classCode),
      });
    out.set(keys[i], getAvailability(inv));
  });
  return out;
}
