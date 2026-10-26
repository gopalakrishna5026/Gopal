import type { Metadata } from "next";
import { RequireAuth } from "@/components/shared/guards";
import { BookingDetail } from "@/features/bookings/booking-detail";

export const metadata: Metadata = { title: "Booking confirmed" };

export default async function ConfirmationPage({ params }: PageProps<"/booking/confirmation/[id]">) {
  const { id } = await params;
  return (
    <RequireAuth>
      <BookingDetail bookingId={id} variant="confirmation" />
    </RequireAuth>
  );
}
