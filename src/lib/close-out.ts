// Close-out aggregation — per girl (to pay them) and per tender (to match
// the terminal batches). Unchecked visits stay on the report so gaps are
// visible; they do not count toward payout totals until Check Out.

import { addDays, startOfDay, startOfWeek } from "date-fns";

import type { Appointment, Payment } from "../data/types";

export interface CloseOutLine {
  id: string;
  clientId: string;
  staffId: string;
  startISO: string;
  description: string;
  serviceId?: string;
  addonServiceIds?: string[];
  method: string;
  subtotal: number;
  tip: number;
  total: number;
  checkedOut: boolean;
  clientPackageId?: string;
  appointmentId?: string;
}

export interface StaffDay {
  staffId: string;
  lines: CloseOutLine[];
  serviceTotal: number;
  tipTotal: number;
  total: number;
  outstandingCount: number;
  outstandingBooked: number;
}

export interface CloseOutDay {
  byStaff: StaffDay[];
  /** Money actually taken per tender (zero-total rows excluded). */
  methodTotals: { method: string; total: number }[];
  packagesSold: Payment[];
  serviceTotal: number;
  tipTotal: number;
  /** Every dollar taken in the range, all kinds. */
  grandTotal: number;
  outstandingCount: number;
  outstandingBooked: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function inLocalRange(
  iso: string,
  start: Date,
  endExclusive: Date
): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < endExclusive.getTime();
}

function emptyStaff(staffId: string): StaffDay {
  return {
    staffId,
    lines: [],
    serviceTotal: 0,
    tipTotal: 0,
    total: 0,
    outstandingCount: 0,
    outstandingBooked: 0,
  };
}

/** Local calendar day: midnight → next midnight. */
export function closeOutForDay(
  payments: Payment[],
  day: Date,
  appointments: Appointment[] = []
): CloseOutDay {
  const start = startOfDay(day);
  return closeOutForRange(payments, appointments, start, addDays(start, 1));
}

/** Salon week Monday–Sunday, same window as the schedule. */
export function closeOutForWeek(
  payments: Payment[],
  appointments: Appointment[],
  anchor: Date
): CloseOutDay {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return closeOutForRange(payments, appointments, start, addDays(start, 7));
}

export function closeOutForRange(
  payments: Payment[],
  appointments: Appointment[],
  start: Date,
  endExclusive: Date
): CloseOutDay {
  const inRange = (iso: string) => inLocalRange(iso, start, endExclusive);
  const rangedPayments = payments.filter((p) => inRange(p.dateISO));
  const paidAppointmentIds = new Set(
    payments.filter((p) => p.appointmentId).map((p) => p.appointmentId)
  );

  const byStaffMap = new Map<string, StaffDay>();
  const methodMap = new Map<string, number>();
  const packagesSold: Payment[] = [];
  let serviceTotal = 0;
  let tipTotal = 0;
  let grandTotal = 0;
  let outstandingCount = 0;
  let outstandingBooked = 0;

  const staff = (id: string) => {
    const entry = byStaffMap.get(id) ?? emptyStaff(id);
    byStaffMap.set(id, entry);
    return entry;
  };

  for (const p of rangedPayments) {
    grandTotal += p.total;
    if (p.total > 0) {
      methodMap.set(p.method, (methodMap.get(p.method) ?? 0) + p.total);
    }
    if (p.kind === "package") {
      packagesSold.push(p);
      continue;
    }
    if (p.kind !== "service") continue;

    serviceTotal += p.subtotal;
    tipTotal += p.tip;
    const entry = staff(p.staffId ?? "");
    entry.lines.push({
      id: p.id,
      clientId: p.clientId,
      staffId: p.staffId ?? "",
      startISO: p.dateISO,
      description: p.description,
      serviceId: p.serviceId,
      method: p.method,
      subtotal: p.subtotal,
      tip: p.tip,
      total: p.total,
      checkedOut: true,
      clientPackageId: p.clientPackageId,
      appointmentId: p.appointmentId,
    });
    entry.serviceTotal += p.subtotal;
    entry.tipTotal += p.tip;
    entry.total += p.total;
  }

  for (const a of appointments) {
    if (a.status === "cancelled") continue;
    if (!inRange(a.startISO)) continue;
    if (paidAppointmentIds.has(a.id)) continue;
    const entry = staff(a.staffId);
    entry.lines.push({
      id: `open-${a.id}`,
      clientId: a.clientId,
      staffId: a.staffId,
      startISO: a.startISO,
      description: "",
      serviceId: a.serviceId,
      addonServiceIds: a.addonServiceIds,
      method: "",
      subtotal: a.price,
      tip: 0,
      total: 0,
      checkedOut: false,
      appointmentId: a.id,
    });
    entry.outstandingCount += 1;
    entry.outstandingBooked += a.price;
    outstandingCount += 1;
    outstandingBooked += a.price;
  }

  for (const entry of byStaffMap.values()) {
    entry.lines.sort((a, b) => a.startISO.localeCompare(b.startISO));
    entry.serviceTotal = round2(entry.serviceTotal);
    entry.tipTotal = round2(entry.tipTotal);
    entry.total = round2(entry.total);
    entry.outstandingBooked = round2(entry.outstandingBooked);
  }

  return {
    byStaff: [...byStaffMap.values()],
    methodTotals: [...methodMap.entries()].map(([method, total]) => ({
      method,
      total: round2(total),
    })),
    packagesSold,
    serviceTotal: round2(serviceTotal),
    tipTotal: round2(tipTotal),
    grandTotal: round2(grandTotal),
    outstandingCount,
    outstandingBooked: round2(outstandingBooked),
  };
}
