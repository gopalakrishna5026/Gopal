import type { Metadata } from "next";
import { RequireAuth } from "@/components/shared/guards";
import { BookingView } from "@/features/bookings/booking-view";

export const metadata: Metadata = { title: "Book ticket" };

export default async function BookingPage({ params }: PageProps<"/booking/[trainId]">) {
  const { trainId } = await params;
  return (
    <RequireAuth>
      <BookingView trainId={trainId} />
    </RequireAuth>
  );
}
