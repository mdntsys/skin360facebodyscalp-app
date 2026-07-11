import { format, subDays } from "date-fns";
import { locations, services, staff, membershipPlans, servicePackages, products } from "./core";
import { clients, members, intakeForms, clientNotes } from "./people";
import { appointments, weekStart } from "./appointments";
import { expenses, payments, clientPackages } from "./finance";
import type { Client, LocationId } from "./types";

export * from "./types";
export { locations, services, staff, membershipPlans, servicePackages, products };
export { clients, members, intakeForms, clientNotes };
export { appointments, weekStart };
export { expenses, payments, clientPackages };

export type LocationFilter = LocationId | "all";

export const clientById = new Map(clients.map((c) => [c.id, c]));
export const serviceById = new Map(services.map((s) => [s.id, s]));
export const staffById = new Map(staff.map((s) => [s.id, s]));
export const locationById = new Map(locations.map((l) => [l.id, l]));
export const planById = new Map(membershipPlans.map((p) => [p.id, p]));
export const packageById = new Map(servicePackages.map((p) => [p.id, p]));

export function clientName(c: Client | string | undefined): string {
  const client = typeof c === "string" ? clientById.get(c) : c;
  return client ? `${client.firstName} ${client.lastName}` : "Unknown client";
}

export function formatCurrency(n: number, opts?: { cents?: boolean }): string {
  const showCents = opts?.cents ?? n % 1 !== 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
}

export function matchesLocation(
  itemLocation: LocationId | "both",
  filter: LocationFilter
): boolean {
  return (
    filter === "all" || itemLocation === "both" || itemLocation === filter
  );
}

/**
 * Deterministic 14-day revenue trend for the dashboard chart (mock data —
 * seeded off the day index so it is stable across renders within a day).
 */
export function revenueTrend(days = 14): { date: string; label: string; revenue: number }[] {
  const out: { date: string; label: string; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dow = date.getDay();
    const closedBoost = dow === 0 || dow === 1 ? 0.35 : 1; // slow Sun/Mon
    const wave = Math.sin(date.getDate() * 1.7) * 320;
    const revenue = Math.max(180, Math.round((1350 + wave) * closedBoost));
    out.push({
      date: format(date, "yyyy-MM-dd"),
      label: format(date, "MMM d"),
      revenue,
    });
  }
  return out;
}
