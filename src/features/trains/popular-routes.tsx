"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStations } from "@/hooks/use-stations";
import { POPULAR_ROUTES } from "@/lib/db/seed-data";
import { shiftDateKey, todayKey } from "@/lib/utils";
import { useSearchStore } from "@/stores/search-store";

export function PopularRoutes() {
  const router = useRouter();
  const { byCode, loading } = useStations();
  const setCriteria = useSearchStore((s) => s.setCriteria);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {POPULAR_ROUTES.map(({ from, to }) =>
        loading ? (
          <Skeleton key={from + to} className="h-[76px]" />
        ) : (
          <Card
            key={from + to}
            className="group transition-shadow hover:shadow-md has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring"
          >
            <CardContent>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-left outline-none"
                onClick={() => {
                  setCriteria({ from, to, date: shiftDateKey(todayKey(), 1), classCode: "ALL", quota: "GN" });
                  router.push("/trains");
                }}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">
                    {byCode.get(from)?.city} → {byCode.get(to)?.city}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {from} – {to} · Tomorrow
                  </span>
                </span>
                <ArrowRightIcon
                  className="size-4 shrink-0 text-brand transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </button>
            </CardContent>
          </Card>
        ),
      )}
    </div>
  );
}
