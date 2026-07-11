"use client";

import * as React from "react";
import { format, isToday } from "date-fns";

import {
  clientName,
  formatCurrency,
  locationById,
  serviceById,
  staffById,
  type Appointment,
} from "@/data";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const HEAD_CLASSES =
  "h-11 px-4 text-[11px] font-normal tracking-[0.14em] text-muted-warm uppercase";

export function ListView({
  appointments,
  onSelect,
}: {
  appointments: Appointment[];
  onSelect: (a: Appointment) => void;
}) {
  const groups = React.useMemo(() => {
    const sorted = [...appointments].sort((a, b) =>
      a.startISO.localeCompare(b.startISO)
    );
    const map = new Map<string, Appointment[]>();
    for (const a of sorted) {
      const key = format(new Date(a.startISO), "yyyy-MM-dd");
      const bucket = map.get(key);
      if (bucket) bucket.push(a);
      else map.set(key, [a]);
    }
    return [...map.entries()];
  }, [appointments]);

  if (groups.length === 0) {
    return (
      <Card className="border-line bg-white shadow-xs">
        <CardContent className="py-12 text-center text-sm font-light text-muted-warm">
          No appointments this week — the books are clear.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(([key, dayAppts]) => {
        const day = new Date(`${key}T12:00:00`);
        return (
          <section key={key}>
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <h3 className="text-xl text-ink">
                {format(day, "EEEE, MMMM d")}
              </h3>
              {isToday(day) && (
                <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-[11px] text-gold-700">
                  Today
                </span>
              )}
              <span className="text-xs font-light text-muted-warm">
                {dayAppts.length}{" "}
                {dayAppts.length === 1 ? "appointment" : "appointments"}
              </span>
            </div>

            {/* Desktop table */}
            <Card className="hidden gap-0 border-line bg-white py-0 shadow-xs md:block">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="border-line hover:bg-transparent">
                    <TableHead className={HEAD_CLASSES}>Time</TableHead>
                    <TableHead className={HEAD_CLASSES}>Client</TableHead>
                    <TableHead className={HEAD_CLASSES}>Service</TableHead>
                    <TableHead className={HEAD_CLASSES}>Staff</TableHead>
                    <TableHead className={HEAD_CLASSES}>Location</TableHead>
                    <TableHead className={cn(HEAD_CLASSES, "text-right")}>
                      Price
                    </TableHead>
                    <TableHead className={cn(HEAD_CLASSES, "text-right")}>
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayAppts.map((a) => {
                    const start = new Date(a.startISO);
                    const staffMember = staffById.get(a.staffId);
                    const cancelled = a.status === "cancelled";
                    return (
                      <TableRow
                        key={a.id}
                        onClick={() => onSelect(a)}
                        className={cn(
                          "cursor-pointer border-line/70 hover:bg-cream/60",
                          cancelled && "opacity-50"
                        )}
                      >
                        <TableCell className="px-4 py-3 text-ink">
                          {format(start, "h:mm a")}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "px-4 py-3 text-ink",
                            cancelled && "line-through"
                          )}
                        >
                          {clientName(a.clientId)}
                        </TableCell>
                        <TableCell className="max-w-56 truncate px-4 py-3 font-light text-ink-soft">
                          {serviceById.get(a.serviceId)?.name}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-light text-ink-soft">
                          <span className="flex items-center gap-2">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: staffMember?.color }}
                            />
                            {staffMember?.name.split(" ")[0]}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 font-light text-ink-soft">
                          {locationById.get(a.locationId)?.shortName}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-ink">
                          {formatCurrency(a.price)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <StatusBadge status={a.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Mobile stacked cards */}
            <div className="space-y-2 md:hidden">
              {dayAppts.map((a) => {
                const start = new Date(a.startISO);
                const cancelled = a.status === "cancelled";
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left shadow-xs transition-colors hover:border-gold-200",
                      cancelled && "opacity-50"
                    )}
                  >
                    <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-gold-50 py-1.5">
                      <span className="text-sm font-normal text-ink">
                        {format(start, "h:mm")}
                      </span>
                      <span className="text-[10px] tracking-wide text-gold-700 uppercase">
                        {format(start, "a")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm text-ink",
                          cancelled && "line-through"
                        )}
                      >
                        {clientName(a.clientId)}
                      </p>
                      <p className="truncate text-xs font-light text-muted-warm">
                        {serviceById.get(a.serviceId)?.name} ·{" "}
                        {staffById.get(a.staffId)?.name.split(" ")[0]}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
