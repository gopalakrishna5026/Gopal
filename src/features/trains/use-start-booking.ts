"use client";

import { useRouter } from "next/navigation";
import { useBookingStore, type BookingDraft } from "@/stores/booking-store";

/** Seeds the booking wizard and navigates to it. Auth is enforced by the booking route. */
export function useStartBooking() {
  const router = useRouter();
  const startBooking = useBookingStore((s) => s.startBooking);
  return (draft: BookingDraft) => {
    startBooking(draft);
    router.push(`/booking/${draft.trainId}`);
  };
}
