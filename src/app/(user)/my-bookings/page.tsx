import type { Metadata } from "next";
import { RequireAuth } from "@/components/shared/guards";
import { MyBookings } from "@/features/bookings/my-bookings";

export const metadata: Metadata = { title: "My bookings" };

export default function MyBookingsPage() {
  return (
    <RequireAuth>
      <MyBookings />
    </RequireAuth>
  );
}
