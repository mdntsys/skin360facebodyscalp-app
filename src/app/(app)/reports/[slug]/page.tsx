"use client";

import * as React from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  getQuarter,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Boxes,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  DollarSign,
  Download,
  FileSearch,
  HandCoins,
  Landmark,
  ListOrdered,
  Package,
  Percent,
  Receipt,
  ReceiptText,
  Repeat,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
  UserX,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import {
  formatCurrency,
  revenueTrend,
  useData,
  type PaymentMethod,
} from "@/data";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const round2 = (n: number) => Math.round(n * 100) / 100;

const goldPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--color-gold-200)",
  "var(--color-gold-400)",
];

function SectionCard({
  title,
  hint,
  children,
  className,
  scrollX = false,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  scrollX?: boolean;
}) {
  return (
    <Card className={cn("border-line bg-white shadow-xs", className)}>
      <CardHeader>
        <CardTitle className="font-heading text-xl font-medium">
          {title}
        </CardTitle>
        {hint && <p className="text-xs font-light text-muted-warm">{hint}</p>}
      </CardHeader>
      <CardContent className={cn(scrollX && "overflow-x-auto")}>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-10 text-center text-sm font-light text-muted-warm">
      {children}
    </p>
  );
}

function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className="py-10 text-center text-sm font-light text-muted-warm"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

