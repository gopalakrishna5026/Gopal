import type { TrainSearchResult } from "@/lib/db/repositories/trains";
import { toMinutes } from "@/lib/utils";
import type { SearchFilters, SortKey, TimeSlot } from "@/stores/search-store";
import type { ClassCode } from "@/types";

export const TIME_SLOTS: { value: TimeSlot; label: string; range: string }[] = [
  { value: "early", label: "Early morning", range: "00:00 – 06:00" },
  { value: "morning", label: "Morning", range: "06:00 – 12:00" },
  { value: "afternoon", label: "Afternoon", range: "12:00 – 18:00" },
  { value: "night", label: "Night", range: "18:00 – 24:00" },
];

export function timeSlot(hhmm: string): TimeSlot {
  const m = toMinutes(hhmm);
  if (m < 360) return "early";
  if (m < 720) return "morning";
  if (m < 1080) return "afternoon";
  return "night";
}

/** Classes shown on a card given the class filter and the searched class. */
export function visibleClasses(result: TrainSearchResult, filters: SearchFilters, searched: ClassCode | "ALL") {
  if (filters.classes.length) return result.classes.filter((c) => filters.classes.includes(c.code));
  if (searched !== "ALL") return result.classes.filter((c) => c.code === searched);
  return result.classes;
}

export function displayPrice(result: TrainSearchResult, filters: SearchFilters, searched: ClassCode | "ALL") {
  const classes = visibleClasses(result, filters, searched);
  return classes.length ? Math.min(...classes.map((c) => c.fare)) : Infinity;
}

export function applyFilters(
  results: TrainSearchResult[],
  filters: SearchFilters,
  searched: ClassCode | "ALL",
  sort: SortKey,
): TrainSearchResult[] {
  const filtered = results.filter((r) => {
    const classes = visibleClasses(r, filters, searched);
    if (!classes.length) return false;
    if (filters.departureSlots.length && !filters.departureSlots.includes(timeSlot(r.from.departure!))) return false;
    if (filters.arrivalSlots.length && !filters.arrivalSlots.includes(timeSlot(r.to.arrival!))) return false;
    if (filters.trainTypes.length && !filters.trainTypes.includes(r.train.type)) return false;
    if (filters.maxPrice !== null && displayPrice(r, filters, searched) > filters.maxPrice) return false;
    if (filters.onlyAvailable && !classes.some((c) => c.availability.kind === "AVAILABLE")) return false;
    return true;
  });

  const byDeparture = (a: TrainSearchResult, b: TrainSearchResult) => a.departureAt.localeCompare(b.departureAt);
  return filtered.sort((a, b) => {
    switch (sort) {
      case "price":
        return displayPrice(a, filters, searched) - displayPrice(b, filters, searched) || byDeparture(a, b);
      case "duration":
        return a.durationMinutes - b.durationMinutes || byDeparture(a, b);
      case "latest":
        return byDeparture(b, a);
      default:
        return byDeparture(a, b);
    }
  });
}

export function priceBounds(results: TrainSearchResult[]): [number, number] {
  const fares = results.flatMap((r) => r.classes.map((c) => c.fare));
  if (!fares.length) return [0, 0];
  return [Math.min(...fares), Math.max(...fares)];
}

export function activeFilterCount(filters: SearchFilters): number {
  return (
    filters.departureSlots.length +
    filters.arrivalSlots.length +
    filters.trainTypes.length +
    filters.classes.length +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.onlyAvailable ? 1 : 0)
  );
}
