import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ClassCode, Quota, TrainType } from "@/types";

export type TimeSlot = "early" | "morning" | "afternoon" | "night";
export type SortKey = "price" | "duration" | "earliest" | "latest";

export interface SearchFilters {
  departureSlots: TimeSlot[];
  arrivalSlots: TimeSlot[];
  trainTypes: TrainType[];
  classes: ClassCode[];
  maxPrice: number | null;
  onlyAvailable: boolean;
}

export const EMPTY_FILTERS: SearchFilters = {
  departureSlots: [],
  arrivalSlots: [],
  trainTypes: [],
  classes: [],
  maxPrice: null,
  onlyAvailable: false,
};

export interface SearchCriteria {
  from: string;
  to: string;
  date: string;
  classCode: ClassCode | "ALL";
  quota: Quota;
}

interface SearchState {
  criteria: SearchCriteria | null;
  filters: SearchFilters;
  sort: SortKey;
  setCriteria: (criteria: SearchCriteria) => void;
  setFilters: (patch: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: SortKey) => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      criteria: null,
      filters: EMPTY_FILTERS,
      sort: "earliest",
      setCriteria: (criteria) => set({ criteria, filters: EMPTY_FILTERS }),
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set({ filters: EMPTY_FILTERS }),
      setSort: (sort) => set({ sort }),
    }),
    {
      name: "railyatra-search",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
