"use client";

import * as React from "react";
import Link from "next/link";
import { format, isSameMonth, subDays } from "date-fns";
import { ArrowLeft, ArrowUpDown, Paperclip, Plus } from "lucide-react";

import {
  formatCurrency,
  useData,
  type Expense,
  type ExpenseCategory,
} from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortKey = "date" | "amount";
type SortDir = "asc" | "desc";

type RangeKey = "month" | "30" | "90" | "all";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Inventory",
  "Rent",
  "Utilities",
  "Supplies",
  "Payroll",
  "Marketing",
  "Other",
];

/** Subtle gold/cream badge tints per category — deliberately not rainbow. */
const CATEGORY_TINTS: Record<ExpenseCategory, string> = {
  Inventory: "bg-gold-50 text-gold-700 border-gold-200",
  Rent: "bg-gold-100 text-gold-800 border-gold-200",
  Utilities: "bg-cream text-ink-soft border-line",
  Supplies: "bg-sand/70 text-ink-soft border-line",
  Payroll: "bg-gold-200/40 text-gold-800 border-gold-200",
  Marketing: "bg-gold-50 text-gold-600 border-gold-100",
  Other: "bg-white text-muted-warm border-line",
};

function inRange(dateISO: string, range: RangeKey, now: Date): boolean {
  const d = new Date(dateISO);
  switch (range) {
    case "month":
      return isSameMonth(d, now);
    case "30":
      return d >= subDays(now, 30);
    case "90":
      return d >= subDays(now, 90);
    case "all":
      return true;
  }
}

function CategoryBadge({ category }: { category: ExpenseCategory }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[11px] font-normal",
        CATEGORY_TINTS[category]
      )}
    >
      {category}
    </Badge>
  );
}

export default function AllExpensesPage() {
  const { expenses } = useData();
  const [category, setCategory] = React.useState<ExpenseCategory | "all">(
    "all"
  );
  const [range, setRange] = React.useState<RangeKey>("month");
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const filtered = React.useMemo(() => {
    const now = new Date();
    const rows = expenses.filter(
      (e) =>
        (category === "all" || e.category === category) &&
        inRange(e.dateISO, range, now)
    );
    return rows.sort((a, b) => {
      const cmp =
        sortKey === "date"
          ? new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
          : a.amount - b.amount;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [expenses, category, range, sortKey, sortDir]);

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = React.useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const e of filtered) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <>
      <Link
        href="/expenses"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-light text-muted-warm transition-colors hover:text-gold-700"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Expenses
      </Link>

      <PageHeader
        title="All Expenses"
        subtitle="Browse, sort, and filter everything you've spent"
        actions={
          <Button asChild variant="outline">
            <Link href="/expenses/new">
              <Plus data-icon="inline-start" strokeWidth={1.75} />
              Add Expense
            </Link>
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as ExpenseCategory | "all")}
        >
          <SelectTrigger className="h-10! rounded-full border-line bg-white px-4 text-sm shadow-xs focus-visible:border-gold-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="h-10! rounded-full border-line bg-white px-4 text-sm shadow-xs focus-visible:border-gold-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary chips */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-heading text-2xl leading-none text-ink">
          {formatCurrency(total)}
        </span>
        <span className="mr-2 text-xs font-light text-muted-warm">
          {filtered.length} expense{filtered.length === 1 ? "" : "s"}
        </span>
        {categoryTotals.map(([c, amt]) => (
          <span
            key={c}
            className="rounded-full bg-cream px-3 py-1 text-xs font-light text-ink-soft"
          >
            {c} · <span className="font-normal">{formatCurrency(amt)}</span>
          </span>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="mt-5 hidden border-line bg-white py-2 shadow-xs md:block">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs tracking-wide text-muted-warm uppercase">
                  <button
                    type="button"
                    onClick={() => toggleSort("date")}
                    className={cn(
                      "inline-flex items-center gap-1 uppercase transition-colors hover:text-gold-700",
                      sortKey === "date" && "text-gold-700"
                    )}
                  >
                    Date
                    <ArrowUpDown className="size-3.5" strokeWidth={1.75} />
                  </button>
                </TableHead>
                <TableHead className="text-xs tracking-wide text-muted-warm uppercase">
                  Category
                </TableHead>
                <TableHead className="text-xs tracking-wide text-muted-warm uppercase">
                  Vendor
                </TableHead>
                <TableHead className="text-xs tracking-wide text-muted-warm uppercase">
                  Description
                </TableHead>
                <TableHead className="text-xs tracking-wide text-muted-warm uppercase">
                  Recurring
                </TableHead>
                <TableHead className="text-xs tracking-wide text-muted-warm uppercase">
                  Receipt
                </TableHead>
                <TableHead className="text-right text-xs tracking-wide text-muted-warm uppercase">
                  <button
                    type="button"
                    onClick={() => toggleSort("amount")}
                    className={cn(
                      "inline-flex items-center gap-1 uppercase transition-colors hover:text-gold-700",
                      sortKey === "amount" && "text-gold-700"
                    )}
                  >
                    Amount
                    <ArrowUpDown className="size-3.5" strokeWidth={1.75} />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm font-light text-muted-warm"
                  >
                    {expenses.length === 0
                      ? "No expenses recorded yet."
                      : "No expenses match this filter."}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((e: Expense) => (
                <TableRow key={e.id} className="hover:bg-cream/50">
                  <TableCell className="whitespace-nowrap text-sm text-ink">
                    {format(new Date(e.dateISO), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={e.category} />
                  </TableCell>
                  <TableCell className="text-sm text-ink-soft">
                    {e.vendor ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-sm font-light text-muted-warm">
                    {e.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    {e.recurring ? (
                      <StatusBadge status="recurring" />
                    ) : (
                      <span className="text-sm text-muted-warm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {e.receiptName ? (
                      <Paperclip
                        className="size-4 text-gold-600"
                        strokeWidth={1.75}
                        aria-label={e.receiptName}
                      />
                    ) : (
                      <span className="text-sm text-muted-warm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-ink tabular-nums">
                    {formatCurrency(e.amount, { cents: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {filtered.length > 0 && (
              <TableFooter className="bg-transparent">
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="text-xs tracking-wide text-muted-warm uppercase"
                  >
                    Total · {filtered.length} expense
                    {filtered.length === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell className="text-right font-heading text-lg text-ink tabular-nums">
                    {formatCurrency(total, { cents: true })}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* Mobile stacked cards */}
      <div className="mt-5 space-y-3 md:hidden">
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm font-light text-muted-warm">
            {expenses.length === 0
              ? "No expenses recorded yet."
              : "No expenses match this filter."}
          </p>
        )}
        {filtered.map((e: Expense) => (
          <Card key={e.id} className="border-line bg-white shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{e.vendor ?? e.category}</p>
                  <p className="text-xs font-light text-muted-warm">
                    {format(new Date(e.dateISO), "MMM d, yyyy")}
                  </p>
                </div>
                <span className="shrink-0 font-heading text-lg text-ink tabular-nums">
                  {formatCurrency(e.amount, { cents: true })}
                </span>
              </div>
              {e.description && (
                <p className="mt-2 truncate text-xs font-light text-muted-warm">
                  {e.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CategoryBadge category={e.category} />
                {e.recurring && <StatusBadge status="recurring" />}
                {e.receiptName && (
                  <span className="inline-flex items-center gap-1 text-xs font-light text-muted-warm">
                    <Paperclip className="size-3.5" strokeWidth={1.75} />
                    {e.receiptName}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
