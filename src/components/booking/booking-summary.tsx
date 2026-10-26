import { CalendarIcon, TrainFrontIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AvailabilityText } from "@/components/shared/status-badges";
import { CLASS_INFO, QUOTA_INFO } from "@/lib/constants";
import type { TrainSearchResult } from "@/lib/db/repositories/trains";
import { bookingTotals } from "@/lib/rules/fare";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/utils";
import type { ClassCode, Quota } from "@/types";

interface Props {
  journey: TrainSearchResult;
  classCode: ClassCode;
  quota: Quota;
  passengerCount: number;
  compact?: boolean;
}

export function BookingSummary({ journey, classCode, quota, passengerCount, compact }: Props) {
  const offer = journey.classes.find((c) => c.code === classCode);
  const fare = offer?.fare ?? 0;
  const totals = bookingTotals(Array.from({ length: passengerCount }, () => fare));

  if (compact) {
    return (
      <Card size="sm">
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">
              {journey.train.number} · {journey.from.stationCode} → {journey.to.stationCode}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(journey.departureAt, "dd MMM, HH:mm")} · {classCode} · {QUOTA_INFO[quota].label}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold">{formatCurrency(passengerCount ? totals.totalAmount : fare)}</span>
            <span className="text-xs text-muted-foreground">
              {passengerCount ? `${passengerCount} pax` : "per pax"}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="flex gap-3">
          <TrainFrontIcon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold">
              {journey.train.number} · {journey.train.name}
            </span>
            <span className="text-muted-foreground">
              {journey.from.stationCode} {journey.from.departure} → {journey.to.stationCode} {journey.to.arrival} ·{" "}
              {formatDuration(journey.durationMinutes)}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <CalendarIcon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span>{formatDateTime(journey.departureAt, "EEEE, dd MMM yyyy")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {classCode} · {CLASS_INFO[classCode].label}
          </Badge>
          <Badge variant="secondary">{QUOTA_INFO[quota].label}</Badge>
          {offer && <AvailabilityText availability={offer.availability} className="text-xs" />}
        </div>
        <div className="flex gap-3">
          <UsersIcon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span>
            {passengerCount || "No"} passenger{passengerCount === 1 ? "" : "s"}
          </span>
        </div>
        <Separator />
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Ticket fare ({passengerCount || 0} × {formatCurrency(fare)})
            </dt>
            <dd className="tabular-nums">{formatCurrency(totals.baseFare)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Convenience fee (incl. GST)</dt>
            <dd className="tabular-nums">{formatCurrency(totals.convenienceFee)}</dd>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCurrency(totals.totalAmount)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
