// Pure aggregation for the end-of-day close-out report — no React, no I/O.
// Groups one day's money the two ways Carolina reconciles it: per girl
// (what each performed, with tips, to pay them out) and per tender (to match
// the GoDaddy / Square terminal batch totals).

import { isSameDay } from "date-fns";

import type { Payment } from "../data/types";

export interface StaffDay {
  staffId: string;
  lines: Payment[];
  serviceTotal: number;
  tipTotal: number;
  total: number;
}

export interface CloseOutDay {
  byStaff: StaffDay[];
  /** Money actually taken per tender (zero-total rows excluded). */
  methodTotals: { method: string; total: number }[];
  packagesSold: Payment[];
  serviceTotal: number;
  tipTotal: number;
  /** Every dollar taken that day, all kinds. */
  grandTotal: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function closeOutForDay(payments: Payment[], day: Date): CloseOutDay {
  const todays = payments.filter((p) => isSameDay(new Date(p.dateISO), day));

  const byStaffMap = new Map<string, StaffDay>();
  const methodMap = new Map<string, number>();
  const packagesSold: Payment[] = [];
  let serviceTotal = 0;
  let tipTotal = 0;
  let grandTotal = 0;

  for (const p of todays) {
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
    const key = p.staffId ?? "";
    const entry = byStaffMap.get(key) ?? {
      staffId: key,
      lines: [],
      serviceTotal: 0,
      tipTotal: 0,
      total: 0,
    };
    entry.lines.push(p);
    entry.serviceTotal += p.subtotal;
    entry.tipTotal += p.tip;
    entry.total += p.total;
    byStaffMap.set(key, entry);
  }

  return {
    byStaff: [...byStaffMap.values()].map((e) => ({
      ...e,
      serviceTotal: round2(e.serviceTotal),
      tipTotal: round2(e.tipTotal),
      total: round2(e.total),
    })),
    methodTotals: [...methodMap.entries()].map(([method, total]) => ({
      method,
      total: round2(total),
    })),
    packagesSold,
    serviceTotal: round2(serviceTotal),
    tipTotal: round2(tipTotal),
    grandTotal: round2(grandTotal),
  };
}
