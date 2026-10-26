"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, CalendarSearchIcon, TrainFrontIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/shared/date-picker";
import { PageContainer } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-state";
import { PageSkeleton } from "@/components/shared/skeletons";
import { availabilityTone } from "@/components/shared/status-badges";
import { useDbQuery } from "@/hooks/use-db-query";
import { useStations } from "@/hooks/use-stations";
import { CLASS_INFO, QUOTA_INFO, QUOTAS, WEEKDAYS } from "@/lib/constants";
import { availabilityCalendar, getTrain } from "@/lib/db/repositories/trains";
import { cn, formatCurrency, formatDate, minutesBetween, shiftDateKey, todayKey } from "@/lib/utils";
import { useSearchStore } from "@/stores/search-store";
import type { ClassCode, Quota, TrainWithDetails } from "@/types";
import { useStartBooking } from "./use-start-booking";

export function TrainDetail({ trainId }: { trainId: string }) {
  const { data: train, error, loading } = useDbQuery(() => getTrain(trainId), [trainId]);

  if (loading) return <PageSkeleton />;
  if (error) return <PageContainer><QueryError error={error} /></PageContainer>;
  if (!train) {
    return (
      <PageContainer>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrainFrontIcon />
            </EmptyMedia>
            <EmptyTitle>Train not found</EmptyTitle>
            <EmptyDescription>This train may have been removed by an administrator.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/trains">Search trains</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </PageContainer>
    );
  }
  return <TrainDetailView train={train} />;
}

