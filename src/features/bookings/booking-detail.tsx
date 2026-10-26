"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeftIcon, CheckCircle2Icon, ClockIcon, PrinterIcon, SearchIcon, TicketIcon, TicketXIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { BookingStepper } from "@/components/booking/booking-stepper";
import { TicketView } from "@/components/booking/ticket-view";
import { PageContainer } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-state";
import { PageSkeleton } from "@/components/shared/skeletons";
import { useDbQuery } from "@/hooks/use-db-query";
import { useStations } from "@/hooks/use-stations";
import { getBooking, getPayment } from "@/lib/db/repositories/bookings";
import { quoteCancellation } from "@/lib/rules/cancellation";
import { useAuthStore } from "@/stores/auth-store";
import { useBookingStore } from "@/stores/booking-store";
import { CancelBookingDialog } from "./cancel-booking-dialog";

export function BookingDetail({ bookingId, variant }: { bookingId: string; variant: "confirmation" | "detail" }) {
  const user = useAuthStore((s) => s.user)!;
  const { byCode } = useStations();
  const { data, error, loading } = useDbQuery(async () => {
    const booking = await getBooking(bookingId);
    if (!booking) return null;
    return { booking, payment: await getPayment(booking.paymentId) };
  }, [bookingId]);

  const attemptId = useBookingStore((s) => s.attemptId);
  const complete = useBookingStore((s) => s.complete);
  useEffect(() => {
    // Clear the wizard once its booking is visible, so "Book now" starts fresh.
    if (variant === "confirmation" && data?.booking.attemptId === attemptId) complete();
  }, [variant, data, attemptId, complete]);

  if (loading) return <PageSkeleton />;
  if (error) return <PageContainer><QueryError error={error} /></PageContainer>;

  const booking = data?.booking;
  // Users can only see their own tickets; admins can see all.
  if (!booking || (booking.userId !== user.id && user.role !== "admin")) {
    return (
      <PageContainer>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TicketXIcon />
            </EmptyMedia>
            <EmptyTitle>Booking not found</EmptyTitle>
            <EmptyDescription>
              We couldn&apos;t find a booking with ID <span className="font-mono">{bookingId}</span> on your account.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/my-bookings">Go to my bookings</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </PageContainer>
    );
  }

  const cancellable = quoteCancellation(booking).eligible;
  const confirmation = variant === "confirmation";

  return (
    <PageContainer className="max-w-5xl">
      {confirmation ? (
        <div className="print:hidden">
          <BookingStepper current={4} />
        </div>
      ) : (
        <Button variant="ghost" size="sm" asChild className="w-fit print:hidden">
          <Link href="/my-bookings">
            <ArrowLeftIcon data-icon="inline-start" />
            My bookings
          </Link>
        </Button>
      )}

      {confirmation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-2 text-center print:hidden"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success"
          >
            {booking.status === "CONFIRMED" ? <CheckCircle2Icon className="size-9" aria-hidden /> : <ClockIcon className="size-9" aria-hidden />}
          </motion.span>
          <h1 className="text-2xl font-semibold text-primary">
            {booking.status === "CONFIRMED" ? "Your ticket is confirmed!" : "Booking successful"}
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            PNR <span className="font-mono font-semibold text-foreground">{booking.pnr}</span> · Booking ID{" "}
            <span className="font-mono">{booking.id}</span>.{" "}
            {booking.status === "RAC" && "Some passengers have RAC status and share a side berth until a berth frees up."}
            {booking.status === "WAITING_LIST" && "Some passengers are waitlisted. Status updates automatically when others cancel."}
          </p>
        </motion.div>
      )}

      {booking.status === "CANCELLED" && (
        <Alert variant="destructive" className="print:hidden">
          <TicketXIcon />
          <AlertTitle>This booking was cancelled</AlertTitle>
          <AlertDescription>The refund shown below is simulated — no money moves in this demo.</AlertDescription>
        </Alert>
      )}

      <TicketView booking={booking} payment={data.payment} stations={byCode} />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap print:hidden">
        <Button onClick={() => window.print()}>
          <PrinterIcon data-icon="inline-start" />
          Print ticket
        </Button>
        <Button variant="outline" asChild>
          <Link href="/my-bookings">
            <TicketIcon data-icon="inline-start" />
            My bookings
          </Link>
        </Button>
        {confirmation && (
          <Button variant="outline" asChild>
            <Link href="/trains">
              <SearchIcon data-icon="inline-start" />
              Book another trip
            </Link>
          </Button>
        )}
        {cancellable && (
          <div className="sm:ml-auto">
            <CancelBookingDialog booking={booking} />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
