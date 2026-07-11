"use client";

import * as React from "react";
import Link from "next/link";
import { format, isSameMonth } from "date-fns";
import {
  ChevronRight,
  FileBarChart,
  ListChecks,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { expenses, formatCurrency, type ExpenseCategory } from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getAdded } from "./_store";

const actions: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    href: "/expenses/new",
    icon: Plus,
    title: "Add New Expense",
    description: "Log a purchase, bill, or recurring cost",
  },
  {
    href: "/expenses/all",
    icon: ListChecks,
    title: "View & Track All Expenses",
    description: "Browse, sort, and filter everything you've spent",
  },
  {
    href: "/expenses/report",
    icon: FileBarChart,
    title: "Get an Expense Report",
    description: "Category breakdown and totals for any period",
  },
];

export default function ExpensesPage() {
  const now = new Date();
  const merged = React.useMemo(() => [...getAdded(), ...expenses], []);

  const thisMonth = merged.filter((e) => isSameMonth(new Date(e.dateISO), now));
  const monthTotal = thisMonth.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of thisMonth) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const topCategory =
    [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Track spending across both studios"
      />

      {/* Summary strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4 shadow-xs">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-xs font-normal tracking-[0.14em] text-muted-warm uppercase">
            {format(now, "MMMM")} so far
          </span>
          <span className="font-heading text-2xl leading-none text-ink">
            {formatCurrency(monthTotal)}
          </span>
        </div>
        {topCategory && (
          <span className="rounded-full bg-cream px-3.5 py-1.5 text-xs font-light text-ink-soft">
            Top category · <span className="font-normal">{topCategory}</span>
          </span>
        )}
      </div>

      {/* Action rows */}
      <div className="mt-6 space-y-4">
        {actions.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href} className="group block">
            <Card className="border-line bg-white shadow-xs transition-all group-hover:border-gold-300 group-hover:shadow-sm group-active:translate-y-px group-active:shadow-none">
              <CardContent className="flex items-center gap-4 p-5 sm:p-6">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-50">
                  <Icon className="size-5 text-gold-600" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-lg text-ink">{title}</h3>
                  <p className="truncate text-sm font-light text-muted-warm">
                    {description}
                  </p>
                </div>
                <ChevronRight
                  className="size-5 shrink-0 text-muted-warm transition-all group-hover:translate-x-0.5 group-hover:text-gold-600"
                  strokeWidth={1.75}
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
