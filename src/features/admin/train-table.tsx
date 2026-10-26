"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon, TrainFrontIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-state";
import { ListSkeleton } from "@/components/shared/skeletons";
import { useDbQuery } from "@/hooks/use-db-query";
import { useStations } from "@/hooks/use-stations";
import { TRAIN_TYPES, WEEKDAYS } from "@/lib/constants";
import { deleteTrain, listTrains } from "@/lib/db/repositories/trains";
import { errorMessage } from "@/lib/errors";
import { formatDuration, minutesBetween } from "@/lib/utils";
import type { TrainWithDetails } from "@/types";

function summary(t: TrainWithDetails) {
  const first = t.route.stops[0];
  const last = t.route.stops[t.route.stops.length - 1];
  return {
    departure: first.departure!,
    arrival: last.arrival!,
    duration: minutesBetween({ dayOffset: 0, time: first.departure! }, { dayOffset: last.dayOffset, time: last.arrival! }),
    days: t.schedule.runDays.length === 7 ? "Daily" : t.schedule.runDays.map((d) => WEEKDAYS[d]).join(" "),
    stops: t.route.stops.length,
  };
}

function DeleteTrainButton({ train }: { train: TrainWithDetails }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Delete ${train.number}`}>
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {train.number} {train.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The train, its route, schedule and seat inventory will be removed and it will disappear from
            search. Trains with upcoming active bookings can&apos;t be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              try {
                await deleteTrain(train.id);
                toast.success(`Train ${train.number} deleted.`);
              } catch (e) {
                toast.error(errorMessage(e));
              }
            }}
          >
            Delete train
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TrainTable() {
  const { data, error, loading } = useDbQuery(() => listTrains(), []);
  const { byCode } = useStations();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");

  const trains = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (t) =>
        (type === "ALL" || t.type === type) &&
        (!q ||
          t.number.includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.route.stationCodes.some(
            (c) => c.toLowerCase() === q || byCode.get(c)?.city.toLowerCase().includes(q),
          )),
    );
  }, [data, query, type, byCode]);

  return (
    <>
      <PageHeader
        title="Trains & routes"
        description={`${data?.length ?? "…"} trains configured. Changes appear in customer search immediately.`}
        actions={
          <Button asChild>
            <Link href="/admin/trains/new">
              <PlusIcon data-icon="inline-start" />
              Add train
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <InputGroup className="sm:max-w-sm">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search number, name, station or city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search trains"
          />
        </InputGroup>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="sm:w-48" aria-label="Filter by train type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              <SelectItem value="ALL">All types</SelectItem>
              {TRAIN_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <QueryError error={error} />
      ) : loading ? (
        <ListSkeleton rows={6} />
      ) : !trains.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrainFrontIcon />
            </EmptyMedia>
            <EmptyTitle>No trains match</EmptyTitle>
            <EmptyDescription>Try a different search or add a new train.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Card className="hidden py-0 lg:flex">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Dep → Arr</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trains.map((t) => {
                  const s = summary(t);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="pl-4 font-mono">{t.number}</TableCell>
                      <TableCell className="max-w-56">
                        <span className="block truncate font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground">{t.type}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {t.sourceCode} → {t.destinationCode}
                        <span className="block text-xs text-muted-foreground">{s.stops} stops</span>
                      </TableCell>
                      <TableCell className="tabular-nums">{s.departure} → {s.arrival}</TableCell>
                      <TableCell className="tabular-nums">{formatDuration(s.duration)}</TableCell>
                      <TableCell className="max-w-32 text-xs">{s.days}</TableCell>
                      <TableCell>
                        <span className="flex flex-wrap gap-1">
                          {t.classes.map((c) => (
                            <Badge key={c.code} variant="secondary">{c.code}</Badge>
                          ))}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/trains/${t.id}/edit`} aria-label={`Edit ${t.number}`}>
                            <PencilIcon />
                          </Link>
                        </Button>
                        <DeleteTrainButton train={t} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <ul className="flex flex-col gap-3 lg:hidden">
            {trains.map((t) => {
              const s = summary(t);
              return (
                <li key={t.id}>
                  <Card size="sm">
                    <CardContent className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">{t.number}</Badge>
                          <span className="truncate font-medium">{t.name}</span>
                        </span>
                        <span className="text-sm">
                          {t.sourceCode} {s.departure} → {t.destinationCode} {s.arrival} · {formatDuration(s.duration)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t.type} · {s.days} · {t.classes.map((c) => c.code).join(", ")}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/trains/${t.id}/edit`} aria-label={`Edit ${t.number}`}>
                          <PencilIcon />
                        </Link>
                      </Button>
                      <DeleteTrainButton train={t} />
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
