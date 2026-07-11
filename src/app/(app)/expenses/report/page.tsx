"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Crown,
  DollarSign,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import {
  expenses as seedExpenses,
  formatCurrency,
  type ExpenseCategory,
} from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdded, inRange, type RangeKey } from "../_store";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
];

const chartConfig = {
  total: { label: "Total", color: "var(--color-gold)" },
} satisfies ChartConfig;

const BAR_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--color-gold-600)",
  "var(--color-gold-300)",
];

export default function ExpenseReportPage() {
  const [range, setRange] = React.useState<RangeKey>("month");

  const merged = React.useMemo(
    () => [...getAdded(), ...seedExpenses],
    []
  );

  const filtered = React.useMemo(
    () => merged.filter((e) => inRange(e.dateISO, range)),
    [merged, range]
  );

  const grandTotal = filtered.reduce((sum, e) => sum + e.amount, 0);

  const rows = React.useMemo(() => {
    const map = new Map<ExpenseCategory, { total: number; count: number }>();
    for (const e of filtered) {
      const cur = map.get(e.category) ?? { total: 0, count: 0 };
      map.set(e.category, {
        total: cur.total + e.amount,
        count: cur.count + 1,
      });
    }
    return [...map.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const topCategory = rows[0]?.category ?? "—";

  // Unique recurring line items (deduped by vendor + amount) → monthly commitment.
  const recurringMonthly = React.useMemo(() => {
    const seen = new Set<string>();
    let sum = 0;
    for (const e of filtered) {
      if (!e.recurring) continue;
      const key = `${e.vendor ?? ""}|${e.amount}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sum += e.amount;
    }
    return sum;
  }, [filtered]);

  const rangeLabel =
    RANGE_OPTIONS.find((o) => o.value === range)?.label ?? "";

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
        title="Expense Report"
        subtitle="Category breakdown and totals for any period"
        actions={
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
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Grand Total"
          value={formatCurrency(grandTotal)}
          icon={DollarSign}
          hint={rangeLabel}
        />
        <StatCard
          label="Top Category"
          value={topCategory}
          icon={Crown}
          hint={
            rows[0] ? `${formatCurrency(rows[0].total)} spent` : "No expenses"
          }
        />
        <StatCard
          label="Transactions"
          value={filtered.length}
          icon={ReceiptText}
          hint="In selected period"
        />
        <StatCard
          label="Recurring Commitment"
          value={formatCurrency(recurringMonthly)}
          icon={RefreshCw}
          hint="per month"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Breakdown chart */}
        <Card className="border-line bg-white shadow-xs lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-medium">
              Category Breakdown
            </CardTitle>
            <p className="text-xs font-light text-muted-warm">{rangeLabel}</p>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm font-light text-muted-warm">
                No expenses in this period.
              </p>
            ) : (
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 4 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tickLine={false}
                    axisLine={false}
                    width={92}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    }
                  />
                  <Bar isAnimationActive={false} dataKey="total" radius={6} barSize={18}>
                    {rows.map((r, i) => (
                      <Cell
                        key={r.category}
                        fill={BAR_PALETTE[i % BAR_PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Breakdown table */}
        <Card className="border-line bg-white shadow-xs lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-medium">
              Totals by Category
            </CardTitle>
            <p className="text-xs font-light text-muted-warm">
              Share of {formatCurrency(grandTotal)} total spend
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs tracking-wide text-muted-warm uppercase">
                    Category
                  </TableHead>
                  <TableHead className="text-right text-xs tracking-wide text-muted-warm uppercase">
                    Transactions
                  </TableHead>
                  <TableHead className="text-right text-xs tracking-wide text-muted-warm uppercase">
                    Total
                  </TableHead>
                  <TableHead className="w-40 text-right text-xs tracking-wide text-muted-warm uppercase">
                    % of Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-sm font-light text-muted-warm"
                    >
                      No expenses in this period.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => {
                  const pct = grandTotal > 0 ? (r.total / grandTotal) * 100 : 0;
                  return (
                    <TableRow key={r.category} className="hover:bg-cream/50">
                      <TableCell className="text-sm text-ink">
                        {r.category}
                      </TableCell>
                      <TableCell className="text-right text-sm text-ink-soft tabular-nums">
                        {r.count}
                      </TableCell>
                      <TableCell className="text-right text-sm text-ink tabular-nums">
                        {formatCurrency(r.total, { cents: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-cream sm:w-24">
                            <div
                              className="h-full rounded-full bg-gold"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs text-muted-warm tabular-nums">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-center text-xs font-light text-muted-warm">
        Report reflects the selected period · generated{" "}
        {format(new Date(), "MMMM d, yyyy")}
      </p>
    </>
  );
}
