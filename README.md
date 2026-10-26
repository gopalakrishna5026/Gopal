# RailYatra — IRCTC-inspired Train Booking Simulation

A frontend-only train ticket booking app built for a Frontend Engineer assessment. It covers the full journey: register → search → check availability → add passengers → mock payment → PNR ticket → cancel and refund. It also has an admin console for managing trains and routes.

> **This is a simulation.** It is not affiliated with IRCTC or Indian Railways. Trains, seat availability, PNRs, payments and refunds are all generated in your browser. No real tickets are issued and no money moves.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate Next route types + `tsc --noEmit` |
| `npm test` | Vitest: business rules and IndexedDB transaction tests (uses `fake-indexeddb`) |

On first load the app creates an IndexedDB database called `railyatra` and seeds it. Refreshing never re-seeds. To start over, clear site data in DevTools → Application → Storage.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Traveller (with 3 saved passengers, a UPI ID and a card) | `priya@railyatra.demo` | `User@1234` |
| Admin | `admin@railyatra.demo` | `Admin@123` |

The login page has **Fill traveller** and **Fill admin** buttons. For a new card at checkout, use test card `4111 1111 1111 1111` with any future expiry and any 3-digit CVV.

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Zustand · Dexie.js (IndexedDB) + `dexie-react-hooks` · React Hook Form + Zod · Motion · date-fns · Sonner · Lucide.

## Architecture

```
src/
├── app/                     # Routes only: thin server pages that render feature components
│   ├── (auth)/              # /login, /register (guest-only layout)
│   ├── (user)/              # /, /trains, /trains/[id], /booking/..., /my-bookings, /profile/...
│   └── (admin)/admin/       # /admin/dashboard, /admin/trains, /new, /[id]/edit
├── components/
│   ├── ui/                  # shadcn primitives
│   ├── layout/              # header, footer, admin shell, user menu
│   ├── shared/              # guards, station combobox, date picker, badges, skeletons
│   └── booking/             # stepper, summary, printable ticket
├── features/                # Feature UI + forms: auth, trains, bookings, payments, passengers, profile, admin
├── stores/                  # Zustand: auth, search, booking wizard, app status
├── lib/
│   ├── db/                  # Dexie schema, seed data, repositories (all data access)
│   ├── rules/               # Pure business rules: inventory, fares, cancellation (unit-tested)
│   ├── validations/         # Zod schemas
│   ├── constants/           # Classes, quotas, berth types, fees, demo creds
│   └── utils/               # formatting, ids, time, password hashing
├── hooks/                   # useDbQuery (live IndexedDB queries), useStations
└── types/                   # Domain types
```

**Data flow.** UI components never touch Dexie directly. They call repository functions in `lib/db/repositories`, which use pure rules from `lib/rules`. Reads go through `useDbQuery`, a wrapper around Dexie's `useLiveQuery` that waits for DB initialisation and surfaces errors. Because the queries are live, availability, bookings and the admin tables update automatically when data changes, including from another tab.

**State split.**

- **IndexedDB** is the source of truth for users, trains, routes, schedules, inventory, passengers, payment methods, bookings and payments.
- **Zustand** holds only UI and session state:
  - `auth-store`: the session pointer (a user id plus expiry), persisted in localStorage
  - `search-store`: search criteria, filters and sort, persisted in localStorage
  - `booking-store`: wizard draft, passengers, step and payment choice, persisted in **sessionStorage** so a refresh mid-checkout keeps progress but a new tab starts clean
  - `app-store`: boot status
- Collections are never mirrored into Zustand.

**Hydration.** Persisted stores use `skipHydration`. `AppProvider` rehydrates them after mount, then opens and seeds the DB, then restores the session. Data-driven UI shows skeletons until the app is ready, so server and client markup always match.

### IndexedDB schema (Dexie)

| Table | Key / indexes | Notes |
|---|---|---|
| `users` | `id`, `&email`, `role` | PBKDF2 hash + salt, no plaintext |
| `stations` | `code`, `name`, `city` | 32 stations |
| `trains` | `id`, `&number`, … | classes with seats + full-route fare |
| `trainRoutes` | `id`, `&trainId`, `*stationCodes` | ordered stops (arr/dep/day/km); multi-entry index for station search |
| `trainSchedules` | `id`, `&trainId` | run days |
| `seatInventory` | `key` = `train\|startDate\|class\|quota` | created lazily on first booking |
| `passengers` | `id`, `userId` | saved co-travellers |
| `paymentMethods` | `id`, `userId` | masked cards (brand, last4, expiry) or UPI ID |
| `bookings` | `id`, `&pnr`, `&attemptId`, `userId`, … | `attemptId` is the idempotency key |
| `bookingPassengers` | `id`, `bookingId`, `[inventoryKey+currentStatus]` | seat / RAC / WL per passenger |
| `payments` | `id`, `attemptId`, `bookingId` | success, failed, reversed, refunded |

