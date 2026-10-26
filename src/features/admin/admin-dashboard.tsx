"use client";

import Link from "next/link";
import { IndianRupeeIcon, PlusIcon, RouteIcon, TicketIcon, TrainFrontIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-state";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { useDbQuery } from "@/hooks/use-db-query";
import { BOOKING_STATUS_LABEL } from "@/lib/constants";
import { adminStats } from "@/lib/db/repositories/bookings";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { BookingStatus } from "@/types";

const STATUS_COLOR: Record<BookingStatus, string> = {
  CONFIRMED: "bg-success",
  RAC: "bg-warning",
  WAITING_LIST: "bg-brand",
  CANCELLED: "bg-destructive",
};

export function AdminDashboard() {
  const { data, error, loading } = useDbQuery(() => adminStats(), []);

  const kpis = [
    { label: "Total trains", value: data?.trains, icon: TrainFrontIcon, href: "/admin/trains" },
    { label: "Total routes", value: data?.routes, icon: RouteIcon, href: "/admin/trains" },
    { label: "Total bookings", value: data?.bookings, icon: TicketIcon },
    { label: "Registered users", value: data?.users, icon: UsersIcon },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of the simulated network."
        actions={
          <Button asChild>
            <Link href="/admin/trains/new">
              <PlusIcon data-icon="inline-start" />
              Add train
            </Link>
          </Button>
        }
      />
      {error && <QueryError error={error} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardDescription>{k.label}</CardDescription>
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-brand">
                <k.icon className="size-4" aria-hidden />
              </span>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-9 w-16" /> : <p className="text-3xl font-semibold tabular-nums">{k.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Bookings by status</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <IndianRupeeIcon className="size-3.5" aria-hidden />
              Net revenue (simulated): {data ? formatCurrency(data.revenue) : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loading || !data ? (
              <Skeleton className="h-32" />
            ) : (
              (Object.keys(data.byStatus) as BookingStatus[]).map((s) => {
                const pct = data.bookings ? (data.byStatus[s] / data.bookings) * 100 : 0;
                return (
                  <div key={s} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm">
                      <span>{BOOKING_STATUS_LABEL[s]}</span>
                      <span className="tabular-nums text-muted-foreground">{data.byStatus[s]}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                      <div className={cn("h-full rounded-full transition-all", STATUS_COLOR[s])} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest bookings</CardTitle>
            <CardDescription>Across all users.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading || !data ? (
              <Skeleton className="h-40" />
            ) : !data.latest.length ? (
              <p className="text-sm text-muted-foreground">No bookings yet. They&apos;ll appear here as users book.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PNR</TableHead>
                    <TableHead>Train</TableHead>
                    <TableHead>Journey</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.latest.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Link href={`/my-bookings/${b.id}`} className="font-mono text-brand hover:underline">
                          {b.pnr}
                        </Link>
                      </TableCell>
                      <TableCell>{b.trainNumber}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {b.fromCode} → {b.toCode} · {formatDate(b.journeyDate, "dd MMM")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(b.totalAmount)}</TableCell>
                      <TableCell>
                        <BookingStatusBadge status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
