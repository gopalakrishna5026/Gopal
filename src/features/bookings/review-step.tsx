"use client";

import { ArrowLeftIcon, ArrowRightIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BERTH_PREFERENCES, CLASS_INFO, GENDERS, QUOTA_INFO } from "@/lib/constants";
import type { TrainSearchResult } from "@/lib/db/repositories/trains";
import { bookingTotals } from "@/lib/rules/fare";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/utils";
import { useBookingStore } from "@/stores/booking-store";
import type { ClassCode, Quota, Station } from "@/types";

interface Props {
  journey: TrainSearchResult;
  classCode: ClassCode;
  quota: Quota;
  stations: Map<string, Station>;
  onBack: () => void;
  onContinue: () => void;
}

/** Describes what the current availability means for this party, before paying. */
function availabilityOutlook(journey: TrainSearchResult, classCode: ClassCode, count: number): string | null {
  const a = journey.classes.find((c) => c.code === classCode)?.availability;
  if (!a) return null;
  if (a.kind === "AVAILABLE" && a.count >= count) return null;
  if (a.kind === "AVAILABLE")
    return `Only ${a.count} confirmed berth(s) left. The remaining ${count - a.count} passenger(s) will get RAC or waiting list.`;
  if (a.kind === "RAC") return "No confirmed berths left — passengers will get RAC (shared side berth) status.";
  if (a.kind === "WL") return `No confirmed or RAC berths left — this ticket will be waitlisted (current ${a.label}).`;
  return "This class is fully booked, including the waiting list.";
}

export function ReviewStep({ journey, classCode, quota, stations, onBack, onContinue }: Props) {
  const passengers = useBookingStore((s) => s.passengers);
  const bookOnlyIfConfirmed = useBookingStore((s) => s.bookOnlyIfConfirmed);
  const setBookOnlyIfConfirmed = useBookingStore((s) => s.setBookOnlyIfConfirmed);
  const fare = journey.classes.find((c) => c.code === classCode)?.fare ?? 0;
  const totals = bookingTotals(passengers.map(() => fare));
  const outlook = availabilityOutlook(journey, classCode, passengers.length);
  const notAvailable = journey.classes.find((c) => c.code === classCode)?.availability.kind === "NOT_AVAILABLE";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Journey</CardTitle>
          <CardDescription>
            {journey.train.number} · {journey.train.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">From</dt>
              <dd className="font-medium">
                {stations.get(journey.from.stationCode)?.name} ({journey.from.stationCode})
              </dd>
              <dd>{formatDateTime(journey.departureAt, "EEE, dd MMM yyyy · HH:mm")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">To</dt>
              <dd className="font-medium">
                {stations.get(journey.to.stationCode)?.name} ({journey.to.stationCode})
              </dd>
              <dd>{formatDateTime(journey.arrivalAt, "EEE, dd MMM yyyy · HH:mm")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duration · distance</dt>
              <dd className="font-medium">
                {formatDuration(journey.durationMinutes)} · {journey.distanceKm} km
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Class</dt>
              <dd className="font-medium">
                {CLASS_INFO[classCode].label} ({classCode})
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Quota</dt>
              <dd className="font-medium">{QUOTA_INFO[quota].label}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passengers ({passengers.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Berth pref.</TableHead>
                <TableHead className="text-right">Fare</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passengers.map((p, i) => (
                <TableRow key={p.key}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.fullName}</TableCell>
                  <TableCell>{p.age}</TableCell>
                  <TableCell>{GENDERS.find((g) => g.value === p.gender)?.label}</TableCell>
                  <TableCell>{BERTH_PREFERENCES.find((b) => b.value === p.berthPreference)?.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(fare)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fare details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Ticket fare</dt>
              <dd className="tabular-nums">{formatCurrency(totals.baseFare)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Convenience fee (₹30 + 18% GST)</dt>
              <dd className="tabular-nums">{formatCurrency(totals.convenienceFee)}</dd>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <dt>Total amount</dt>
              <dd className="tabular-nums">{formatCurrency(totals.totalAmount)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {outlook && (
        <Alert variant={notAvailable ? "destructive" : "default"}>
          <TriangleAlertIcon />
          <AlertTitle>Heads up on availability</AlertTitle>
          <AlertDescription>{outlook}</AlertDescription>
        </Alert>
      )}

      <Field orientation="horizontal" className="rounded-lg border bg-card p-4">
        <Checkbox
          id="only-confirmed"
          checked={bookOnlyIfConfirmed}
          onCheckedChange={(v) => setBookOnlyIfConfirmed(v === true)}
        />
        <FieldContent>
          <FieldLabel htmlFor="only-confirmed">Book only if confirmed berths are allotted</FieldLabel>
          <FieldDescription>
            If seats sell out while you pay, the booking is not made and the (simulated) payment is reversed.
          </FieldDescription>
        </FieldContent>
      </Field>

      <Alert>
        <InfoIcon />
        <AlertDescription>
          Fares, availability and PNRs are simulated. No real ticket is issued.
        </AlertDescription>
      </Alert>

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:justify-between md:border-0 md:bg-transparent md:p-0">
        <Button variant="outline" size="lg" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          Edit passengers
        </Button>
        <Button size="lg" onClick={onContinue} disabled={notAvailable || journey.departed} className="flex-1 md:flex-none">
          Proceed to payment
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
