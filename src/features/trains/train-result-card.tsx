"use client";

import Link from "next/link";
import { useState } from "react";
import { InfoIcon, TicketIcon } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { AvailabilityText } from "@/components/shared/status-badges";
import { CLASS_INFO, WEEKDAYS } from "@/lib/constants";
import type { ClassOffer, TrainSearchResult } from "@/lib/db/repositories/trains";
import { cn, formatCurrency } from "@/lib/utils";
import type { Quota, Station } from "@/types";
import { JourneyTimeline } from "./journey-timeline";
import { useStartBooking } from "./use-start-booking";

interface Props {
  result: TrainSearchResult;
  classes: ClassOffer[];
  quota: Quota;
  stations: Map<string, Station>;
}

export function TrainResultCard({ result, classes, quota, stations }: Props) {
  const startBooking = useStartBooking();
  const firstBookable = classes.find((c) => c.availability.kind !== "NOT_AVAILABLE") ?? classes[0];
  const [selected, setSelected] = useState(firstBookable?.code);
  const offer = classes.find((c) => c.code === selected) ?? firstBookable;
  const { train } = result;
  const canBook = offer && !result.departed && offer.availability.kind !== "NOT_AVAILABLE";

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {train.number}
              </Badge>
              <h3 className="truncate text-base font-semibold text-primary">{train.name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <Badge variant="secondary">{train.type}</Badge>
              <span className="flex gap-0.5" aria-label="Runs on">
                {WEEKDAYS.map((d, i) => (
                  <span
                    key={d}
                    className={cn(
                      "w-4 text-center",
                      train.schedule.runDays.includes(i) ? "font-semibold text-foreground" : "opacity-35",
                    )}
                    title={d}
                  >
                    {d[0]}
                  </span>
                ))}
              </span>
            </div>
          </div>
          <Button variant="link" size="sm" asChild className="px-0">
            <Link href={`/trains/${train.id}`}>
              <InfoIcon data-icon="inline-start" />
              Schedule & availability
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <JourneyTimeline
            departure={result.from.departure!}
            arrival={result.to.arrival!}
            fromCode={result.from.stationCode}
            toCode={result.to.stationCode}
            durationMinutes={result.durationMinutes}
            dayDiff={result.to.dayOffset - result.from.dayOffset}
            distanceKm={result.distanceKm}
            stations={stations}
          />

          <div
            role="radiogroup"
            aria-label="Select class"
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
          >
            {classes.map((c) => {
              const active = c.code === offer?.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(c.code)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border bg-background p-3 text-left transition-colors hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active && "border-brand bg-accent ring-1 ring-brand",
                  )}
                >
                  <span className="text-sm font-semibold">
                    {c.code} <span className="font-normal text-muted-foreground">· {CLASS_INFO[c.code].label}</span>
                  </span>
                  <AvailabilityText availability={c.availability} />
                  <span className="text-sm font-medium">{formatCurrency(c.fare)}</span>
                </button>
              );
            })}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-3 border-t bg-muted/40 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {result.departed ? (
              <span className="font-medium text-destructive">This train has already departed.</span>
            ) : offer ? (
              <>
                <span className="font-semibold text-foreground">{formatCurrency(offer.fare)}</span> per passenger ·{" "}
                {offer.code}
              </>
            ) : null}
          </p>
          <Button
            disabled={!canBook}
            className="bg-highlight text-highlight-foreground hover:bg-highlight/90"
            onClick={() =>
              offer &&
              startBooking({
                trainId: train.id,
                fromCode: result.from.stationCode,
                toCode: result.to.stationCode,
                journeyDate: result.journeyDate,
                classCode: offer.code,
                quota,
              })
            }
          >
            <TicketIcon data-icon="inline-start" />
            {offer?.availability.kind === "NOT_AVAILABLE" ? "Not available" : "Book now"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
