import { AppError } from "@/lib/errors";
import { nowIso, uid } from "@/lib/utils";
import type { SavedPassenger } from "@/types";
import { getDb } from "../database";

export type PassengerInput = Pick<
  SavedPassenger,
  "fullName" | "age" | "gender" | "berthPreference" | "mobile"
>;

export function listPassengers(userId: string) {
  return getDb().passengers.where("userId").equals(userId).sortBy("fullName");
}

export async function savePassenger(
  userId: string,
  input: PassengerInput,
  id?: string,
): Promise<SavedPassenger> {
  const db = getDb();
  const now = nowIso();
  const name = input.fullName.trim();
  return db.transaction("rw", db.passengers, async () => {
    const existing = await db.passengers.where("userId").equals(userId).toArray();
    const duplicate = existing.find(
      (p) => p.id !== id && p.fullName.toLowerCase() === name.toLowerCase() && p.age === input.age,
    );
    if (duplicate) {
      throw new AppError("DUPLICATE", `${name} (${input.age}) is already in your passenger list.`);
    }
    if (id) {
      const current = existing.find((p) => p.id === id);
      if (!current) throw new AppError("NOT_FOUND", "Passenger not found.");
      const next: SavedPassenger = { ...current, ...input, fullName: name, mobile: input.mobile || undefined, updatedAt: now };
      await db.passengers.put(next);
      return next;
    }
    const record: SavedPassenger = {
      id: uid(),
      userId,
      ...input,
      fullName: name,
      mobile: input.mobile || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await db.passengers.add(record);
    return record;
  });
}

export async function deletePassenger(userId: string, id: string): Promise<void> {
  const db = getDb();
  const record = await db.passengers.get(id);
  if (!record || record.userId !== userId) throw new AppError("NOT_FOUND", "Passenger not found.");
  await db.passengers.delete(id);
}
