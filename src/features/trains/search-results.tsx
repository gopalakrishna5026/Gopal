"use client";

import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon, SearchXIcon, SlidersHorizontalIcon, TrainTrackIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PageContainer } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-state";
import { TrainCardSkeleton } from "@/components/shared/skeletons";
import { useDbQuery } from "@/hooks/use-db-query";
import { useStations } from "@/hooks/use-stations";
import { ADVANCE_BOOKING_DAYS, CLASS_INFO, QUOTA_INFO } from "@/lib/constants";
import { searchTrains } from "@/lib/db/repositories/trains";
import { formatDate, shiftDateKey, todayKey } from "@/lib/utils";
import { useAppReady } from "@/stores/app-store";
import { useSearchStore, type SortKey } from "@/stores/search-store";
import type { ClassCode, TrainType } from "@/types";
import { activeFilterCount, applyFilters, priceBounds, visibleClasses } from "./filter-utils";
import { SearchFilters } from "./search-filters";
import { TrainSearchForm } from "./search-form";
import { TrainResultCard } from "./train-result-card";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "earliest", label: "Earliest departure" },
  { value: "latest", label: "Latest departure" },
  { value: "price", label: "Lowest price" },
  { value: "duration", label: "Shortest duration" },
];

export function SearchResults() {
  const ready = useAppReady();
  const criteria = useSearchStore((s) => s.criteria);
  const setCriteria = useSearchStore((s) => s.setCriteria);
  const filters = useSearchStore((s) => s.filters);
  const sort = useSearchStore((s) => s.sort);
  const setSort = useSearchStore((s) => s.setSort);
  const { byCode } = useStations();

  const { data, error, loading } = useDbQuery(
    () => (criteria ? searchTrains({ fromCode: criteria.from, toCode: criteria.to, journeyDate: criteria.date, quota: criteria.quota }) : Promise.resolve(null)),
    [criteria?.from, criteria?.to, criteria?.date, criteria?.quota],
  );

  const results = useMemo(() => data ?? [], [data]);
  const visible = useMemo(
    () => (criteria ? applyFilters(results, filters, criteria.classCode, sort) : []),
    [results, filters, criteria, sort],
  );
  const facets = useMemo(
    () => ({
      types: [...new Set(results.map((r) => r.train.type))].sort() as TrainType[],
      classes: [...new Set(results.flatMap((r) => r.classes.map((c) => c.code)))].sort() as ClassCode[],
      bounds: priceBounds(results),
    }),
    [results],
  );

  if (!ready) {
    return (
      <PageContainer>
        <TrainCardSkeleton />
      </PageContainer>
    );
  }

  if (!criteria) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <TrainSearchForm />
          </CardContent>
        </Card>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrainTrackIcon />
            </EmptyMedia>
            <EmptyTitle>Search for a train</EmptyTitle>
            <EmptyDescription>Choose where you&apos;re travelling from and to, and when.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </PageContainer>
    );
  }

  const shiftDay = (days: number) => setCriteria({ ...criteria, date: shiftDateKey(criteria.date, days) });
  const canPrev = criteria.date > todayKey();
  const canNext = shiftDateKey(criteria.date, 1) <= shiftDateKey(todayKey(), ADVANCE_BOOKING_DAYS);
  const filterCount = activeFilterCount(filters);
  const filterPanel = <SearchFilters availableTypes={facets.types} availableClasses={facets.classes} bounds={facets.bounds} />;

  return (
    <>
      <div className="border-b bg-card">
        <div className="mx-auto w-full max-w-7xl px-4 py-4">
          <TrainSearchForm variant="compact" />
        </div>
      </div>
      <PageContainer className="md:py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-primary md:text-2xl">
              {byCode.get(criteria.from)?.city ?? criteria.from} → {byCode.get(criteria.to)?.city ?? criteria.to}
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {formatDate(criteria.date)}
              <Badge variant="secondary">{QUOTA_INFO[criteria.quota].label} quota</Badge>
              {criteria.classCode !== "ALL" && <Badge variant="secondary">{CLASS_INFO[criteria.classCode].label}</Badge>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={!canPrev} onClick={() => shiftDay(-1)} aria-label="Previous day">
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" size="icon" disabled={!canNext} onClick={() => shiftDay(1)} aria-label="Next day">
              <ChevronRightIcon />
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontalIcon data-icon="inline-start" />
                  Filters
                  {filterCount > 0 && <Badge className="ml-1">{filterCount}</Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filter trains</SheetTitle>
                  <SheetDescription>{visible.length} of {results.length} trains shown</SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-6">{filterPanel}</div>
              </SheetContent>
            </Sheet>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-44" aria-label="Sort trains">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                <SelectGroup>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <Card className="sticky top-20">
              <CardContent>{filterPanel}</CardContent>
            </Card>
          </aside>

          <section aria-live="polite" aria-busy={loading} className="flex min-w-0 flex-col gap-4">
            {error ? (
              <QueryError error={error} title="Search failed" />
            ) : loading ? (
              <>
                <TrainCardSkeleton />
                <TrainCardSkeleton />
              </>
            ) : results.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchXIcon />
                  </EmptyMedia>
                  <EmptyTitle>No trains on this date</EmptyTitle>
                  <EmptyDescription>
                    No train runs between these stations on {formatDate(criteria.date)}. Try another date or a
                    nearby station.
                  </EmptyDescription>
                </EmptyHeader>
                {canNext && (
                  <EmptyContent>
                    <Button variant="outline" onClick={() => shiftDay(1)}>
                      Try {formatDate(shiftDateKey(criteria.date, 1), "EEE, dd MMM")}
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            ) : visible.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SlidersHorizontalIcon />
                  </EmptyMedia>
                  <EmptyTitle>No trains match your filters</EmptyTitle>
                  <EmptyDescription>{results.length} train(s) are hidden by the current filters.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" onClick={() => useSearchStore.getState().resetFilters()}>
                    Clear filters
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Showing {visible.length} of {results.length} train{results.length === 1 ? "" : "s"}
                </p>
                {visible.map((r) => (
                  <TrainResultCard
                    key={`${r.train.id}-${r.journeyDate}-${criteria.quota}`}
                    result={r}
                    classes={visibleClasses(r, filters, criteria.classCode)}
                    quota={criteria.quota}
                    stations={byCode}
                  />
                ))}
                <p className="text-xs text-muted-foreground">
                  Availability is simulated and deterministic per train, date, class and quota. RAC and
                  waiting-list behaviour follows simplified demo rules.
                </p>
              </>
            )}
          </section>
        </div>
      </PageContainer>
    </>
  );
}
