import { format, isSameDay, subDays } from "date-fns";

import type { Appointment, LocationId, Payment } from "./types";

export * from "./types";
export { DataProvider, useData } from "./provider";
export type {
  DataContextValue,
  NewAppointmentInput,
  NewAvailabilityRule,
  NewClientInput,
  NewExpenseInput,
  NewOverrideInput,
  NewPackageInput,
  NewPlanInput,
  NewTimeBlockInput,
  Profile,
  ProductInput,
  RoomInput,
} from "./provider";

export type LocationFilter = LocationId | "all";

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
  return filter === "all" || itemLocation === "both" || itemLocation === filter;
}

/**
 * Daily revenue for the last `days` days: completed appointments plus
 * non-service payments (retail, packages, memberships) so nothing is
 * counted twice.
 */
export function revenueTrend(
  appointments: Appointment[],
  payments: Payment[],
  days = 14
): { date: string; label: string; revenue: number }[] {
  const out: { date: string; label: string; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(new Date(), i);
    const apptRevenue = appointments
      .filter(
        (a) => a.status === "completed" && isSameDay(new Date(a.startISO), day)
      )
      .reduce((sum, a) => sum + a.price, 0);
    const paymentRevenue = payments
      .filter(
        (p) => p.kind !== "service" && isSameDay(new Date(p.dateISO), day)
      )
      .reduce((sum, p) => sum + p.total, 0);
    out.push({
      date: format(day, "yyyy-MM-dd"),
      label: format(day, "MMM d"),
      revenue: apptRevenue + paymentRevenue,
    });
  }
  return out;
}
