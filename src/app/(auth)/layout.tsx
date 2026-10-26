import { CheckCircle2Icon } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { GuestOnly } from "@/components/shared/guards";

const POINTS = [
  "Search 25 sample trains across 30+ Indian stations",
  "Live seat inventory with RAC & waiting list simulation",
  "Saved passengers, payment methods and printable tickets",
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <GuestOnly>
      <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
        {/* Pinned to the viewport while the form column scrolls. */}
        <aside className="bg-rail-pattern sticky top-0 hidden h-svh flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
          <Logo inverted />
          <div className="flex max-w-md flex-col gap-6">
            <h2 className="text-3xl font-semibold leading-tight">
              Plan your next journey across India — in a few taps.
            </h2>
            <ul className="flex flex-col gap-3 text-primary-foreground/85">
              {POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-highlight" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-primary-foreground/60">
            Simulation only — not affiliated with IRCTC or Indian Railways.
          </p>
        </aside>
        <main className="flex flex-col items-center justify-center gap-8 px-4 py-10">
          <Logo className="lg:hidden" />
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </GuestOnly>
  );
}