function TrainDetailView({ train }: { train: TrainWithDetails }) {
  const { byCode } = useStations();
  const criteria = useSearchStore((s) => s.criteria);
  const codes = train.route.stationCodes;
  const servesCriteria =
    criteria && codes.indexOf(criteria.from) >= 0 && codes.indexOf(criteria.from) < codes.indexOf(criteria.to);

  const [from, setFrom] = useState(servesCriteria ? criteria!.from : codes[0]);
  const [to, setTo] = useState(servesCriteria ? criteria!.to : codes[codes.length - 1]);
  const [date, setDate] = useState(criteria && criteria.date >= todayKey() ? criteria.date : shiftDateKey(todayKey(), 1));
  const [classCode, setClassCode] = useState<ClassCode>(
    criteria?.classCode !== "ALL" && train.classes.some((c) => c.code === criteria?.classCode)
      ? (criteria!.classCode as ClassCode)
      : train.classes[0].code,
  );
  const [quota, setQuota] = useState<Quota>(criteria?.quota ?? "GN");
  const startBooking = useStartBooking();

  const fromIdx = codes.indexOf(from);
  const calendar = useDbQuery(
    () => availabilityCalendar({ train, fromCode: from, toCode: to, startJourneyDate: date, days: 6, quota }),
    [train, from, to, date, quota],
  );

  return (
    <PageContainer>
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/trains">
          <ArrowLeftIcon data-icon="inline-start" />
          Back to results
        </Link>
      </Button>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono">{train.number}</Badge>
          <Badge variant="secondary">{train.type}</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary md:text-3xl">{train.name}</h1>
        <p className="text-sm text-muted-foreground">
          {byCode.get(train.sourceCode)?.name} → {byCode.get(train.destinationCode)?.name} · Runs{" "}
          {train.schedule.runDays.length === 7 ? "daily" : train.schedule.runDays.map((d) => WEEKDAYS[d]).join(", ")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarSearchIcon className="size-4 text-brand" aria-hidden />
            Check seat availability
          </CardTitle>
          <CardDescription>Availability for 6 days starting from the selected date. Tap a date to book.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field>
              <FieldLabel htmlFor="avail-from">Boarding</FieldLabel>
              <Select
                value={from}
                onValueChange={(v) => {
                  setFrom(v);
                  if (codes.indexOf(v) >= codes.indexOf(to)) setTo(codes[codes.length - 1]);
                }}
              >
                <SelectTrigger id="avail-from" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    {codes.slice(0, -1).map((c) => (
                      <SelectItem key={c} value={c}>{byCode.get(c)?.name ?? c} ({c})</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="avail-to">Destination</FieldLabel>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger id="avail-to" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    {codes.slice(fromIdx + 1).map((c) => (
                      <SelectItem key={c} value={c}>{byCode.get(c)?.name ?? c} ({c})</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="avail-date">From date</FieldLabel>
              <DatePicker id="avail-date" value={date} onChange={setDate} className="min-h-9 py-1" />
            </Field>
            <Field>
              <FieldLabel htmlFor="avail-class">Class</FieldLabel>
              <Select value={classCode} onValueChange={(v) => setClassCode(v as ClassCode)}>
                <SelectTrigger id="avail-class" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    {train.classes.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{CLASS_INFO[c.code].label} ({c.code})</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="avail-quota">Quota</FieldLabel>
              <Select value={quota} onValueChange={(v) => setQuota(v as Quota)}>
                <SelectTrigger id="avail-quota" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    {QUOTAS.map((q) => (
                      <SelectItem key={q} value={q}>{QUOTA_INFO[q].label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {calendar.error ? (
            <QueryError error={calendar.error} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-live="polite">
              {calendar.loading || !calendar.data
                ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28" />)
                : calendar.data.map(({ journeyDate, result }) => {
                    const offer = result?.classes.find((c) => c.code === classCode);
                    const disabled = !result || !offer || result.departed || offer.availability.kind === "NOT_AVAILABLE";
                    return (
                      <button
                        key={journeyDate}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          startBooking({ trainId: train.id, fromCode: from, toCode: to, journeyDate, classCode, quota })
                        }
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                          disabled ? "cursor-not-allowed bg-muted/50" : "bg-background hover:border-brand",
                        )}
                        aria-label={`${formatDate(journeyDate)}: ${offer?.availability.label ?? "Does not run"}`}
                      >
                        <span className="text-sm font-medium">{formatDate(journeyDate, "EEE, dd MMM")}</span>
                        {!result ? (
                          <span className="text-xs text-muted-foreground">Doesn&apos;t run</span>
                        ) : result.departed ? (
                          <span className="text-xs text-muted-foreground">Departed</span>
                        ) : offer ? (
                          <>
                            <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums", availabilityTone(offer.availability.kind))}>
                              {offer.availability.label}
                            </span>
                            <span className="text-sm">{formatCurrency(offer.fare)}</span>
                          </>
                        ) : null}
                      </button>
                    );
                  })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Simulation: seats are split by quota; only 2A, 3A and SL have RAC. Once confirmed seats run out,
            new bookings get RAC, then waiting list, then &quot;Not available&quot;.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Route & timetable</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Arr.</TableHead>
                  <TableHead>Dep.</TableHead>
                  <TableHead className="hidden sm:table-cell">Halt</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {train.route.stops.map((s, i) => (
                  <TableRow key={s.stationCode} className={cn((s.stationCode === from || s.stationCode === to) && "bg-accent/60")}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <span className="font-medium">{byCode.get(s.stationCode)?.name ?? s.stationCode}</span>{" "}
                      <span className="font-mono text-xs text-muted-foreground">{s.stationCode}</span>
                    </TableCell>
                    <TableCell className="tabular-nums">{s.arrival ?? "Source"}</TableCell>
                    <TableCell className="tabular-nums">{s.departure ?? "Dest."}</TableCell>
                    <TableCell className="hidden tabular-nums sm:table-cell">
                      {s.arrival && s.departure
                        ? `${minutesBetween({ dayOffset: 0, time: s.arrival }, { dayOffset: 0, time: s.departure })}m`
                        : "—"}
                    </TableCell>
                    <TableCell>{s.dayOffset + 1}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.distanceKm}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classes & full-route fares</CardTitle>
            <CardDescription>Fares are pro-rated by distance for shorter journeys.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Seats</TableHead>
                  <TableHead className="text-right">Fare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {train.classes.map((c) => (
                  <TableRow key={c.code}>
                    <TableCell>
                      <span className="font-medium">{c.code}</span>{" "}
                      <span className="text-muted-foreground">{CLASS_INFO[c.code].label}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.totalSeats}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(c.fare)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
