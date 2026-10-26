"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { SearchIcon, TicketXIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { BookingStepper } from "@/components/booking/booking-stepper";
import { BookingSummary } from "@/components/booking/booking-summary";
import { PageContainer } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-state";
import { PageSkeleton } from "@/components/shared/skeletons";
import { useDbQuery } from "@/hooks/use-db-query";
import { useStations } from "@/hooks/use-stations";
import { buildJourney, getTrain } from "@/lib/db/repositories/trains";
import { PaymentStep } from "@/features/payments/payment-step";
import { useAuthStore } from "@/stores/auth-store";
import { useBookingStore, type BookingStep } from "@/stores/booking-store";
import { PassengerStep } from "./passenger-step";
import { ReviewStep } from "./review-step";

const STEP_INDEX: Record<BookingStep, number> = { passengers: 1, review: 2, payment: 3 };

function NoBooking({ title, description }: { title: string; description: string }) {
  return (
    <PageContainer>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TicketXIcon />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/trains">
              <SearchIcon data-icon="inline-start" />
              Search trains
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </PageContainer>
  );
}

export function BookingView({ trainId }: { trainId: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user)!;
  const { draft, step, setStep, passengers } = useBookingStore();
  const { byCode } = useStations();

  // Live query: fare / availability shown here update if inventory changes in another tab.
  const { data: journey, error, loading } = useDbQuery(async () => {
    if (!draft || draft.trainId !== trainId) return null;
    const train = await getTrain(trainId);
    if (!train) return undefined;
    return buildJourney(train, draft.fromCode, draft.toCode, draft.journeyDate, draft.quota);
  }, [trainId, draft?.trainId, draft?.fromCode, draft?.toCode, draft?.journeyDate, draft?.quota]);

  if (!draft || draft.trainId !== trainId) {
    return (
      <NoBooking
        title="No booking in progress"
        description="Start by searching for a train and choosing a class. Booking details are kept for this browser tab only."
      />
    );
  }
  if (loading) return <PageSkeleton />;
  if (error) return <PageContainer><QueryError error={error} /></PageContainer>;
  if (!journey || !journey.classes.some((c) => c.code === draft.classCode)) {
    return (
      <NoBooking
        title="This journey is no longer available"
        description="The train, route or class may have been changed by an administrator, or the train doesn't run on this date."
      />
    );
  }

  const effectiveStep: BookingStep = step !== "passengers" && passengers.length === 0 ? "passengers" : step;
  const go = (next: BookingStep) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const fare = journey.classes.find((c) => c.code === draft.classCode)!.fare;
  // Blank rows the user hasn't filled in yet shouldn't inflate the running total.
  const filledCount = passengers.filter((p) => p.fullName.trim()).length;

  return (
    <PageContainer className="md:py-8">
      <BookingStepper
        current={STEP_INDEX[effectiveStep]}
        onStepClick={(i) => {
          if (i === 0) router.push(`/trains/${trainId}`);
          if (i === 1) go("passengers");
          if (i === 2) go("review");
        }}
      />
      <div className="lg:hidden">
        <BookingSummary journey={journey} classCode={draft.classCode} quota={draft.quota} passengerCount={filledCount} compact />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={effectiveStep}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="min-w-0"
          >
            {effectiveStep === "passengers" && (
              <PassengerStep userId={user.id} quota={draft.quota} onContinue={() => go("review")} />
            )}
            {effectiveStep === "review" && (
              <ReviewStep
                journey={journey}
                classCode={draft.classCode}
                quota={draft.quota}
                stations={byCode}
                onBack={() => go("passengers")}
                onContinue={() => go("payment")}
              />
            )}
            {effectiveStep === "payment" && (
              <PaymentStep
                userId={user.id}
                draft={draft}
                fare={fare}
                onBack={() => go("review")}
                onSuccess={(booking) => {
                  toast.success(`Booking successful! PNR ${booking.pnr}`);
                  // The confirmation page clears the wizard once it has rendered.
                  router.replace(`/booking/confirmation/${booking.id}`);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <BookingSummary journey={journey} classCode={draft.classCode} quota={draft.quota} passengerCount={filledCount} />
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
