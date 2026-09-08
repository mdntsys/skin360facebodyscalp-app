"use client";

// Close-out: check out visits, then print per-girl totals to pay them.
// Day is the working list. Week is the payout report. Unchecked visits
// stay on the report so gaps are visible; they are not in the pay totals.

import * as React from "react";
import {
  addDays,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
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
import {
  closeOutForDay,
  closeOutForWeek,
  type CloseOutLine,
  type StaffDay,
} from "@/lib/close-out";
import { cn } from "@/lib/utils";
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

type Range = "day" | "week";

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

  const [range, setRange] = React.useState<Range>("week");
  const [day, setDay] = React.useState(() => format(new Date(), "yyyy-MM-dd"));
  const [anchor, setAnchor] = React.useState(() => new Date());
  const [checkoutFor, setCheckoutFor] = React.useState<Appointment | null>(
    null
  );
  const [walkInOpen, setWalkInOpen] = React.useState(false);

  const selectedDay = React.useMemo(() => new Date(`${day}T12:00:00`), [day]);
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(
    addDays(weekStart, 6),
    "MMM d, yyyy"
  )}`;

  const scopedAppointments = React.useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.status !== "cancelled" &&
          matchesLocation(a.locationId, location) &&
          (!isStaff || !myStaffId || a.staffId === myStaffId)
      ),
    [appointments, location, isStaff, myStaffId]
  );

  const scopedPayments = React.useMemo(
    () =>
      payments.filter(
        (p) =>
          matchesLocation(p.locationId, location) &&
          (!isStaff || !myStaffId || p.staffId === myStaffId)
      ),
    [payments, location, isStaff, myStaffId]
  );

  const appointmentById = React.useMemo(
    () => new Map(scopedAppointments.map((a) => [a.id, a])),
    [scopedAppointments]
  );

  const paymentByAppointment = React.useMemo(() => {
    const map = new Map<string, (typeof payments)[number]>();
    for (const p of scopedPayments) {
      if (p.appointmentId) map.set(p.appointmentId, p);
    }
    return map;
  }, [scopedPayments]);

  const report = React.useMemo(
    () =>
      range === "week"
        ? closeOutForWeek(scopedPayments, scopedAppointments, anchor)
        : closeOutForDay(scopedPayments, selectedDay, scopedAppointments),
    [range, scopedPayments, scopedAppointments, anchor, selectedDay]
  );

  const staffBlocks = React.useMemo(
    () =>
      [...report.byStaff].sort((a, b) =>
        (staffById.get(a.staffId)?.name ?? "zz").localeCompare(
          staffById.get(b.staffId)?.name ?? "zz"
        )
      ),
    [report.byStaff, staffById]
  );

  const dayAppointments = React.useMemo(
    () =>
      scopedAppointments.filter((a) =>
        isSameDay(new Date(a.startISO), selectedDay)
      ),
    [scopedAppointments, selectedDay]
  );

  const packagesTotal = report.packagesSold.reduce((s, p) => s + p.total, 0);
  const outstanding = report.outstandingCount;
  const rangeVisitCount =
    range === "week"
      ? scopedAppointments.filter((a) => {
          const t = new Date(a.startISO).getTime();
          return t >= weekStart.getTime() && t < weekEnd.getTime();
        }).length
      : dayAppointments.length;

  const walkInDay =
    range === "week"
      ? (() => {
          const now = new Date();
          const inThisWeek =
            now.getTime() >= weekStart.getTime() &&
            now.getTime() < weekEnd.getTime();
          return format(inThisWeek ? now : weekStart, "yyyy-MM-dd");
        })()
      : day;

  const periodWord = range === "week" ? "week" : "day";

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Close-Out"
          subtitle={
            outstanding > 0
              ? `${outstanding} of ${rangeVisitCount} visit${rangeVisitCount === 1 ? "" : "s"} not checked out — they show on the report, not in the totals you pay`
              : rangeVisitCount === 0
                ? range === "week"
                  ? "Nothing on the books this week"
                  : isStaff
                    ? "Your visits are checked out"
                    : "No visits this day"
                : isStaff
                  ? "Your visits are checked out"
                  : `Every visit this ${periodWord} is checked out — print the report below`
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-line bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setDay(format(anchor, "yyyy-MM-dd"));
                    setRange("day");
                  }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm transition",
                    range === "day"
                      ? "bg-ink text-ivory"
                      : "text-ink-soft hover:bg-cream"
                  )}
                >
                  Day
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnchor(selectedDay);
                    setRange("week");
                  }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm transition",
                    range === "week"
                      ? "bg-ink text-ivory"
                      : "text-ink-soft hover:bg-cream"
                  )}
                >
                  Week
                </button>
              </div>
              {range === "day" ? (
                <Input
                  type="date"
                  value={day}
                  onChange={(e) => e.target.value && setDay(e.target.value)}
                  className="h-10 w-[10.5rem] rounded-full border-line bg-white px-4 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50"
                />
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-full"
                    onClick={() => setAnchor(addDays(weekStart, -7))}
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="size-4" strokeWidth={1.75} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-full px-3 text-sm font-light"
                    onClick={() => setAnchor(new Date())}
                  >
                    This Week
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-full"
                    onClick={() => setAnchor(addDays(weekStart, 7))}
                    aria-label="Next week"
                  >
                    <ChevronRight className="size-4" strokeWidth={1.75} />
                  </Button>
                </div>
              )}
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

      {range === "day" && (
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
                            <HandCoins
                              data-icon="inline-start"
                              strokeWidth={1.75}
                            />
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
      )}

      <div className={range === "day" ? "mt-10 print:mt-0" : "print:mt-0"}>
        <h2 className="text-2xl text-ink">
          {range === "week"
            ? `Week Report — ${weekLabel}`
            : `Daily Report — ${format(selectedDay, "EEEE, MMMM d, yyyy")}`}
        </h2>
        <p className="mt-1 text-sm font-light text-muted-warm">
          Per girl, with tips. Totals are only visits that have been checked
          out.
        </p>

        {outstanding > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-amber-700"
              strokeWidth={1.75}
            />
            <p className="text-sm font-light text-amber-900">
              {outstanding} visit{outstanding === 1 ? "" : "s"} not checked out
              {report.outstandingBooked > 0
                ? ` (${formatCurrency(report.outstandingBooked, { cents: true })} booked)`
                : ""}
              . They show on each girl so you can see them, but they are not in
              the totals you pay until you tap Check Out.
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label={range === "week" ? "Collected This Week" : "Collected Today"}
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
            label="Still to Check Out"
            value={String(outstanding)}
            icon={AlertTriangle}
            hint={
              outstanding > 0
                ? `${formatCurrency(report.outstandingBooked, { cents: true })} booked, not in pay totals`
                : rangeVisitCount === 0
                  ? undefined
                  : "All visits on this report are checked out"
            }
            hintTone={outstanding > 0 ? "negative" : "positive"}
          />
        </div>

        {staffBlocks.length === 0 && report.packagesSold.length === 0 ? (
          <Card className="mt-5 border-line bg-white shadow-xs">
            <CardContent className="px-6 py-10 text-center text-sm font-light text-muted-warm">
              Nothing on this {periodWord} yet.
            </CardContent>
          </Card>
        ) : (
          <>
            {staffBlocks.map((block) => (
              <GirlReport
                key={block.staffId || "unassigned"}
                block={block}
                periodWord={periodWord}
                showDate={range === "week"}
                staffName={staffById.get(block.staffId)?.name ?? "Unassigned"}
                staffColor={staffById.get(block.staffId)?.color}
                clientName={clientName}
                lineLabel={(line) => lineTreatment(line, serviceById)}
                onCheckout={(id) => {
                  const appt = appointmentById.get(id);
                  if (appt) setCheckoutFor(appt);
                }}
              />
            ))}

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
                  Each line should match that machine&apos;s batch for the{" "}
                  {periodWord}. Unchecked visits are not in these numbers.
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
        day={
          checkoutFor
            ? format(new Date(checkoutFor.startISO), "yyyy-MM-dd")
            : walkInDay
        }
        lockedStaffId={isStaff ? myStaffId ?? undefined : undefined}
      />
      <CheckoutDialog
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        appointment={null}
        day={walkInDay}
        lockedStaffId={isStaff ? myStaffId ?? undefined : undefined}
      />
    </>
  );
}

function lineTreatment(
  line: CloseOutLine,
  serviceById: Map<string, { name: string }>
): string {
  if (line.checkedOut && line.description) return line.description;
  if (line.serviceId) {
    return appointmentServiceLabel(
      { serviceId: line.serviceId, addonServiceIds: line.addonServiceIds },
      serviceById
    );
  }
  return line.description || "Visit";
}

function GirlReport({
  block,
  periodWord,
  showDate,
  staffName,
  staffColor,
  clientName,
  lineLabel,
  onCheckout,
}: {
  block: StaffDay;
  periodWord: string;
  showDate: boolean;
  staffName: string;
  staffColor?: string;
  clientName: (id: string) => string;
  lineLabel: (line: CloseOutLine) => string;
  onCheckout: (appointmentId: string) => void;
}) {
  return (
    <Card className="mt-5 border-line bg-white shadow-xs print:break-inside-avoid print:shadow-none">
      <CardContent className="px-6 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: staffColor }}
          />
          <h3 className="text-lg text-ink">{staffName}</h3>
          <span className="ml-auto text-sm text-ink-soft tabular-nums">
            {formatCurrency(block.total, { cents: true })} collected
          </span>
        </div>
        {block.outstandingCount > 0 && (
          <p className="mt-1 text-xs font-light text-amber-800">
            {block.outstandingCount} not checked out
            {block.outstandingBooked > 0
              ? ` · ${formatCurrency(block.outstandingBooked, { cents: true })} booked`
              : ""}
          </p>
        )}
        <Table className="mt-2 min-w-[640px]">
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className={HEAD_CLASSES}>When</TableHead>
              <TableHead className={HEAD_CLASSES}>Client</TableHead>
              <TableHead className={HEAD_CLASSES}>Treatment</TableHead>
              <TableHead className={HEAD_CLASSES}>Paid With</TableHead>
              <TableHead className={`${HEAD_CLASSES} text-right`}>
                Amount
              </TableHead>
              <TableHead className={`${HEAD_CLASSES} text-right`}>Tip</TableHead>
              <TableHead className={`${HEAD_CLASSES} text-right`}>
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.lines.map((line) => (
              <TableRow
                key={line.id}
                className={
                  line.checkedOut
                    ? "border-line hover:bg-cream/50"
                    : "border-line bg-amber-50/40 hover:bg-amber-50/70"
                }
              >
                <TableCell className="px-4 py-3 text-sm font-light text-ink-soft tabular-nums whitespace-nowrap">
                  {format(
                    new Date(line.startISO),
                    showDate ? "EEE M/d · h:mm a" : "h:mm a"
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-ink">
                  {clientName(line.clientId)}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm font-light text-ink-soft">
                  {lineLabel(line)}
                  {line.clientPackageId && (
                    <span className="ml-2 rounded-full border border-gold-200 bg-gold-50 px-2 py-0.5 text-[11px] text-gold-700">
                      package session
                    </span>
                  )}
                </TableCell>
                <TableCell
                  className={
                    line.checkedOut
                      ? "px-4 py-3 text-sm font-light text-muted-warm"
                      : "px-4 py-3 text-sm font-light text-amber-800"
                  }
                >
                  {line.checkedOut ? (
                    line.method
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      <span>Not checked out</span>
                      {line.appointmentId ? (
                        <Button
                          size="sm"
                          className="print:hidden"
                          onClick={() => onCheckout(line.appointmentId!)}
                        >
                          Check Out
                        </Button>
                      ) : null}
                    </div>
                  )}
                </TableCell>
                <TableCell
                  className={
                    line.checkedOut
                      ? "px-4 py-3 text-right text-sm text-ink tabular-nums"
                      : "px-4 py-3 text-right text-sm font-light text-amber-800 tabular-nums"
                  }
                >
                  {formatCurrency(line.subtotal, { cents: true })}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                  {line.checkedOut
                    ? formatCurrency(line.tip, { cents: true })
                    : "—"}
                </TableCell>
                <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                  {line.checkedOut
                    ? formatCurrency(line.total, { cents: true })
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="border-line bg-cream/50 font-normal">
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={4}
                className="px-4 py-3 text-[11px] font-normal tracking-[0.14em] text-gold-700 uppercase"
              >
                {staffName} — {periodWord} total
              </TableCell>
              <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                {formatCurrency(block.serviceTotal, { cents: true })}
              </TableCell>
              <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                {formatCurrency(block.tipTotal, { cents: true })}
              </TableCell>
              <TableCell className="px-4 py-3 text-right text-sm text-ink tabular-nums">
                {formatCurrency(block.total, { cents: true })}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
