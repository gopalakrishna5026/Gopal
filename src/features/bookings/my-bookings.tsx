"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRightIcon, SearchIcon, TicketIcon, TrainFrontIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-state";
import { ListSkeleton } from "@/components/shared/skeletons";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { useDbQuery } from "@/hooks/use-db-query";
import { useStations } from "@/hooks/use-stations";
import { CLASS_INFO } from "@/lib/constants";
import { listUserBookings } from "@/lib/db/repositories/bookings";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { Booking } from "@/types";

type Tab = "all" | "upcoming" | "past" | "cancelled";

function matchesTab(b: Booking, tab: Tab, now: string) {
  switch (tab) {
    case "upcoming":
      return b.status !== "CANCELLED" && b.departureAt >= now;
    case "past":
      return b.status !== "CANCELLED" && b.departureAt < now;
    case "cancelled":
      return b.status === "CANCELLED";
    default:
      return true;
  }
}

export function MyBookings() {
  const user = useAuthStore((s) => s.user)!;
  const { byCode } = useStations();
  const { data, error, loading } = useDbQuery(() => listUserBookings(user.id), [user.id]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");

  const now = useMemo(() => new Date().toISOString(), []);
  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.length,
      upcoming: all.filter((b) => matchesTab(b, "upcoming", now)).length,
      past: all.filter((b) => matchesTab(b, "past", now)).length,
      cancelled: all.filter((b) => matchesTab(b, "cancelled", now)).length,
    };
  }, [data, now]);

  const pnrQuery = query.replace(/\D/g, "");
  const items = useMemo(() => {
    const all = data ?? [];
    // A PNR search looks across all tabs.
    if (pnrQuery) return all.filter((b) => b.pnr.includes(pnrQuery));
    const list = all.filter((b) => matchesTab(b, tab, now));
    return tab === "upcoming" ? [...list].sort((a, b) => a.departureAt.localeCompare(b.departureAt)) : list;
  }, [data, tab, now, pnrQuery]);

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title="My bookings"
        description="View tickets, check live status, print or cancel."
        actions={
          <Button asChild>
            <Link href="/trains">
              <SearchIcon data-icon="inline-start" />
              Book a ticket
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="w-full overflow-x-auto md:w-fit">
            {(["upcoming", "past", "cancelled", "all"] as const).map((t) => (
              <TabsTrigger key={t} value={t} className="capitalize" disabled={!!pnrQuery}>
                {t}
                <Badge variant="secondary" className="ml-1">{counts[t]}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="md:w-64">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search by PNR"
            inputMode="numeric"
            maxLength={10}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search bookings by PNR"
          />
        </InputGroup>
      </div>

      {error ? (
        <QueryError error={error} />
      ) : loading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TicketIcon />
            </EmptyMedia>
            <EmptyTitle>{pnrQuery ? "No booking with that PNR" : `No ${tab === "all" ? "" : tab} bookings`}</EmptyTitle>
            <EmptyDescription>
              {pnrQuery ? "Check the 10-digit PNR and try again." : "Your train tickets will show up here once you book."}
            </EmptyDescription>
          </EmptyHeader>
          {!pnrQuery && (
            <EmptyContent>
              <Button asChild variant="outline">
                <Link href="/trains">Search trains</Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((b) => (
            <li key={b.id}>
              <Card className="transition-shadow hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring">
                <CardContent>
                  <Link href={`/my-bookings/${b.id}`} className="flex flex-col gap-3 outline-none sm:flex-row sm:items-center">
                    <span className="hidden size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-brand sm:flex">
                      <TrainFrontIcon className="size-5" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">
                          {b.trainNumber} · {b.trainName}
                        </span>
                        <BookingStatusBadge status={b.status} />
                      </span>
                      <span className="text-sm">
                        {byCode.get(b.fromCode)?.city ?? b.fromCode} ({b.fromCode}) → {byCode.get(b.toCode)?.city ?? b.toCode} ({b.toCode})
                      </span>
                      <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatDateTime(b.departureAt, "EEE, dd MMM yyyy · HH:mm")}</span>
                        <span>{CLASS_INFO[b.classCode].label}</span>
                        <span>{b.passengerCount} passenger(s)</span>
                        <span>
                          PNR <span className="font-mono text-foreground">{b.pnr}</span>
                        </span>
                        <span className="font-mono">{b.id}</span>
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <span className="font-semibold tabular-nums">{formatCurrency(b.totalAmount)}</span>
                      <span className="flex items-center text-sm text-brand">
                        View ticket <ChevronRightIcon className="size-4" aria-hidden />
                      </span>
                    </span>
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
