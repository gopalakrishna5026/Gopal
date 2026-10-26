import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import type { Station } from "@/types";

interface Props {
  departure: string;
  arrival: string;
  fromCode: string;
  toCode: string;
  durationMinutes: number;
  dayDiff: number;
  stations: Map<string, Station>;
  distanceKm?: number;
}

export function JourneyTimeline({ departure, arrival, fromCode, toCode, durationMinutes, dayDiff, stations, distanceKm }: Props) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-6">
      <div className="flex flex-col">
        <span className="text-xl font-semibold tabular-nums sm:text-2xl">{departure}</span>
        <span className="text-sm font-medium">{fromCode}</span>
        <span className="hidden max-w-36 truncate text-xs text-muted-foreground sm:block">
          {stations.get(fromCode)?.name}
        </span>
      </div>
      <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
        <span>{formatDuration(durationMinutes)}</span>
        <div className="flex w-full items-center gap-1" aria-hidden>
          <span className="size-2 rounded-full border-2 border-brand" />
          <span className="h-px flex-1 border-t border-dashed border-muted-foreground/50" />
          <span className="size-2 rounded-full bg-brand" />
        </div>
        {distanceKm !== undefined && <span>{distanceKm} km</span>}
      </div>
      <div className="flex flex-col items-end text-right">
        <span className="flex items-center gap-1.5 text-xl font-semibold tabular-nums sm:text-2xl">
          {arrival}
          {dayDiff > 0 && (
            <Badge variant="secondary" className="text-[10px]" title={`Arrives ${dayDiff} day(s) later`}>
              +{dayDiff}
            </Badge>
          )}
        </span>
        <span className="text-sm font-medium">{toCode}</span>
        <span className="hidden max-w-36 truncate text-xs text-muted-foreground sm:block">
          {stations.get(toCode)?.name}
        </span>
      </div>
    </div>
  );
}