function ReportControls() {
  const [range, setRange] = React.useState("last-30");
  return (
    <>
      <Select value={range} onValueChange={setRange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this-week">This week</SelectItem>
          <SelectItem value="this-month">This month</SelectItem>
          <SelectItem value="last-30">Last 30 days</SelectItem>
          <SelectItem value="last-90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        onClick={() => toast("Export is available in the full release")}
      >
        <Download data-icon="inline-start" strokeWidth={1.75} />
        Export CSV
      </Button>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sales                                                               */
/* ------------------------------------------------------------------ */

const salesChartConfig = {
  revenue: { label: "Revenue", color: "var(--color-gold)" },
} satisfies ChartConfig;

function SalesReport() {
  const { appointments, payments, clientName } = useData();

  const gross = round2(payments.reduce((s, p) => s + p.total, 0));
  const taxTotal = round2(payments.reduce((s, p) => s + p.tax, 0));
  const tips = round2(payments.reduce((s, p) => s + p.tip, 0));
  const net = round2(gross - taxTotal);
  const avgTicket = payments.length ? gross / payments.length : 0;

  const daily = revenueTrend(appointments, payments, 14);

  const rows = [...payments].sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Gross Revenue"
          value={formatCurrency(gross)}
          icon={DollarSign}
          hint={`${payments.length} transaction${payments.length === 1 ? "" : "s"} recorded`}
        />
        <StatCard
          label="Net Revenue"
          value={formatCurrency(net)}
          icon={Wallet}
          hint="Excludes sales tax"
        />
        <StatCard
          label="Tips Collected"
          value={formatCurrency(tips)}
          icon={HandCoins}
          hint="Paid out weekly"
          hintTone="positive"
        />
        <StatCard
          label="Avg Ticket"
          value={formatCurrency(avgTicket, { cents: true })}
          icon={ReceiptText}
          hint="Gross ÷ transactions"
        />
      </div>

      <SectionCard
        title="Daily Revenue"
        hint="Last 14 days · completed appointments & other sales"
        className="mt-6"
      >
        <ChartContainer config={salesChartConfig} className="h-64 w-full">
          <AreaChart data={daily} margin={{ left: 4, right: 12, top: 8 }}>
            <defs>
              <linearGradient id="salesAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-gold)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-gold)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => `$${v}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <Area isAnimationActive={false}
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-gold-600)"
              strokeWidth={2}
              fill="url(#salesAreaFill)"
            />
          </AreaChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard
        title="Transaction History"
        hint="Most recent first"
        className="mt-6"
        scrollX
      >
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <EmptyRow colSpan={6}>No transactions recorded yet.</EmptyRow>
            )}
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap text-muted-warm">
                  {format(parseISO(p.dateISO), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {p.clientId ? clientName(p.clientId) : "Walk-in"}
                </TableCell>
                <TableCell className="max-w-[280px] truncate font-light text-ink-soft">
                  {p.description}
                </TableCell>
                <TableCell className="whitespace-nowrap font-light">
                  {p.method}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(p.total, { cents: true })}
                </TableCell>
                <TableCell className="text-right tabular-nums text-ink-soft">
                  {formatCurrency(p.total - p.tax, { cents: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Appointments                                                        */
/* ------------------------------------------------------------------ */

const appointmentsChartConfig = {
  count: { label: "Appointments", color: "var(--color-gold)" },
} satisfies ChartConfig;

function AppointmentsReport() {
  const { appointments, clientName, serviceById, staffById } = useData();

  const now = new Date();
  const weekStartsAt = startOfWeek(now, { weekStartsOn: 1 });
  const weekEndsAt = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeek = appointments.filter((a) => {
    const d = new Date(a.startISO);
    return d >= weekStartsAt && d <= weekEndsAt;
  });

  const completed = thisWeek.filter((a) => a.status === "completed");
  const cancelled = thisWeek.filter((a) => a.status === "cancelled");
  const noShows = thisWeek.filter((a) => a.status === "no-show");

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const perDay = weekdays.map((day) => ({ day, count: 0 }));
  for (const a of thisWeek) {
    const idx = (new Date(a.startISO).getDay() + 6) % 7;
    perDay[idx].count += 1;
  }

  const rows = [...thisWeek].sort(
    (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total Appointments"
          value={thisWeek.length}
          icon={CalendarDays}
          hint="This week · both locations"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          icon={CheckCircle2}
          hint={formatCurrency(completed.reduce((s, a) => s + a.price, 0))}
          hintTone="positive"
        />
        <StatCard
          label="Cancelled"
          value={cancelled.length}
          icon={XCircle}
          hint={cancelled.length ? "Client rescheduling" : "None this week"}
        />
        <StatCard
          label="No-shows"
          value={noShows.length}
          icon={UserX}
          hint={noShows.length ? "Follow up recommended" : "None this week"}
          hintTone={noShows.length ? "negative" : "positive"}
        />
      </div>

      <SectionCard
        title="Appointments by Weekday"
        hint="This week · Monday through Sunday"
        className="mt-6"
      >
        <ChartContainer
          config={appointmentsChartConfig}
          className="h-64 w-full"
        >
          <BarChart data={perDay} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={32}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar isAnimationActive={false}
              dataKey="count"
              fill="var(--color-gold)"
              radius={[6, 6, 0, 0]}
              maxBarSize={44}
            />
          </BarChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard
        title="Appointment History"
        hint="Every visit on the books this week"
        className="mt-6"
        scrollX
      >
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <EmptyRow colSpan={7}>
                No appointments on the books this week.
              </EmptyRow>
            )}
            {rows.map((a) => {
              const start = new Date(a.startISO);
              return (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-muted-warm">
                    {format(start, "EEE, MMM d")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(start, "h:mm a")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {clientName(a.clientId)}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate font-light text-ink-soft">
                    {serviceById.get(a.serviceId)?.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-light">
                    {staffById.get(a.staffId)?.name}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(a.price)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Retail Sales                                                        */
/* ------------------------------------------------------------------ */

const retailChartConfig = {
  revenue: { label: "Revenue", color: "var(--color-gold)" },
} satisfies ChartConfig;

function RetailSalesReport() {
  const { payments, clientName } = useData();

  const retail = payments.filter((p) => p.kind === "retail");
  const revenue = round2(retail.reduce((s, p) => s + p.subtotal, 0));
  const avgSale = retail.length ? revenue / retail.length : 0;
  const largest = [...retail].sort((a, b) => b.subtotal - a.subtotal)[0];

  const daily = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(new Date(), 13 - i);
    return {
      label: format(day, "MMM d"),
      revenue: round2(
        retail
          .filter((p) => isSameDay(new Date(p.dateISO), day))
          .reduce((s, p) => s + p.subtotal, 0)
      ),
    };
  });

  const rows = [...retail].sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Retail Transactions"
          value={retail.length}
          icon={ShoppingBag}
          hint="All recorded"
        />
        <StatCard
          label="Retail Revenue"
          value={formatCurrency(revenue)}
          icon={DollarSign}
          hint="Before sales tax"
        />
        <StatCard
          label="Avg Sale"
          value={formatCurrency(avgSale, { cents: true })}
          icon={ReceiptText}
          hint="Per transaction"
        />
        <StatCard
          label="Largest Sale"
          value={
            <span className="text-lg leading-snug">
              {largest ? largest.description : "—"}
            </span>
          }
          icon={Star}
          hint={largest ? formatCurrency(largest.subtotal) : undefined}
          hintTone="positive"
        />
      </div>

      <SectionCard
        title="Retail Revenue by Day"
        hint="Last 14 days · retail transactions only"
        className="mt-6"
      >
        <ChartContainer config={retailChartConfig} className="h-64 w-full">
          <BarChart data={daily} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => `$${v}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <Bar isAnimationActive={false}
              dataKey="revenue"
              fill="var(--color-gold)"
              radius={[6, 6, 0, 0]}
              maxBarSize={44}
            />
          </BarChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard
        title="Retail Sales History"
        hint="Most recent first"
        className="mt-6"
        scrollX
      >
        <Table className="min-w-[620px]">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <EmptyRow colSpan={5}>No retail sales recorded yet.</EmptyRow>
            )}
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap text-muted-warm">
                  {format(parseISO(p.dateISO), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {p.clientId ? clientName(p.clientId) : "Walk-in"}
                </TableCell>
                <TableCell className="max-w-[280px] truncate font-light text-ink-soft">
                  {p.description}
                </TableCell>
                <TableCell className="whitespace-nowrap font-light">
                  {p.method}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(p.subtotal, { cents: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sales Tax                                                           */
/* ------------------------------------------------------------------ */

const taxChartConfig = {
  tax: { label: "Tax collected", color: "var(--color-gold-600)" },
} satisfies ChartConfig;

function SalesTaxReport() {
  const { payments } = useData();

  const now = new Date();
  const taxed = payments.filter((p) => p.tax > 0);
  const taxCollected = round2(taxed.reduce((s, p) => s + p.tax, 0));
  const taxableSales = round2(taxed.reduce((s, p) => s + p.subtotal, 0));

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i);
    const inMonth = taxed.filter((p) => isSameMonth(new Date(p.dateISO), date));
    return {
      label: format(date, "MMM"),
      month: format(date, "MMMM yyyy"),
      taxable: round2(inMonth.reduce((s, p) => s + p.subtotal, 0)),
      tax: round2(inMonth.reduce((s, p) => s + p.tax, 0)),
      due: i === 5,
    };
  });

  // CDTFA quarterly returns are due the last day of the month after quarter end.
  const filingDue = endOfMonth(addMonths(endOfQuarter(now), 1));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Taxable Sales"
          value={formatCurrency(taxableSales)}
          icon={DollarSign}
          hint={`${taxed.length} taxable transaction${taxed.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Tax Collected"
          value={formatCurrency(taxCollected, { cents: true })}
          icon={Landmark}
          hint="All recorded"
        />
        <StatCard
          label="Tax Rate"
          value="9.5%"
          icon={Percent}
          hint="Los Angeles County retail"
        />
        <StatCard
          label="Filings Due"
          value={format(filingDue, "MMM d")}
          icon={CalendarClock}
          hint={`Q${getQuarter(now)} CDTFA return`}
        />
      </div>

      <SectionCard
        title="Monthly Tax Collected"
        hint="Last 6 months"
        className="mt-6"
      >
        <ChartContainer config={taxChartConfig} className="h-64 w-full">
          <LineChart data={months} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => `$${v}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    formatCurrency(Number(value), { cents: true })
                  }
                />
              }
            />
            <Line isAnimationActive={false}
              dataKey="tax"
              type="monotone"
              stroke="var(--color-gold-600)"
              strokeWidth={2}
              dot={{ fill: "var(--color-gold-600)", r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard
        title="Filing History"
        hint="Taxable retail sales by month"
        className="mt-6"
        scrollX
      >
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">
                Taxable Retail Sales
              </TableHead>
              <TableHead className="text-right">Tax Collected</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...months].reverse().map((m) => (
              <TableRow key={m.month}>
                <TableCell className="whitespace-nowrap">{m.month}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(m.taxable)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(m.tax, { cents: true })}
                </TableCell>
                <TableCell className="text-right">
                  {m.due || m.tax > 0 ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-normal",
                        m.due
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      )}
                    >
                      {m.due ? "Due" : "Filed"}
                    </Badge>
                  ) : (
                    <span className="text-xs font-light text-muted-warm">
                      —
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

const inventoryChartConfig = {
  value: { label: "Retail value", color: "var(--color-gold)" },
} satisfies ChartConfig;

function InventoryReport() {
  const { products } = useData();

  const units = products.reduce((s, p) => s + p.inStock, 0);
  const retailValue = products.reduce(
    (s, p) => s + p.inStock * p.retailPrice,
    0
  );
  const lowStock = products.filter((p) => p.inStock <= p.lowStockThreshold);

  const perCategory = new Map<string, number>();
  for (const p of products) {
    perCategory.set(
      p.category,
      (perCategory.get(p.category) ?? 0) + p.inStock * p.retailPrice
    );
  }
  const topCategories = [...perCategory.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="SKUs"
          value={products.length}
          icon={Package}
          hint="Active retail products"
        />
        <StatCard
          label="Units on Hand"
          value={units}
          icon={Boxes}
          hint="Both locations"
        />
        <StatCard
          label="Retail Value"
          value={formatCurrency(retailValue)}
          icon={DollarSign}
          hint="At full retail price"
        />
        <StatCard
          label="Low Stock"
          value={lowStock.length}
          icon={AlertTriangle}
          hint={lowStock.length ? "Needs reorder" : "All stocked"}
          hintTone={lowStock.length ? "negative" : "positive"}
        />
      </div>

      <SectionCard
        title="Top Categories by Retail Value"
        hint="Units on hand × retail price"
        className="mt-6"
      >
        {topCategories.length === 0 ? (
          <EmptyNote>No products in inventory yet.</EmptyNote>
        ) : (
          <ChartContainer config={inventoryChartConfig} className="h-64 w-full">
            <BarChart
              data={topCategories}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 8 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="category"
                tickLine={false}
                axisLine={false}
                width={92}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Bar isAnimationActive={false}
                dataKey="value"
                fill="var(--color-gold)"
                radius={[0, 6, 6, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ChartContainer>
        )}
      </SectionCard>

      <SectionCard
        title="Inventory on Hand"
        hint="All retail SKUs"
        className="mt-6"
        scrollX
      >
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Retail</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <EmptyRow colSpan={6}>No products in inventory yet.</EmptyRow>
            )}
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="max-w-[280px] truncate">
                  {p.name}
                </TableCell>
                <TableCell className="whitespace-nowrap font-light text-muted-warm">
                  {p.sku}
                </TableCell>
                <TableCell className="whitespace-nowrap font-light">
                  {p.category}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-2">
                    {p.inStock <= p.lowStockThreshold && (
                      <StatusBadge status="low-stock" />
                    )}
                    <span className="tabular-nums">{p.inStock}</span>
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(p.retailPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(p.inStock * p.retailPrice)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Transaction Detail                                                  */
/* ------------------------------------------------------------------ */

const txnChartConfig = {
  card: { label: "Card", color: "var(--chart-1)" },
  cash: { label: "Cash", color: "var(--chart-2)" },
  gift: { label: "Gift Card", color: "var(--chart-3)" },
  credit: { label: "Membership Credit", color: "var(--chart-4)" },
} satisfies ChartConfig;

const methodKey: Record<PaymentMethod, "card" | "cash" | "gift" | "credit"> = {
  Card: "card",
  Cash: "cash",
  "Gift Card": "gift",
  "Membership Credit": "credit",
};

function TransactionDetailReport() {
  const { payments, clientName } = useData();

  interface TxnLine {
    key: string;
    dateISO: string;
    txn: string;
    clientId: string;
    label: string;
    type: string;
    muted: boolean;
    amount: number;
  }

  const sorted = [...payments].sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );
  const lines: TxnLine[] = [];
  for (const p of sorted) {
    const txn = p.id.slice(0, 8).toUpperCase();
    lines.push({
      key: `${p.id}-main`,
      dateISO: p.dateISO,
      txn,
      clientId: p.clientId,
      label: p.description,
      type: p.kind,
      muted: false,
      amount: p.subtotal,
    });
    if (p.tip > 0) {
      lines.push({
        key: `${p.id}-tip`,
        dateISO: p.dateISO,
        txn,
        clientId: p.clientId,
        label: "Tip",
        type: "tip",
        muted: true,
        amount: p.tip,
      });
    }
    if (p.tax > 0) {
      lines.push({
        key: `${p.id}-tax`,
        dateISO: p.dateISO,
        txn,
        clientId: p.clientId,
        label: "Sales tax (9.5%)",
        type: "tax",
        muted: true,
        amount: p.tax,
      });
    }
  }

  const cardCount = payments.filter((p) => p.method === "Card").length;
  const cashCount = payments.filter((p) => p.method === "Cash").length;
  const cardPct = payments.length
    ? Math.round((cardCount / payments.length) * 100)
    : 0;
  const cashPct = payments.length
    ? Math.round((cashCount / payments.length) * 100)
    : 0;

  const weeks = Array.from({ length: 8 }, (_, idx) => ({
    label: format(subDays(new Date(), (7 - idx) * 7), "MMM d"),
    card: 0,
    cash: 0,
    gift: 0,
    credit: 0,
  }));
  for (const p of payments) {
    const daysAgo = differenceInCalendarDays(new Date(), parseISO(p.dateISO));
    if (daysAgo < 0 || daysAgo > 55) continue;
    const wk = Math.min(7, Math.max(0, Math.floor(daysAgo / 7)));
    weeks[7 - wk][methodKey[p.method]] += p.total;
  }
  for (const w of weeks) {
    w.card = round2(w.card);
    w.cash = round2(w.cash);
    w.gift = round2(w.gift);
    w.credit = round2(w.credit);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Transactions"
          value={payments.length}
          icon={ReceiptText}
          hint="All recorded"
        />
        <StatCard
          label="Line Items"
          value={lines.length}
          icon={ListOrdered}
          hint="Incl. tip & tax lines"
        />
        <StatCard
          label="Paid by Card"
          value={`${cardPct}%`}
          icon={CreditCard}
          hint={`${cardCount} transaction${cardCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Paid in Cash"
          value={`${cashPct}%`}
          icon={Banknote}
          hint={`${cashCount} transaction${cashCount === 1 ? "" : "s"}`}
        />
      </div>

      <SectionCard
        title="Payment Methods by Week"
        hint="Weekly totals · last 8 weeks"
        className="mt-6"
      >
        <ChartContainer config={txnChartConfig} className="h-64 w-full">
          <BarChart data={weeks} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => `$${v}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {txnChartConfig[
                          name as keyof typeof txnChartConfig
                        ]?.label ?? name}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value), { cents: true })}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar isAnimationActive={false} dataKey="card" stackId="pay" fill="var(--color-card)" />
            <Bar isAnimationActive={false} dataKey="cash" stackId="pay" fill="var(--color-cash)" />
            <Bar isAnimationActive={false} dataKey="gift" stackId="pay" fill="var(--color-gift)" />
            <Bar isAnimationActive={false}
              dataKey="credit"
              stackId="pay"
              fill="var(--color-credit)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard
        title="Line Item Detail"
        hint="Every line on every transaction · most recent first"
        className="mt-6"
        scrollX
      >
        <Table className="min-w-[780px]">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Line Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 && (
              <EmptyRow colSpan={6}>No transactions recorded yet.</EmptyRow>
            )}
            {lines.map((l) => (
              <TableRow key={l.key}>
                <TableCell className="whitespace-nowrap text-muted-warm">
                  {format(parseISO(l.dateISO), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="whitespace-nowrap font-light text-muted-warm">
                  {l.txn}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {l.clientId ? clientName(l.clientId) : "Walk-in"}
                </TableCell>
                <TableCell
                  className={cn(
                    "max-w-[280px] truncate",
                    l.muted ? "font-light text-muted-warm" : "text-ink-soft"
                  )}
                >
                  {l.label}
                </TableCell>
                <TableCell className="font-light capitalize text-muted-warm">
                  {l.type}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    l.muted && "text-muted-warm"
                  )}
                >
                  {formatCurrency(l.amount, { cents: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Most Valuable Clients                                               */
/* ------------------------------------------------------------------ */

const mvcChartConfig = {
  spend: { label: "Lifetime spend", color: "var(--color-gold)" },
} satisfies ChartConfig;

function MostValuableClientsReport() {
  const { clients } = useData();

  const top = [...clients]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);
  const combined = top.reduce((s, c) => s + c.totalSpent, 0);
  const avgSpend = top.length ? combined / top.length : 0;
  const visits = top.reduce((s, c) => s + c.visitCount, 0);
  const first = top[0];

  const chartData = top.map((c) => ({
    name: c.lastName,
    spend: c.totalSpent,
  }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Combined Revenue"
          value={formatCurrency(combined)}
          icon={Crown}
          hint="Top 10 · lifetime"
        />
        <StatCard
          label="Avg Lifetime Spend"
          value={formatCurrency(avgSpend)}
          icon={TrendingUp}
          hint="Per top client"
        />
        <StatCard
          label="Combined Visits"
          value={visits}
          icon={Users}
          hint="Top 10 · lifetime"
        />
        <StatCard
          label="Top Client"
          value={
            <span className="text-lg leading-snug">
              {first ? `${first.firstName} ${first.lastName}` : "—"}
            </span>
          }
          icon={Star}
          hint={first ? formatCurrency(first.totalSpent) : undefined}
          hintTone="positive"
        />
      </div>

      <SectionCard
        title="Top 10 by Lifetime Spend"
        hint="All-time client revenue"
        className="mt-6"
      >
        {chartData.length === 0 ? (
          <EmptyNote>No clients on the books yet.</EmptyNote>
        ) : (
          <ChartContainer config={mvcChartConfig} className="h-80 w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 8 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={86}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Bar isAnimationActive={false}
                dataKey="spend"
                fill="var(--color-gold)"
                radius={[0, 6, 6, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ChartContainer>
        )}
      </SectionCard>

      <SectionCard
        title="Most Valuable Clients"
        hint="Ranked by lifetime spend"
        className="mt-6"
        scrollX
      >
        <Table className="min-w-[620px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Visits</TableHead>
              <TableHead>Membership</TableHead>
              <TableHead className="text-right">Lifetime Spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top.length === 0 && (
              <EmptyRow colSpan={5}>No clients on the books yet.</EmptyRow>
            )}
            {top.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="text-muted-warm">{i + 1}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold-50 text-[11px] font-normal text-gold-700">
                      {c.firstName[0]}
                      {c.lastName[0]}
                    </span>
                    <span className="whitespace-nowrap">
                      {c.firstName} {c.lastName}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.visitCount}
                </TableCell>
                <TableCell>
                  {c.tags.includes("Member") ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-gold-200 bg-gold-50 px-2.5 py-0.5 text-[11px] font-normal text-gold-700"
                    >
                      Member
                    </Badge>
                  ) : (
                    <span className="text-xs font-light text-muted-warm">
                      —
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(c.totalSpent)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */

function ExpensesReport() {
  const { expenses } = useData();

  const total = round2(expenses.reduce((s, e) => s + e.amount, 0));

  const perCategory = new Map<string, number>();
  for (const e of expenses) {
    perCategory.set(e.category, (perCategory.get(e.category) ?? 0) + e.amount);
  }
  const byCategory = [...perCategory.entries()]
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);
  const topCategory = byCategory[0];

  const recurringMonthly = round2(
    expenses
      .filter(
        (e) =>
          e.recurring &&
          differenceInCalendarDays(new Date(), parseISO(e.dateISO)) <= 31
      )
      .reduce((s, e) => s + e.amount, 0)
  );

  const expenseChartConfig: ChartConfig = {
    amount: { label: "Amount" },
  };
  byCategory.forEach((c, i) => {
    expenseChartConfig[c.category] = {
      label: c.category,
      color: goldPalette[i % goldPalette.length],
    };
  });

  const entryCount = (category: string) =>
    expenses.filter((e) => e.category === category).length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Expenses"
          value={formatCurrency(total)}
          icon={Receipt}
          hint="All recorded · both locations"
        />
        <StatCard
          label="Top Category"
          value={
            <span className="text-lg leading-snug">
              {topCategory ? topCategory.category : "—"}
            </span>
          }
          icon={Star}
          hint={topCategory ? formatCurrency(topCategory.amount) : undefined}
        />
        <StatCard
          label="Recurring Monthly"
          value={formatCurrency(recurringMonthly)}
          icon={Repeat}
          hint="Recurring expenses · last 31 days"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <SectionCard
          title="Spending by Category"
          hint="Share of total expenses"
          className="lg:col-span-2"
        >
          {byCategory.length === 0 ? (
            <EmptyNote>No expenses recorded yet.</EmptyNote>
          ) : (
            <ChartContainer
              config={expenseChartConfig}
              className="mx-auto h-72 w-full max-w-xs"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {String(name)}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {formatCurrency(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie isAnimationActive={false}
                  data={byCategory}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={2}
                >
                  {byCategory.map((c, i) => (
                    <Cell
                      key={c.category}
                      fill={goldPalette[i % goldPalette.length]}
                    />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="category" />}
                  className="flex-wrap"
                />
              </PieChart>
            </ChartContainer>
          )}
        </SectionCard>

        <SectionCard
          title="Category Breakdown"
          hint="Totals and share of overall spend"
          className="lg:col-span-3"
          scrollX
        >
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Entries</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCategory.length === 0 && (
                <EmptyRow colSpan={4}>No expenses recorded yet.</EmptyRow>
              )}
              {byCategory.map((c, i) => (
                <TableRow key={c.category}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            goldPalette[i % goldPalette.length],
                        }}
                      />
                      {c.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-warm">
                    {entryCount(c.category)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(c.amount, { cents: true })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-ink-soft">
                    {total > 0 ? ((c.amount / total) * 100).toFixed(1) : "0.0"}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Commission Earnings                                                 */
/* ------------------------------------------------------------------ */

const commissionChartConfig = {
  revenue: { label: "Service revenue", color: "var(--chart-2)" },
  commission: { label: "Commission (40%)", color: "var(--chart-1)" },
} satisfies ChartConfig;

function CommissionEarningsReport() {
  const { staff, appointments } = useData();

  const now = new Date();
  const weekStartsAt = startOfWeek(now, { weekStartsOn: 1 });
  const weekEndsAt = endOfWeek(now, { weekStartsOn: 1 });

  const rows = staff.map((s) => {
    const done = appointments.filter((a) => {
      if (a.staffId !== s.id || a.status !== "completed") return false;
      const d = new Date(a.startISO);
      return d >= weekStartsAt && d <= weekEndsAt;
    });
    const revenue = done.reduce((sum, a) => sum + a.price, 0);
    const rate = s.role.toLowerCase().includes("owner") ? 0 : 0.4;
    return {
      id: s.id,
      name: s.name,
      role: s.role,
      services: done.length,
      revenue,
      rate,
      commission: round2(revenue * rate),
    };
  });
  const ranked = rows
    .filter((r) => r.rate > 0)
    .sort((a, b) => b.commission - a.commission);
  const totalCommission = round2(rows.reduce((s, r) => s + r.commission, 0));
  const commissionableRevenue = ranked.reduce((s, r) => s + r.revenue, 0);

  const chartData = rows.map((r) => ({
    name: r.name.split(" ")[0],
    revenue: r.revenue,
    commission: r.commission,
  }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Commission Owed"
          value={formatCurrency(totalCommission)}
          icon={HandCoins}
          hint="Completed services this week"
        />
        {ranked.slice(0, 2).map((r) => (
          <StatCard
            key={r.id}
            label={r.name}
            value={formatCurrency(r.commission)}
            icon={Percent}
            hint={`${r.services} service${r.services === 1 ? "" : "s"} · 40% rate`}
          />
        ))}
        <StatCard
          label="Commissionable Revenue"
          value={formatCurrency(commissionableRevenue)}
          icon={DollarSign}
          hint="Excludes owner services"
        />
      </div>

      <SectionCard
        title="Earnings by Staff"
        hint="Completed service revenue vs. commission"
        className="mt-6"
      >
        {chartData.length === 0 ? (
          <EmptyNote>No bookable staff yet.</EmptyNote>
        ) : (
          <ChartContainer
            config={commissionChartConfig}
            className="h-64 w-full"
          >
            <BarChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v: number) => `$${v}`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {commissionChartConfig[
                            name as keyof typeof commissionChartConfig
                          ]?.label ?? name}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatCurrency(Number(value), { cents: true })}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar isAnimationActive={false}
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
              <Bar isAnimationActive={false}
                dataKey="commission"
                fill="var(--color-commission)"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ChartContainer>
        )}
      </SectionCard>

      <SectionCard
        title="Commission Detail"
        hint="Based on completed appointments this week"
        className="mt-6"
        scrollX
      >
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead className="text-right">Services Performed</TableHead>
              <TableHead className="text-right">Service Revenue</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <EmptyRow colSpan={5}>No bookable staff yet.</EmptyRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <span className="block whitespace-nowrap">{r.name}</span>
                  <span className="block text-xs font-light text-muted-warm">
                    {r.role}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.services}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(r.revenue)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap text-ink-soft">
                  {r.rate > 0 ? "40%" : "0% · owner"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(r.commission, { cents: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-4 text-xs font-light text-muted-warm">
          Commission is modeled at 40% of completed service revenue for
          estheticians. Owners are compensated via draw — no commission
          applies.
        </p>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Timesheets                                                          */
/* ------------------------------------------------------------------ */

const timesheetChartConfig = {
  hours: { label: "Hours", color: "var(--color-gold)" },
} satisfies ChartConfig;

function TimesheetsReport() {
  const { staff } = useData();

  const weekStartsAt = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEndsAt = addDays(weekStartsAt, 5); // Mon – Sat

  // No time-clock source is connected yet, so logged hours are zero until
  // clock-ins start landing in the database.
  const perStaff = staff.map((s) => ({ id: s.id, name: s.name, hours: 0 }));
  const totalHours = round2(perStaff.reduce((s, p) => s + p.hours, 0));

  const chartData = perStaff.map((p) => ({
    name: p.name.split(" ")[0],
    hours: p.hours,
  }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total Hours"
          value={totalHours}
          icon={Clock}
          hint={`${format(weekStartsAt, "MMM d")} – ${format(weekEndsAt, "MMM d")} · this week`}
        />
        {perStaff.slice(0, 3).map((p) => (
          <StatCard
            key={p.id}
            label={p.name}
            value={p.hours}
            icon={Clock}
            hint="Hours logged"
          />
        ))}
      </div>

      <SectionCard
        title="Hours by Staff"
        hint="Clocked hours · this week"
        className="mt-6"
      >
        {chartData.length === 0 ? (
          <EmptyNote>No bookable staff yet.</EmptyNote>
        ) : (
          <ChartContainer config={timesheetChartConfig} className="h-64 w-full">
            <BarChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={32}
                allowDecimals={false}
                tickFormatter={(v: number) => `${v}h`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${Number(value)} hours`}
                  />
                }
              />
              <Bar isAnimationActive={false}
                dataKey="hours"
                fill="var(--color-gold)"
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ChartContainer>
        )}
      </SectionCard>

      <SectionCard
        title="Timesheet Detail"
        hint="Clock-ins for the current week"
        className="mt-6"
        scrollX
      >
        <Table className="min-w-[620px]">
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead className="text-right">Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <EmptyRow colSpan={5}>
              No clock-ins recorded for the week of{" "}
              {format(weekStartsAt, "MMMM d")} yet.
            </EmptyRow>
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Config map + page                                                   */
/* ------------------------------------------------------------------ */

const reports: Record<
  string,
  { title: string; description: string; body: React.ComponentType }
> = {
  sales: {
    title: "Sales",
    description: "Breakdown of gross and net transaction history",
    body: SalesReport,
  },
  appointments: {
    title: "Appointments",
    description: "Appointment history",
    body: AppointmentsReport,
  },
  "retail-sales": {
    title: "Retail Sales",
    description: "Retail sales history",
    body: RetailSalesReport,
  },
  "sales-tax": {
    title: "Sales Tax",
    description: "Sales tax history",
    body: SalesTaxReport,
  },
  inventory: {
    title: "Inventory",
    description: "Inventory sales",
    body: InventoryReport,
  },
  "transaction-detail": {
    title: "Transaction Detail",
    description: "All line items for each transaction",
    body: TransactionDetailReport,
  },
  "most-valuable-clients": {
    title: "Most Valuable Clients",
    description: "Top 10 clients",
    body: MostValuableClientsReport,
  },
  expenses: {
    title: "Expenses",
    description: "Breakdown of business expenses",
    body: ExpensesReport,
  },
  "commission-earnings": {
    title: "Commission Earnings",
    description: "Earnings to support commission calculations",
    body: CommissionEarningsReport,
  },
  timesheets: {
    title: "Timesheets",
    description: "All employee timesheets",
    body: TimesheetsReport,
  },
};

function BackToReports() {
  return (
    <div className="mb-4">
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-sm font-light text-muted-warm transition-colors hover:text-gold-700"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Reports
      </Link>
    </div>
  );
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = React.use(params);
  const report = reports[slug];

  if (!report) {
    return (
      <>
        <BackToReports />
        <Card className="border-line bg-white shadow-xs">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-gold-50">
              <FileSearch className="size-5 text-gold-600" strokeWidth={1.75} />
            </div>
            <h2 className="mt-5 text-2xl text-ink">Report not found</h2>
            <p className="mt-1 max-w-sm text-sm font-light text-muted-warm">
              We couldn&apos;t find that report. It may have moved, or it isn&apos;t
              available in this preview yet.
            </p>
            <Button asChild className="mt-6">
              <Link href="/reports">Back to Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const Body = report.body;

  return (
    <>
      <BackToReports />
      <PageHeader
        title={report.title}
        subtitle={report.description}
        actions={<ReportControls />}
      />
      <Body />
    </>
  );
}
