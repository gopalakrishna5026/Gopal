"use client";

import { useEffect } from "react";
import { DatabaseIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initDatabase } from "@/lib/db";
import { errorMessage } from "@/lib/errors";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useBookingStore } from "@/stores/booking-store";
import { useSearchStore } from "@/stores/search-store";

async function boot() {
  // Persisted stores use skipHydration so the server render and the first client
  // render match; we hydrate them here, after mount.
  await Promise.all([
    useAuthStore.persist.rehydrate(),
    useSearchStore.persist.rehydrate(),
    useBookingStore.persist.rehydrate(),
  ]);
  await initDatabase();
  await useAuthStore.getState().restore();
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const setStatus = useAppStore((s) => s.setStatus);

  useEffect(() => {
    boot()
      .then(() => setStatus("ready"))
      .catch((e) => setStatus("error", errorMessage(e, "Could not open the local database.")));
  }, [setStatus]);

  return (
    <TooltipProvider delayDuration={200}>
      {status === "error" ? (
        <div className="flex min-h-svh items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <DatabaseIcon />
              </EmptyMedia>
              <EmptyTitle>We couldn&apos;t start the app</EmptyTitle>
              <EmptyDescription>
                {error} RailYatra stores everything in your browser&apos;s IndexedDB. Private browsing
                modes or blocked site storage can prevent this.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => window.location.reload()}>
                <RotateCwIcon data-icon="inline-start" />
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        children
      )}
      <Toaster theme="light" position="top-center" richColors closeButton />
    </TooltipProvider>
  );
}
