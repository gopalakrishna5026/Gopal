"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, LayoutDashboardIcon, MenuIcon, PlusCircleIcon, TrainFrontIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { UserMenu } from "./user-menu";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/admin/trains", label: "Trains & routes", icon: TrainFrontIcon },
  { href: "/admin/trains/new", label: "Add train", icon: PlusCircleIcon },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/admin/trains" ? pathname === href || /^\/admin\/trains\/[^/]+\/edit/.test(pathname) : pathname === href;
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
      <div className="px-2 pt-2">
        <Logo inverted />
        <span className="mt-1 block text-xs text-sidebar-foreground/70">Admin console</span>
      </div>
      <nav aria-label="Admin" className="flex flex-col gap-1">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            aria-current={active(l.href) ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
              active(l.href) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
            )}
          >
            <l.icon className="size-4" aria-hidden />
            {l.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/"
        onClick={onNavigate}
        className="mt-auto flex h-10 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Back to booking site
      </Link>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)!;
  const [open, setOpen] = useState(false);
  return (
    <div className="grid min-h-svh md:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-svh md:block">
        <SidebarNav />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur md:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open admin menu">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-0 p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <SheetDescription className="sr-only">Navigate the admin console</SheetDescription>
              <SidebarNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-medium text-muted-foreground">RailYatra Admin</span>
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>
        <main id="main" className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
