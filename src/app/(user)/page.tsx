import {
  ArmchairIcon,
  BadgePercentIcon,
  PrinterIcon,
  ShieldCheckIcon,
  TimerResetIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PopularRoutes } from "@/features/trains/popular-routes";
import { TrainSearchForm } from "@/features/trains/search-form";

const FEATURES = [
  {
    icon: ArmchairIcon,
    title: "Live seat inventory",
    body: "Availability updates the moment a ticket is booked or cancelled — with RAC and waiting-list queues.",
  },
  {
    icon: UsersIcon,
    title: "Saved passengers",
    body: "Store co-travellers once with berth preferences and add them to any booking in one tap.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Safe mock payments",
    body: "Cards are stored masked (last 4 only) and CVVs are never saved. No real money moves.",
  },
  {
    icon: TimerResetIcon,
    title: "Instant cancellation",
    body: "See the cancellation charge and refund before you confirm. Freed seats go to the next in queue.",
  },
  {
    icon: PrinterIcon,
    title: "Printable e-tickets",
    body: "Every confirmed booking gets a PNR and a print-ready ticket with coach and berth details.",
  },
  {
    icon: BadgePercentIcon,
    title: "Quota-aware fares",
    body: "General, Tatkal, Ladies and Senior Citizen quotas each have their own seats and pricing.",
  },
];

function HeroTrain() {
  // Purely decorative CSS train on a track.
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-24 overflow-hidden md:block">
      <div className="absolute inset-x-0 bottom-6 h-1 bg-primary-foreground/15" />
      <div className="absolute inset-x-0 bottom-4 h-px bg-[repeating-linear-gradient(90deg,transparent_0_18px,oklch(1_0_0/0.18)_18px_24px)]" />
      <div className="animate-[train_28s_linear_infinite] absolute bottom-7 flex gap-1.5">
        <div className="h-12 w-28 rounded-l-[2.5rem] rounded-r-md bg-highlight shadow-lg">
          <div className="ml-10 mt-2.5 flex gap-1.5">
            <span className="h-3.5 w-5 rounded-sm bg-white/80" />
            <span className="h-3.5 w-5 rounded-sm bg-white/80" />
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-32 rounded-md bg-white/90 shadow-lg">
            <div className="mx-3 mt-2.5 flex gap-1.5">
              {[0, 1, 2, 3].map((w) => (
                <span key={w} className="h-3.5 w-5 rounded-sm bg-primary/70" />
              ))}
            </div>
            <div className="mx-3 mt-2 h-1 rounded bg-highlight/80" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="bg-rail-pattern relative bg-primary pb-28 pt-12 text-primary-foreground md:pb-40 md:pt-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4">
          <Badge className="w-fit bg-highlight/15 text-highlight">Simulation · no real tickets</Badge>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            Book train tickets across India, <span className="text-highlight">without the queue.</span>
          </h1>
          <p className="max-w-xl text-primary-foreground/75 md:text-lg">
            Search trains, check live availability, pick berths for your whole family and get a PNR in
            under a minute.
          </p>
        </div>
        <HeroTrain />
      </section>

      <section className="relative z-10 mx-auto -mt-20 w-full max-w-7xl px-4 md:-mt-28">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Where are you travelling?</CardTitle>
            <CardDescription>Search by station name, city or code.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrainSearchForm />
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-14" aria-labelledby="popular">
        <h2 id="popular" className="text-xl font-semibold text-primary">
          Popular routes
        </h2>
        <PopularRoutes />
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-14" aria-labelledby="why">
        <h2 id="why" className="text-xl font-semibold text-primary">
          Everything you need for the journey
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-accent text-brand">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <CardTitle>{f.title}</CardTitle>
                <CardDescription>{f.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
