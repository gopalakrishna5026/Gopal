import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Select train", "Passengers", "Review", "Payment", "Confirmation"];

/** Progress indicator. `current` is the zero-based index of the active step. */
export function BookingStepper({ current, onStepClick }: { current: number; onStepClick?: (index: number) => void }) {
  return (
    <nav aria-label="Booking progress">
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const clickable = done && onStepClick;
          const content = (
            <>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done && "border-success bg-success text-success-foreground",
                  active && "border-brand bg-brand text-brand-foreground",
                  !done && !active && "bg-background text-muted-foreground",
                )}
              >
                {done ? <CheckIcon className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm whitespace-nowrap md:inline",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </>
          );
          return (
            <li key={label} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={active ? "step" : undefined}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(i)}
                  className="flex items-center gap-2 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  aria-label={`Go back to ${label}`}
                >
                  {content}
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  {content}
                  <span className="sr-only">{done ? "(completed)" : active ? "(current)" : ""}</span>
                </span>
              )}
              {i < STEPS.length - 1 && (
                <span className={cn("h-px min-w-3 flex-1", done ? "bg-success" : "bg-border")} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm font-medium md:hidden">
        Step {current + 1} of {STEPS.length}: {STEPS[current]}
      </p>
    </nav>
  );
}