Schema version 2 shows a migration that backfills `stationCodes` with an `upgrade()` hook.

## Simulation rules

These rules are deliberately simplified and documented so their behaviour is predictable.

**Seat availability**

- Each class's seats are split by quota: General 70%, Tatkal 15%, Senior Citizen 10%, Ladies 5%.
- Occupancy by "other passengers" is **deterministic**. It comes from a hash of (train, date, class, quota) plus a demand curve: busier close to departure and for Tatkal, quieter 30+ days out. The same search always shows the same numbers.
- Only berth classes 2A, 3A and SL have RAC, at 10% of the quota. The waiting list is capped at max(5, 25% of the quota). Beyond that the status is **NOT AVAILABLE**.
- Statuses read like the real system: `AVAILABLE 45` (seats left), `RAC 12` / `WL 08` (the position you'd get), `NOT AVAILABLE`.
- Berth preference is honoured if such a berth is free. Otherwise the next free berth is allotted.

**Booking consistency**

- Confirmation runs inside a single IndexedDB `rw` transaction covering inventory, bookings, passengers and payments. The steps are: availability check → seat allocation → writes. IndexedDB serialises overlapping transactions, even across tabs, so the last seat can't be sold twice.
- Each checkout has an `attemptId` with a unique index. Double clicks, retries or two tabs submitting the same checkout return the same booking. The Pay button also has an in-flight guard.
- If the fare changed or availability worsened while the user was paying, the booking is rejected and the simulated payment is recorded as **reversed**. This also covers "Book only if confirmed berths are allotted".

**Queues and cancellation**

- When a confirmed passenger cancels, the front of the RAC queue gets the seat and the front of the WL moves into RAC (WL goes straight to confirmed in classes without RAC). Pre-generated passengers are always ahead of app passengers in a queue. Positions are renumbered and affected bookings' statuses update.
- Cancellation charges per passenger:
  - Confirmed tickets:
    - **more than 48 h** before departure: flat class fee (1A ₹240, 2A ₹200, 3A/CC ₹180, SL ₹120, 2S ₹60)
    - **48–12 h**: 25% of fare (minimum the flat fee)
    - **12–4 h**: 50% (minimum the flat fee)
    - **under 4 h**: no refund
    - **Tatkal**: no refund
  - RAC/WL tickets: ₹60 clerkage.
  - The convenience fee (₹35.40) is never refunded. Online cancellation closes 30 min before departure. Cancelled bookings can't be cancelled again.

**Fares and quotas**

- Fares are pro-rated by distance for intermediate-station journeys, with a minimum of 20% of the full-route fare. Tatkal is +30%. Senior Citizen is −40% (men 60+, women 58+).
- Ladies quota is for female passengers only. Tatkal allows at most 4 passengers. Other bookings allow up to 6. Children under 5 don't need a ticket.

**Admin edits.** Editing a train's seat count affects only dates that have no bookings yet. Classes, or stations on the route, that are used by upcoming active bookings can't be removed. A train with upcoming active bookings can't be deleted.

## Security notes (read before reusing any of this)

- **Authentication is simulated.** Passwords are hashed with PBKDF2-SHA256 (120k iterations, random salt) through Web Crypto, so no plaintext is stored. But the "session" is a user id in localStorage and all authorisation checks run in the browser. Anyone with DevTools can change them. A real system needs server-side authentication, httpOnly session cookies and server-enforced authorisation.
- **Payments are mocked.** No gateway is contacted. Card numbers are validated (Luhn) and then reduced to brand + last 4 digits. **CVVs are validated and discarded and are never stored.** UPI IDs are simulated.
- Route protection is client-side (`RequireAuth` / `RequireAdmin`). This is appropriate for a backend-less demo, not for production.

## Functional scenarios covered

| # | Scenario | How to try it |
|---|---|---|
| 1 | New user | Register → Profile (edit details) → Saved passengers → search → book → pay → confirmation |
| 2 | Existing user | Log in as Priya → search Mumbai → New Delhi → tap saved passengers → pay with saved UPI → My bookings |
| 3 | Cancellation | My bookings → ticket → **Cancel ticket** → review charges → confirm. Inventory is restored and queued passengers are promoted |
| 4 | Admin | Log in as admin → Add train (route, days, classes, seats, fares) → it appears in customer search immediately |
| 5 | Persistence | Book, then hard-refresh: bookings, users and in-progress checkout survive |
| 6 | Responsive | Layouts were checked at 375 px, 768 px and desktop. Filters move into a drawer and tables become cards on mobile |
| 7 | Consistency | `npm test` races two checkouts for the last seat (exactly one wins) and replays the same checkout (one booking) |

On the payment step, the **Simulated bank response** toggle lets you demo both successful and failed payments, followed by a retry.
