import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Availability, BookingStatus, PassengerStatus } from "@/types";

const tone = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info-soft text-brand",
  muted: "bg-muted text-muted-foreground",
};

export function availabilityTone(kind: Availability["kind"]) {
  return kind === "AVAILABLE" ? tone.success : kind === "RAC" ? tone.warning : kind === "WL" ? tone.danger : tone.muted;
}

export function AvailabilityText({ availability, className }: { availability: Availability; className?: string }) {
  const color =
    availability.kind === "AVAILABLE"
      ? "text-success"
      : availability.kind === "RAC"
        ? "text-warning"
        : availability.kind === "WL"
          ? "text-destructive"
          : "text-muted-foreground";
  return <span className={cn("text-sm font-semibold tabular-nums", color, className)}>{availability.label}</span>;
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const t =
    status === "CONFIRMED" ? tone.success : status === "RAC" ? tone.warning : status === "WAITING_LIST" ? tone.info : tone.danger;
  return (
    <Badge variant="secondary" className={t}>
      {BOOKING_STATUS_LABEL[status]}
    </Badge>
  );
}

export function PassengerStatusBadge({ status, position }: { status: PassengerStatus; position?: number | null }) {
  const t = status === "CNF" ? tone.success : status === "RAC" ? tone.warning : status === "WL" ? tone.info : tone.danger;
  return (
    <Badge variant="secondary" className={cn("tabular-nums", t)}>
      {status}
      {position ? ` ${position.toString().padStart(2, "0")}` : ""}
    </Badge>
  );
}
