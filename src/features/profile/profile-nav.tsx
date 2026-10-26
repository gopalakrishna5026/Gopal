"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCardIcon, TicketIcon, UserIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/profile", label: "Personal details", icon: UserIcon },
  { href: "/profile/passengers", label: "Saved passengers", icon: UsersIcon },
  { href: "/profile/payment-methods", label: "Payment methods", icon: CreditCardIcon },
  { href: "/my-bookings", label: "Booking history", icon: TicketIcon },
];

export function ProfileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Profile sections" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-1 rounded-lg bg-muted p-1 md:w-fit">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active && "bg-card text-foreground shadow-sm",
                )}
              >
                <l.icon className="size-4" aria-hidden />
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
