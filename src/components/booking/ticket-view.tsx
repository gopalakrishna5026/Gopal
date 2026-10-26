import { TrainFrontIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookingStatusBadge, PassengerStatusBadge } from "@/components/shared/status-badges";
import { BERTH_TYPE_LABEL, CLASS_INFO, QUOTA_INFO } from "@/lib/constants";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/utils";
import type { BookingWithPassengers, Payment, Station } from "@/types";

interface Props {
  booking: BookingWithPassengers;
  payment?: Payment;
  stations: Map<string, Station>;
}

export function TicketView({ booking, payment, stations }: Props) {
  const duration = Math.round((new Date(booking.arrivalAt).getTime() - new Date(booking.departureAt).getTime()) / 60000);
  return (
    <Card className="overflow-hidden print:shadow-none print:ring-1">
      <CardHeader className="-mt-(--card-spacing) flex flex-col gap-3 bg-primary py-4 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white/10">
            <TrainFrontIcon className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-primary-foreground/70">Electronic reservation slip · simulated</span>
            <span className="font-semibold">
              {booking.trainNumber} · {booking.trainName}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:items-end">
          <span className="text-xs text-primary-foreground/70">PNR</span>
          <span className="font-mono text-2xl font-semibold tracking-widest">{booking.pnr}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Boarding</span>
            <span className="text-2xl font-semibold tabular-nums">{booking.departureTime}</span>
            <span className="font-medium">
              {stations.get(booking.fromCode)?.name ?? booking.fromCode} ({booking.fromCode})
            </span>
            <span className="text-sm text-muted-foreground">{formatDateTime(booking.departureAt, "EEE, dd MMM yyyy")}</span>
          </div>
          <div className="flex flex-col items-center text-xs text-muted-foreground">
            <span>{formatDuration(duration)}</span>
            <span className="my-1 h-px w-12 bg-border sm:w-24" />
            <span>{booking.distanceKm} km</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-xs text-muted-foreground">Arrival</span>
            <span className="text-2xl font-semibold tabular-nums">{booking.arrivalTime}</span>
            <span className="font-medium">
              {stations.get(booking.toCode)?.name ?? booking.toCode} ({booking.toCode})
            </span>
            <span className="text-sm text-muted-foreground">{formatDateTime(booking.arrivalAt, "EEE, dd MMM yyyy")}</span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Booking ID</dt>
            <dd className="font-mono font-medium">{booking.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Class</dt>
            <dd className="font-medium">
              {CLASS_INFO[booking.classCode].label} ({booking.classCode})
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Quota</dt>
            <dd className="font-medium">{QUOTA_INFO[booking.quota].label}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <BookingStatusBadge status={booking.status} />
            </dd>
          </div>
        </dl>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Age / Gender</TableHead>
                <TableHead>Booking status</TableHead>
                <TableHead>Current status</TableHead>
                <TableHead>Coach / Berth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {booking.passengers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.serial}</TableCell>
                  <TableCell className="font-medium">{p.fullName}</TableCell>
                  <TableCell>
                    {p.age} / {p.gender}
                  </TableCell>
                  <TableCell>
                    <PassengerStatusBadge status={p.bookingStatus} position={p.bookingPosition} />
                  </TableCell>
                  <TableCell>
                    <PassengerStatusBadge status={p.currentStatus} position={p.currentPosition} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {p.currentStatus === "CNF" && p.coach
                      ? `${p.coach} / ${p.berthNumber} ${BERTH_TYPE_LABEL[p.berthType ?? ""] ?? ""}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Separator />

        <div className="grid gap-6 sm:grid-cols-2">
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Ticket fare</dt>
              <dd className="tabular-nums">{formatCurrency(booking.baseFare)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Convenience fee</dt>
              <dd className="tabular-nums">{formatCurrency(booking.convenienceFee)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total paid</dt>
              <dd className="tabular-nums">{formatCurrency(booking.totalAmount)}</dd>
            </div>
            {booking.cancellation && (
              <>
                <div className="flex justify-between text-destructive">
                  <dt>Cancellation charges</dt>
                  <dd className="tabular-nums">−{formatCurrency(booking.cancellation.charges)}</dd>
                </div>
                <div className="flex justify-between font-semibold text-success">
                  <dt>Refund (simulated)</dt>
                  <dd className="tabular-nums">{formatCurrency(booking.cancellation.refundAmount)}</dd>
                </div>
              </>
            )}
          </dl>
          <dl className="flex flex-col gap-1.5 text-sm">
            {payment && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Paid via</dt>
                  <dd className="truncate">{payment.methodLabel}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Transaction ref.</dt>
                  <dd className="truncate font-mono text-xs">{payment.reference}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Booked on</dt>
              <dd>{formatDateTime(booking.createdAt)}</dd>
            </div>
            {booking.cancellation && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Cancelled on</dt>
                <dd>{formatDateTime(booking.cancellation.cancelledAt)}</dd>
              </div>
            )}
          </dl>
        </div>

        <p className="text-xs text-muted-foreground">
          This is a simulated ticket generated by a demo application. It is not valid for travel and is not
          issued by IRCTC or Indian Railways.
        </p>
      </CardContent>
    </Card>
  );
}
