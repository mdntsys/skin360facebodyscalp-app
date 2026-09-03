"use client";

// End-of-day close-out — Carolina's #1 feature. Work down the day's
// appointments recording what each client actually paid and which girl did
// the work, then print the per-girl report and match the tender totals
// against the GoDaddy / Square terminal batches.

import * as React from "react";
import { format, isSameDay } from "date-fns";
import {
  Check,
  Coins,
  Gift,
  HandCoins,
  Plus,
  Printer,
  Sparkles,
} from "lucide-react";

import {
  appointmentServiceLabel,
  formatCurrency,
  matchesLocation,
  useData,
  type Appointment,
} from "@/data";
import { closeOutForDay } from "@/lib/close-out";
import { useLocationFilter } from "@/components/shell/location-context";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckoutDialog } from "./_components/checkout-dialog";

const HEAD_CLASSES =
  "px-4 text-xs font-normal tracking-wide text-muted-warm uppercase";

export default function CloseOutPage() {
  const {
    appointments,
    payments,
    staffById,
    serviceById,
    clientName,
    profile,
  } = useData();
  const { location } = useLocationFilter();
  const isStaff = profile?.access === "staff";
  const myStaffId = profile?.staffId ?? null;

  const [day, setDay] = React.useState(() => format(new Date(), "yyyy-MM-dd"));
  const [checkoutFor, setCheckoutFor] = React.useState<Appointment | null>(null);
  const [walkInOpen, setWalkInOpen] = React.useState(false);

  // Date-only string interpreted at local noon to dodge date-key drift.
  const selectedDay = React.useMemo(() => new Date(`${day}T12:00:00`), [day]);

  const dayAppointments = React.useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.status !== "cancelled" &&
          isSameDay(new Date(a.startISO), selectedDay) &&
          matchesLocation(a.locationId, location) &&
          (!isStaff || !myStaffId || a.staffId === myStaffId)
      ),
    [appointments, selectedDay, location, isStaff, myStaffId]
  );

  const dayPayments = React.useMemo(
    () =>
      payments.filter(
        (p) =>
          matchesLocation(p.locationId, location) &&
          (!isStaff || !myStaffId || p.staffId === myStaffId)
      ),
    [payments, location, isStaff, myStaffId]
  );

  const paymentByAppointment = React.useMemo(() => {
    const map = new Map<string, (typeof payments)[number]>();
    for (const p of payments) {
      if (p.appointmentId) map.set(p.appointmentId, p);
    }
    return map;
  }, [payments]);

  const report = React.useMemo(
    () => closeOutForDay(dayPayments, selectedDay),
    [dayPayments, selectedDay]
  );

  const staffDays = React.useMemo(
    () =>
      [...report.byStaff].sort((a, b) =>
        (staffById.get(a.staffId)?.name ?? "zz").localeCompare(
          staffById.get(b.staffId)?.name ?? "zz"
        )
      ),
    [report.byStaff, staffById]
  );

  const packagesTotal = report.packagesSold.reduce((s, p) => s + p.total, 0);
  const outstanding = dayAppointments.filter(
    (a) => !paymentByAppointment.has(a.id)
  ).length;

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Close-Out"
          subtitle={
            outstanding > 0
              ? `${outstanding} of ${dayAppointments.length} visits still to check out`
              : isStaff
                ? "Your visits are checked out"
                : "Every visit is checked out — print the report below"
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={day}
                onChange={(e) => e.target.value && setDay(e.target.value)}
                className="h-10 w-[10.5rem] rounded-full border-line bg-white px-4 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50"
              />
              <Button variant="outline" onClick={() => window.print()}>
                <Printer data-icon="inline-start" strokeWidth={1.75} />
                Print Report
              </Button>
              <Button onClick={() => setWalkInOpen(true)}>
                <Plus data-icon="inline-start" strokeWidth={1.75} />
                Quick Sale
              </Button>
            </div>
          }
        />
      </div>

      {/* The day's visits */}
      <Card className="border-line bg-white shadow-xs print:hidden">
        <CardContent className="px-6 py-2">
          {dayAppointments.length === 0 ? (
            <p className="py-10 text-center text-sm font-light text-muted-warm">
              No appointments on {format(selectedDay, "EEEE, MMMM d")} — use
              Quick Sale for walk-ins.
            </p>
          ) : (
            <div className="divide-y divide-line/70">
              {dayAppointments.map((a) => {
                const paid = paymentByAppointment.get(a.id);
                const staff = staffById.get(a.staffId);
                return (
                  <div
                    key={a.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-6"
                  >
                    <div className="w-20 shrink-0 text-sm text-ink-soft tabular-nums">
                      {format(new Date(a.startISO), "h:mm a")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">
                        {clientName(a.clientId)}
                      </p>
                      <p className="truncate text-xs font-light text-muted-warm">
                        {appointmentServiceLabel(a, serviceById)}
                        <span className="mx-1.5">·</span>
                        <span
                          className="mr-1 inline-block size-2 rounded-full align-baseline"
                          style={{ backgroundColor: staff?.color }}
                        />
                        {staff?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="shrink-0 sm:w-44 sm:text-right">
                      {paid ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
                          <Check className="size-4" strokeWidth={1.75} />
                          {formatCurrency(paid.total, { cents: true })}
                          <span className="text-xs font-light text-muted-warm">
                            · {paid.method}
                          </span>
                        </span>
                      ) : (
                        <Button size="sm" onClick={() => setCheckoutFor(a)}>
                          <HandCoins data-icon="inline-start" strokeWidth={1.75} />
                          Check Out
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily report — the printable part */}
      <div className="mt-10 print:mt-0">
        <h2 className="text-2xl text-ink">
          Daily Report — {format(selectedDay, "EEEE, MMMM d, yyyy")}
        </h2>
        <p className="mt-1 text-sm font-light text-muted-warm">
          Per girl, with tips — match the tender totals against the terminal
          batches.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Collected Today"
            value={formatCurrency(report.grandTotal, { cents: true })}
            icon={HandCoins}
          />
          <StatCard
            label="Services"
            value={formatCurrency(report.serviceTotal, { cents: true })}
            icon={Sparkles}
          />
          <StatCard
            label="Tips"
            value={formatCurrency(report.tipTotal, { cents: true })}
            icon={Coins}
          />
          <StatCard
            label="Packages Sold"
            value={formatCurrency(packagesTotal, { cents: true })}
            icon={Gift}
          />
        </div>

        {staffDays.length === 0 && report.packagesSold.length === 0 ? (
          <Card className="mt-5 border-line bg-white shadow-xs">
            <CardContent className="px-6 py-10 text-center text-sm font-light text-muted-warm">
              Nothing recorded for this day yet — check out the visits above
              and each girl&apos;s lines will appear here.
            </CardContent>
          </Card>
        ) : (
          <>
            {staffDays.map((sd) => {
              const staff = staffById.get(sd.staffId);
              return (
                <Card
                  key={sd.staffId || "unassigned"}
                  className="mt-5 border-line bg-white shadow-xs print:break-inside-avoid print:shadow-none"
                >
                  <CardContent className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: staff?.color }}
                      />
                      <h3 className="text-lg text-ink">
                        {staff?.name ?? "Unassigned"}
                      </h3>
                      <span className="ml-auto text-sm text-ink-soft tabular-nums">
                        {formatCurrency(sd.total, { cents: true })}
                      </span>
                    </div>
                    <Table className="mt-2 min-w-[560px]">
                      <TableHeader>
                        <TableRow className="border-line hover:bg-transparent">
                          <TableHead className={HEAD_CLASSES}>Client</TableHead>
                          <TableHead className={HEAD_CLASSES}>
                            Treatment
                          </TableHead>
                          <TableHead className={HEAD_CLASSES}>Paid With</TableHead>
                          <TableHead className={`${HEAD_CLASSES} text-right`}>
                            Amount
                          </TableHead>
                          <TableHead className={`${HEAD_CLASSES} text-right`}>
                            Tip
                          </TableHead>
                          <TableHead className={`${HEAD_CLASSES} text-right`}>
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sd.lines.map((p) => (
                          <TableRow
                            key={p.id}
                            className="border-line hover:bg-cream/50"
                          >
                            <TableCell className="px-4 py-3 text-sm text-ink">
                              {clientName(p.clientId)}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm font-light text-ink-soft">
                              {p.description}
                              {p.clientPackageId && (
                                <span className="ml-2 rounded-full border border-gold-200 bg-gold-50 px-2 py-0.5 text-[11px] text-gold-700">
                                  package session
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm font-light text-muted-warm">
                              {p.method}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                              {formatCurrency(p.subtotal, { cents: true })}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                              {formatCurrency(p.tip, { cents: true })}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                              {formatCurrency(p.total, { cents: true })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter className="border-line bg-cream/50 font-normal">
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={3}
                            className="px-4 py-3 text-[11px] font-normal tracking-[0.14em] text-gold-700 uppercase"
                          >
                            {staff?.name ?? "Unassigned"} — day total
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                            {formatCurrency(sd.serviceTotal, { cents: true })}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                            {formatCurrency(sd.tipTotal, { cents: true })}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                            {formatCurrency(sd.total, { cents: true })}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}

            {report.packagesSold.length > 0 && (
              <Card className="mt-5 border-line bg-white shadow-xs print:break-inside-avoid print:shadow-none">
                <CardContent className="px-6 py-4">
                  <h3 className="text-lg text-ink">Packages Sold</h3>
                  <div className="mt-2 divide-y divide-line/70">
                    {report.packagesSold.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-3 text-sm"
                      >
                        <span className="text-ink">
                          {clientName(p.clientId)}
                          <span className="ml-2 font-light text-muted-warm">
                            {p.description} · {p.method}
                          </span>
                        </span>
                        <span className="text-ink tabular-nums">
                          {formatCurrency(p.total, { cents: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="mt-5 border-line bg-white shadow-xs print:break-inside-avoid print:shadow-none">
              <CardContent className="px-6 py-4">
                <h3 className="text-lg text-ink">Tender Totals</h3>
                <p className="mt-0.5 text-xs font-light text-muted-warm">
                  Each line should match that machine&apos;s batch for the day.
                </p>
                <div className="mt-2 divide-y divide-line/70">
                  {report.methodTotals.map((m) => (
                    <div
                      key={m.method}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <span className="text-ink-soft">{m.method}</span>
                      <span className="text-ink tabular-nums">
                        {formatCurrency(m.total, { cents: true })}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3">
                    <span className="text-[11px] font-normal tracking-[0.14em] text-gold-700 uppercase">
                      Total collected
                    </span>
                    <span className="font-heading text-xl text-ink tabular-nums">
                      {formatCurrency(report.grandTotal, { cents: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <CheckoutDialog
        open={checkoutFor !== null}
        onOpenChange={(open) => {
          if (!open) setCheckoutFor(null);
        }}
        appointment={checkoutFor}
        day={day}
        lockedStaffId={isStaff ? myStaffId ?? undefined : undefined}
      />
      <CheckoutDialog
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        appointment={null}
        day={day}
        lockedStaffId={isStaff ? myStaffId ?? undefined : undefined}
      />
    </>
  );
}
