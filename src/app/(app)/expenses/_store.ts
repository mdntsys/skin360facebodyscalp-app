import { isSameMonth, startOfYear, subDays } from "date-fns";

import type { Expense, ExpenseCategory } from "@/data";

/**
 * Tiny client-side module store for expenses added during this session.
 * Module state survives client-side navigation; resets on full reload.
 */
let added: Expense[] = [];

export function addExpense(e: Expense): void {
  added = [e, ...added];
}

export function getAdded(): Expense[] {
  return added;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Inventory",
  "Rent",
  "Utilities",
  "Supplies",
  "Payroll",
  "Marketing",
  "Other",
];

export type RangeKey = "month" | "30" | "90" | "ytd" | "all";

export function inRange(
  dateISO: string,
  range: RangeKey,
  now: Date = new Date()
): boolean {
  const d = new Date(dateISO);
  switch (range) {
    case "month":
      return isSameMonth(d, now);
    case "30":
      return d >= subDays(now, 30);
    case "90":
      return d >= subDays(now, 90);
    case "ytd":
      return d >= startOfYear(now);
    case "all":
      return true;
  }
}

/** Subtle gold/cream badge tints per category — deliberately not rainbow. */
export const CATEGORY_TINTS: Record<ExpenseCategory, string> = {
  Inventory: "bg-gold-50 text-gold-700 border-gold-200",
  Rent: "bg-gold-100 text-gold-800 border-gold-200",
  Utilities: "bg-cream text-ink-soft border-line",
  Supplies: "bg-sand/70 text-ink-soft border-line",
  Payroll: "bg-gold-200/40 text-gold-800 border-gold-200",
  Marketing: "bg-gold-50 text-gold-600 border-gold-100",
  Other: "bg-white text-muted-warm border-line",
};
