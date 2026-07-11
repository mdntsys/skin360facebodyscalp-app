# Skin 360 Business Suite

Internal management app for **Skin 360 Face Body Scalp** (Toluca Lake · Valencia) — booking, POS, and business management. Eventually replaces GlossGenius and will live at `app.skin360facebodyscalp.com`.

**Current state: V1 UI prototype.** Frontend only — every screen is populated with realistic mock data so the flow and look can be previewed. There is no auth, database, payments, file storage, or persistence; forms write to in-memory React state and reset on reload.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 — the login screen accepts anything and routes to the dashboard.

## Stack

- Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 (CSS-first `@theme`) · shadcn/ui · lucide-react · Recharts · date-fns
- Brand system in `src/app/globals.css`: white & gold palette, Cormorant Garamond headings, Jost body
- `robots` is set to noindex everywhere — this is an internal tool

## Where things live

| Path | What |
|---|---|
| `src/data/*.ts` | Typed mock-data layer (locations, services, staff, clients, appointments, inventory, memberships, packages, expenses, payments). Swap for a real API later. |
| `src/components/shell/` | Sidebar, topbar, location switcher context |
| `src/components/shared/` | PageHeader, StatCard, StatusBadge |
| `src/app/(app)/` | All authenticated screens (dashboard, appointments, clients, inventory, memberships, packages, expenses, reports, settings) |
| `src/app/login/` | Static branded sign-in |
