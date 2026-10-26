import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-primary text-primary-foreground print:hidden">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo inverted />
          <p className="max-w-md text-sm text-primary-foreground/75">
            RailYatra is a frontend engineering demo inspired by Indian railway booking platforms. It is
            not affiliated with IRCTC or Indian Railways. Trains, availability, PNRs and payments are all
            simulated in your browser.
          </p>
        </div>
        <nav aria-label="Travel" className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Travel</span>
          <Link className="text-primary-foreground/75 hover:text-primary-foreground" href="/trains">
            Find trains
          </Link>
          <Link className="text-primary-foreground/75 hover:text-primary-foreground" href="/my-bookings">
            My bookings
          </Link>
          <Link className="text-primary-foreground/75 hover:text-primary-foreground" href="/profile/passengers">
            Saved passengers
          </Link>
        </nav>
        <nav aria-label="Account" className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">Account</span>
          <Link className="text-primary-foreground/75 hover:text-primary-foreground" href="/login">
            Sign in
          </Link>
          <Link className="text-primary-foreground/75 hover:text-primary-foreground" href="/register">
            Create account
          </Link>
          <Link className="text-primary-foreground/75 hover:text-primary-foreground" href="/admin/dashboard">
            Admin console
          </Link>
        </nav>
      </div>
      <Separator className="bg-primary-foreground/15" />
      <p className="mx-auto w-full max-w-7xl px-4 py-4 text-xs text-primary-foreground/60">
        Demo data only · No real tickets are issued and no money is charged.
      </p>
    </footer>
  );
}
