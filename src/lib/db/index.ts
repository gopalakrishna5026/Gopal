import { getDb } from "./database";
import { seedDatabase } from "./seed";

export { getDb } from "./database";

let ready: Promise<void> | null = null;

/** Opens IndexedDB and seeds it on first launch. Safe to call many times. */
export function initDatabase(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      if (typeof indexedDB === "undefined") {
        throw new Error("This browser does not support IndexedDB, which RailYatra needs to store data.");
      }
      const db = getDb();
      await db.open();
      await seedDatabase(db);
    })().catch((error) => {
      ready = null; // allow a retry
      throw error;
    });
  }
  return ready;
}
