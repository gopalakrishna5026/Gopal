import { create } from "zustand";

type Status = "loading" | "ready" | "error";

interface AppState {
  status: Status;
  error: string | null;
  setStatus: (status: Status, error?: string | null) => void;
}

/** Tracks DB initialisation + store hydration. Nothing data-driven renders until `ready`. */
export const useAppStore = create<AppState>()((set) => ({
  status: "loading",
  error: null,
  setStatus: (status, error = null) => set({ status, error }),
}));

export const useAppReady = () => useAppStore((s) => s.status === "ready");
