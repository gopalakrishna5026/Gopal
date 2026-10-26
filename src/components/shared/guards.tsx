"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useAppReady } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { PageSkeleton } from "./skeletons";

/** Client-side route protection (the app has no server). Shows a skeleton while resolving. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const ready = useAppReady();
  const status = useAuthStore((s) => s.status);
  const signedOut = useAuthStore((s) => s.signedOut);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && status === "anonymous") {
      router.replace(signedOut ? "/" : `/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, status, signedOut, router, pathname]);

  if (!ready || status !== "authenticated") return <PageSkeleton />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <RequireAuth>
      {role === "admin" ? (
        children
      ) : (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldAlertIcon />
              </EmptyMedia>
              <EmptyTitle>Admins only</EmptyTitle>
              <EmptyDescription>
                Your account doesn&apos;t have access to the admin console. Sign in with the demo admin
                account to manage trains.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      )}
    </RequireAuth>
  );
}

/**
 * Sends users who arrive already signed in away from login/register. Only checks once,
 * so it doesn't fight the forms' own post-login redirect.
 */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const ready = useAppReady();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (!ready || checked.current) return;
    checked.current = true;
    if (user) {
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      router.replace(safeNext ?? (user.role === "admin" ? "/admin/dashboard" : "/"));
    }
  }, [ready, user, router]);

  return <>{children}</>;
}
