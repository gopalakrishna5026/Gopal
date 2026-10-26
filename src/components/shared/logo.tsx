import Link from "next/link";
import { TrainFrontIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 rounded-md font-semibold tracking-tight", className)}
      aria-label="RailYatra home"
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          inverted ? "bg-white text-primary" : "bg-primary text-primary-foreground",
        )}
      >
        <TrainFrontIcon className="size-4.5" aria-hidden />
      </span>
      <span className={cn("text-lg", inverted ? "text-white" : "text-primary")}>
        Rail<span className="text-highlight">Yatra</span>
      </span>
    </Link>
  );
}
