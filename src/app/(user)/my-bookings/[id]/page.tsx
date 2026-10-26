import type { Metadata } from "next";
import { RequireAuth } from "@/components/shared/guards";
import { BookingDetail } from "@/features/bookings/booking-detail";

export const metadata: Metadata = { title: "Ticket details" };

export default async function BookingDetailPage({ params }: PageProps<"/my-bookings/[id]">) {
  const { id } = await params;
  return (
    <RequireAuth>
      <BookingDetail bookingId={id} variant="detail" />
    </RequireAuth>
  );
}
