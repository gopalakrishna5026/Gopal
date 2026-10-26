"use client";

import { useState } from "react";
import { BanIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cancelBooking } from "@/lib/db/repositories/bookings";
import { errorMessage } from "@/lib/errors";
import { quoteCancellation } from "@/lib/rules/cancellation";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { BookingWithPassengers } from "@/types";

export function CancelBookingDialog({
  booking,
  trigger,
}: {
  booking: BookingWithPassengers;
  trigger?: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user)!;
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  // Re-quote every time the dialog opens so time-based charges are current.
  const quote = open ? quoteCancellation(booking) : null;

  const onConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await cancelBooking({ bookingId: booking.id, userId: user.id, isAdmin: user.role === "admin" });
      toast.success(
        `PNR ${booking.pnr} cancelled. Refund of ${formatCurrency(result.cancellation?.refundAmount ?? 0)} initiated (simulated).`,
      );
      setOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (pending) return;
        setOpen(o);
        setAcknowledged(false);
      }}
    >
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="destructive">
            <BanIcon data-icon="inline-start" />
            Cancel ticket
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel PNR {booking.pnr}?</AlertDialogTitle>
          <AlertDialogDescription>
            {booking.trainNumber} {booking.trainName} · {booking.fromCode} → {booking.toCode} · {booking.passengerCount}{" "}
            passenger(s). This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {quote && !quote.eligible ? (
          <Alert variant="destructive">
            <AlertDescription>{quote.reason}</AlertDescription>
          </Alert>
        ) : quote ? (
          <div className="flex flex-col gap-3 text-sm">
            <ul className="flex flex-col gap-1.5">
              {quote.lines.map((l) => (
                <li key={l.passengerId} className="flex justify-between gap-4">
                  <span className="truncate">
                    {l.name} <span className="text-muted-foreground">({l.status})</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatCurrency(l.fare)} − {formatCurrency(l.charge)}
                  </span>
                </li>
              ))}
            </ul>
            <Separator />
            <dl className="flex flex-col gap-1">
              <div className="flex justify-between">
                <dt>Cancellation charges</dt>
                <dd className="tabular-nums text-destructive">{formatCurrency(quote.charges)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Non-refundable convenience fee</dt>
                <dd className="tabular-nums">{formatCurrency(booking.convenienceFee)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Estimated refund</dt>
                <dd className="tabular-nums text-success">{formatCurrency(quote.refundAmount)}</dd>
              </div>
            </dl>
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Rule applied: {quote.ruleApplied} Simulated rules — see README.
            </p>
            <Field orientation="horizontal">
              <Checkbox id="ack-cancel" checked={acknowledged} onCheckedChange={(v) => setAcknowledged(v === true)} />
              <FieldLabel htmlFor="ack-cancel" className="font-normal">
                I understand the charges and want to cancel all passengers on this ticket.
              </FieldLabel>
            </Field>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep ticket</AlertDialogCancel>
          {quote?.eligible && (
            <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={!acknowledged || pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Confirm cancellation
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
