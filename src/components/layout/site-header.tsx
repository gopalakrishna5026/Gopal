"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboardIcon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  TicketIcon,
  TrainFrontIcon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { useAppReady } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { UserMenu, useLogout } from "./user-menu";

const NAV = [
  { href: "/", label: "Book Tickets", icon: TrainFrontIcon, exact: true },
  { href: "/trains", label: "Find Trains", icon: SearchIcon },
  { href: "/my-bookings", label: "My Bookings", icon: TicketIcon, auth: true },
  { href: "/profile", label: "Profile", icon: UserIcon, auth: true },
];

function useNav() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const items = [
    ...NAV.filter((n) => !n.auth || user),
    ...(user?.role === "admin"
      ? [{ href: "/admin/dashboard", label: "Admin", icon: LayoutDashboardIcon, exact: false }]
      : []),
  ];
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return { items, isActive, user };
}

export function SiteHeader() {
  const ready = useAppReady();
  const { items, isActive, user } = useNav();
  const [open, setOpen] = useState(false);
  const onLogout = useLogout();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 print:hidden">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4">
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href, item.exact) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive(item.href, item.exact) && "bg-accent text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!ready ? (
            <Skeleton className="h-9 w-28" />
          ) : user ? (
            <UserMenu user={user} />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="bg-highlight text-highlight-foreground hover:bg-highlight/90">
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle asChild>
                  <div>
                    <Logo />
                  </div>
                </SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(item.href, item.exact) ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-muted",
                      isActive(item.href, item.exact) && "bg-accent text-accent-foreground",
                    )}
                  >
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                ))}
                <Separator className="my-3" />
                {user ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOutIcon data-icon="inline-start" />
                    Sign out
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link href="/login">
                        <LogInIcon data-icon="inline-start" />
                        Sign in
                      </Link>
                    </Button>
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link href="/register">Create account</Link>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
