# Skin 360 Business Suite

Internal management app for **Skin 360 Face Body Scalp** (Toluca Lake · Valencia) — booking, clients, inventory, and business management. Replaces GlossGenius; lives at `app.skin360facebodyscalp.com`.

**Current state: V1 on a live backend.** Auth (Supabase email/password, invite-only — no self-signup UI) and all business data run on Supabase Postgres with row-level security. Includes the scheduling layer: treatment rooms with capacities (Valencia's four rooms seeded; Facial/Body hosts two concurrent sessions; the single nail chair serializes mani/pedi bookings), contractor (1099) weekly availability + time-off overrides, per-service wind-down buffers, time blocks, and a booking-slot engine (`src/lib/scheduling/engine.ts`, vitest-covered) that powers the internal Booking Preview — the same slots the public site will offer once the master "online booking" switch (Settings → Booking, currently OFF) is connected. Valencia is the live location; Toluca Lake is flagged call-only. Still to come in later phases: payments/POS, file storage (intake form uploads, receipts), email/SMS notifications, public booking site.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL + publishable key
npm run dev
```

Sign in with a provisioned account (users are created by an admin in Supabase — there is no self-serve signup).

## Stack

- Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 (CSS-first `@theme`) · shadcn/ui · lucide-react · Recharts · date-fns
- Supabase: Postgres + Auth via `@supabase/ssr` (cookie sessions, refreshed in `src/middleware.ts`)
- Brand system in `src/app/globals.css`: white & gold palette, Cormorant Garamond headings, Jost body
- `robots` is set to noindex everywhere — this is an internal tool

## Architecture

| Path | What |
|---|---|
| `src/data/types.ts` | Domain types (camelCase, ISO date strings) |
| `src/data/db.ts` | Supabase row shapes (snake_case) + mappers into domain types |
| `src/data/provider.tsx` | `DataProvider` / `useData()` — loads all tables once per session into client state, exposes lookups (`clientById`, …) and async mutations (`createAppointment`, `addExpense`, …) that persist to Supabase then update shared state |
| `src/data/index.ts` | Pure helpers: `formatCurrency`, `matchesLocation`, `revenueTrend` |
| `src/lib/supabase/` | Browser/server/middleware Supabase clients |
| `src/middleware.ts` | Session refresh + auth routing (no session → `/login`) |
| `src/components/shell/` | Sidebar, topbar, location switcher context, data-loading gate |
| `src/app/(app)/` | All authenticated screens (dashboard, appointments, clients, inventory, memberships, packages, expenses, reports, settings) |
| `src/app/login/` | Supabase email/password sign-in |

## Database

Supabase project `Skin360` (`twvhisxiwrfpltewalrk`, us-west-1). Schema is managed through Supabase migrations (`initial_schema`, `seed_catalog`, …).

Security model: every table has RLS enabled with a single policy — full access for authenticated users who exist in `public.profiles` (an allow-list managed by admins). A self-signed-up stranger gets zero data access even with the public key.

Seeded reference data (the real business catalog): 2 locations, 12 services, staff, and the "Series of 10 Sessions" package. Everything else (clients, appointments, inventory, expenses…) is entered through the app.

## Deploy (Vercel)

Import the GitHub repo, framework preset **Next.js**, and set two environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Then point `app.skin360facebodyscalp.com` at the project (CNAME per Vercel's domain instructions).
