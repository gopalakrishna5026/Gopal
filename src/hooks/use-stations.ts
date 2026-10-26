"use client";

import { useMemo } from "react";
import { listStations } from "@/lib/db/repositories/stations";
import type { Station } from "@/types";
import { useDbQuery } from "./use-db-query";

export function useStations() {
  const { data, loading } = useDbQuery(() => listStations(), []);
  const byCode = useMemo(() => new Map((data ?? []).map((s) => [s.code, s])), [data]);
  return { stations: data ?? [], byCode, loading };
}

export function stationLabel(byCode: Map<string, Station>, code: string) {
  const s = byCode.get(code);
  return s ? `${s.name} (${s.code})` : code;
}
