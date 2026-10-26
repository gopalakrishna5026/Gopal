"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useAppReady } from "@/stores/app-store";

/**
 * Live IndexedDB query that waits for DB initialisation and reports errors instead of
 * failing silently. Re-runs automatically when the underlying tables change.
 */
export function useDbQuery<T>(query: () => Promise<T>, deps: unknown[]) {
  const ready = useAppReady();
  const result = useLiveQuery(
    async (): Promise<{ data: T; error: null } | { data: undefined; error: Error } | undefined> => {
      if (!ready) return undefined;
      try {
        return { data: await query(), error: null };
      } catch (error) {
        return { data: undefined, error: error instanceof Error ? error : new Error(String(error)) };
      }
    },
    [ready, ...deps],
  );
  return {
    data: result?.data,
    error: result?.error ?? null,
    loading: result === undefined,
  };
}
