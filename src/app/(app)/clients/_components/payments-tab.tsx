"use client";

import { format } from "date-fns";
import { CreditCard } from "lucide-react";

import { formatCurrency, payments, type Client } from "@/data";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "./empty-state";

const headClass =
  "h-11 text-[11px] font-normal tracking-[0.14em] text-muted-warm uppercase";

const money = (n: number) =>
  n === 0 ? "—" : formatCurrency(n, { cents: true });

export function PaymentsTab({ client }: { client: Client }) {
  const rows = payments
    .filter((p) => p.clientId === client.id)
    .sort(
      (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
    );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No payments yet"
        description={`${client.firstName}'s payment history will appear here after their first checkout.`}
      />
    );
  }

  const totals = rows.reduce(
    (acc, p) => ({
      subtotal: acc.subtotal + p.subtotal,
      tip: acc.tip + p.tip,
      tax: acc.tax + p.tax,
      total: acc.total + p.total,
    }),
    { subtotal: 0, tip: 0, tax: 0, total: 0 }
  );

  return (
    <>
      {/* Desktop table */}
      <Card className="hidden border-line bg-white py-0 shadow-xs lg:block">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className={`${headClass} px-5`}>Date</TableHead>
              <TableHead className={headClass}>Description</TableHead>
              <TableHead className={headClass}>Method</TableHead>
              <TableHead className={`${headClass} hidden text-right xl:table-cell`}>
                Subtotal
              </TableHead>
              <TableHead className={`${headClass} text-right`}>Tip</TableHead>
              <TableHead className={`${headClass} text-right`}>Tax</TableHead>
              <TableHead className={`${headClass} px-5 text-right`}>
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow
                key={p.id}
                className="border-line transition-colors hover:bg-cream/50"
              >
                <TableCell className="px-5 py-3 text-sm text-ink">
                  {format(new Date(p.dateISO), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="max-w-64 truncate py-3 text-sm text-ink">
                  {p.description}
                </TableCell>
                <TableCell className="py-3 text-sm font-light text-ink-soft">
                  {p.method}
                </TableCell>
                <TableCell className="hidden py-3 text-right text-sm font-light text-ink-soft xl:table-cell">
                  {money(p.subtotal)}
                </TableCell>
                <TableCell className="py-3 text-right text-sm font-light text-ink-soft">
                  {money(p.tip)}
                </TableCell>
                <TableCell className="py-3 text-right text-sm font-light text-ink-soft">
                  {money(p.tax)}
                </TableCell>
                <TableCell className="px-5 py-3 text-right text-sm text-ink">
                  {formatCurrency(p.total, { cents: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="border-line bg-cream/50 font-normal">
            <TableRow className="border-line hover:bg-transparent">
              <TableCell
                colSpan={3}
                className="px-5 py-3.5 text-[11px] font-normal tracking-[0.14em] text-gold-700 uppercase"
              >
                Lifetime with Skin 360
              </TableCell>
              <TableCell className="hidden py-3.5 text-right text-sm text-ink xl:table-cell">
                {formatCurrency(totals.subtotal, { cents: true })}
              </TableCell>
              <TableCell className="py-3.5 text-right text-sm text-ink">
                {formatCurrency(totals.tip, { cents: true })}
              </TableCell>
              <TableCell className="py-3.5 text-right text-sm text-ink">
                {formatCurrency(totals.tax, { cents: true })}
              </TableCell>
              <TableCell className="px-5 py-3.5 text-right text-sm font-normal text-ink">
                {formatCurrency(totals.total, { cents: true })}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {rows.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-line bg-white p-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-sm text-ink">{p.description}</p>
              <p className="shrink-0 text-sm text-ink">
                {formatCurrency(p.total, { cents: true })}
              </p>
            </div>
            <p className="mt-1 text-xs font-light text-muted-warm">
              {format(new Date(p.dateISO), "MMM d, yyyy")} · {p.method}
            </p>
            {(p.tip > 0 || p.tax > 0) && (
              <p className="mt-2 border-t border-line/70 pt-2 text-xs font-light text-muted-warm">
                {p.tip > 0 && `Tip ${formatCurrency(p.tip, { cents: true })}`}
                {p.tip > 0 && p.tax > 0 && " · "}
                {p.tax > 0 && `Tax ${formatCurrency(p.tax, { cents: true })}`}
              </p>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between rounded-2xl border border-gold-200 bg-gold-50/60 p-4">
          <p className="text-[11px] font-normal tracking-[0.14em] text-gold-700 uppercase">
            Lifetime Total
          </p>
          <p className="font-heading text-xl font-medium text-ink">
            {formatCurrency(totals.total, { cents: true })}
          </p>
        </div>
      </div>
    </>
  );
}
