"use client";

import * as React from "react";
import Link from "next/link";
import { format, isSameDay, isToday } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  DollarSign,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  appointments,
  clientName,
  formatCurrency,
  matchesLocation,
  products,
  revenueTrend,
  serviceById,
  staffById,
  locationById,
  clients,
} from "@/data";
import { useLocationFilter } from "@/components/shell/location-context";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--color-gold)" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { location } = useLocationFilter();
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const visible = appointments.filter((a) =>
    matchesLocation(a.locationId, location)
  );
  const todays = visible.filter(
    (a) => isToday(new Date(a.startISO)) && a.status !== "cancelled"
  );
  const todaysRevenue = todays
    .filter((a) => a.status === "completed" || a.status === "checked-in")
    .reduce((sum, a) => sum + a.price, 0);

  const upcoming = visible
    .filter(
      (a) =>
        new Date(a.startISO) > now &&
        a.status !== "cancelled" &&
        a.status !== "no-show"
    )
    .sort(
      (a, b) =>
        new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
    )
    .slice(0, 6);

  const lowStock = products.filter((p) => p.inStock <= p.lowStockThreshold);
  const newThisWeek = clients.filter(
    (c) =>
      (now.getTime() - new Date(c.joinedISO).getTime()) / 86400000 <= 7
  );
  const trend = revenueTrend(14);

  return (
    <>
      <PageHeader
        title={`${greeting}, Carolina`}
        subtitle={format(now, "EEEE, MMMM d, yyyy")}
        actions={
          <Button asChild>
            <Link href="/appointments?new=1">
              <Sparkles data-icon="inline-start" />
              New Appointment
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Today's Appointments"
          value={todays.length}
          icon={CalendarDays}
          hint={
            upcoming[0] && isToday(new Date(upcoming[0].startISO))
              ? `Next at ${format(new Date(upcoming[0].startISO), "h:mm a")}`
              : todays.length > 0
                ? "All wrapped for today"
                : "No appointments today"
          }
        />
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(todaysRevenue)}
          icon={DollarSign}
          hint="Completed & checked-in"
          hintTone="positive"
        />
        <StatCard
          label="New Clients This Week"
          value={newThisWeek.length}
          icon={UserPlus}
          hint={newThisWeek.map((c) => c.firstName).join(", ") || "—"}
        />
        <StatCard
          label="Low Stock Items"
          value={lowStock.length}
          icon={AlertTriangle}
          hint={lowStock.length ? "Needs reorder" : "All stocked"}
          hintTone={lowStock.length ? "negative" : "positive"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Revenue trend */}
        <Card className="border-line bg-white shadow-xs lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-xl font-medium">
                Revenue Trend
              </CardTitle>
              <p className="text-xs font-light text-muted-warm">
                Last 14 days · all revenue types
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/reports/sales">
                View report <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart data={trend} margin={{ left: 4, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0.02} />
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
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
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
                  fill="url(#goldFill)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Upcoming appointments */}
        <Card className="border-line bg-white shadow-xs">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-heading text-xl font-medium">
              Upcoming
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/appointments">
                All <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {upcoming.length === 0 && (
              <p className="py-8 text-center text-sm font-light text-muted-warm">
                Nothing else on the books this week.
              </p>
            )}
            {upcoming.map((a) => {
              const start = new Date(a.startISO);
              const service = serviceById.get(a.serviceId);
              const staffMember = staffById.get(a.staffId);
              return (
                <Link
                  key={a.id}
                  href="/appointments"
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-cream/70"
                >
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-gold-50 py-1.5">
                    <span className="text-[10px] font-normal tracking-wide text-gold-700 uppercase">
                      {isSameDay(start, now) ? "Today" : format(start, "EEE")}
                    </span>
                    <span className="text-sm font-normal text-ink">
                      {format(start, "h:mm a")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {clientName(a.clientId)}
                    </p>
                    <p className="truncate text-xs font-light text-muted-warm">
                      {service?.name} · {staffMember?.name.split(" ")[0]}
                    </p>
                  </div>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: staffMember?.color }}
                  />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Low stock */}
        <Card className="border-line bg-white shadow-xs lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-xl font-medium">
                Low Stock Alerts
              </CardTitle>
              <p className="text-xs font-light text-muted-warm">
                At or below reorder threshold
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/inventory?filter=low">Review inventory</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-line/70">
              {lowStock.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{p.name}</p>
                    <p className="text-xs font-light text-muted-warm">
                      {p.vendor} · {p.sku}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink-soft">
                      {p.inStock} left
                    </span>
                    <StatusBadge status="low-stock" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today at a glance */}
        <Card className="border-line bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-medium">
              Today at a Glance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todays.length === 0 && (
              <p className="py-6 text-center text-sm font-light text-muted-warm">
                The books are clear today.
              </p>
            )}
            {todays
              .sort(
                (a, b) =>
                  new Date(a.startISO).getTime() -
                  new Date(b.startISO).getTime()
              )
              .map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-muted-warm">
                    {format(new Date(a.startISO), "h:mm a")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {clientName(a.clientId)}
                    </p>
                    <p className="truncate text-xs font-light text-muted-warm">
                      {serviceById.get(a.serviceId)?.name} ·{" "}
                      {locationById.get(a.locationId)?.shortName}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
