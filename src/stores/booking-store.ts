import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { uid } from "@/lib/utils";
import type { BerthPreference, ClassCode, Gender, PaymentMethodType, Quota } from "@/types";

export interface BookingDraft {
  trainId: string;
  fromCode: string;
  toCode: string;
  journeyDate: string;
  classCode: ClassCode;
  quota: Quota;
}

export interface PassengerDraft {
  key: string;
  savedPassengerId?: string;
  fullName: string;
  age: number;
  gender: Gender;
  berthPreference: BerthPreference;
  saveToProfile: boolean;
}

export type BookingStep = "passengers" | "review" | "payment";

export type PaymentSelection =
  | { kind: "saved"; methodId: string }
  | { kind: "new"; type: PaymentMethodType };

interface BookingState {
  draft: BookingDraft | null;
  /** Idempotency key for the current checkout. Regenerated only when a new booking starts. */
  attemptId: string;
  passengers: PassengerDraft[];
  step: BookingStep;
  bookOnlyIfConfirmed: boolean;
  payment: PaymentSelection | null;
  startBooking: (draft: BookingDraft) => void;
  setPassengers: (passengers: PassengerDraft[]) => void;
  setStep: (step: BookingStep) => void;
  setBookOnlyIfConfirmed: (value: boolean) => void;
  setPayment: (payment: PaymentSelection) => void;
  /** Clears the wizard once a booking is confirmed. */
  complete: () => void;
}

const sameJourney = (a: BookingDraft | null, b: BookingDraft) =>
  !!a &&
  a.trainId === b.trainId &&
  a.journeyDate === b.journeyDate &&
  a.fromCode === b.fromCode &&
  a.toCode === b.toCode &&
  a.classCode === b.classCode &&
  a.quota === b.quota;

/**
 * Persisted to sessionStorage so a refresh mid-checkout keeps the passengers entered,
 * while a new tab starts clean. IndexedDB remains the source of truth for bookings.
 */
export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      draft: null,
      attemptId: uid(),
      passengers: [],
      step: "passengers",
      bookOnlyIfConfirmed: false,
      payment: null,
      startBooking(draft) {
        if (sameJourney(get().draft, draft)) {
          set({ step: "passengers" });
          return;
        }
        set({ draft, attemptId: uid(), passengers: [], step: "passengers", bookOnlyIfConfirmed: false });
      },
      setPassengers: (passengers) => set({ passengers }),
      setStep: (step) => set({ step }),
      setBookOnlyIfConfirmed: (bookOnlyIfConfirmed) => set({ bookOnlyIfConfirmed }),
      setPayment: (payment) => set({ payment }),
      complete: () =>
        set({ draft: null, passengers: [], step: "passengers", attemptId: uid(), bookOnlyIfConfirmed: false }),
    }),
    {
      name: "railyatra-booking",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);
