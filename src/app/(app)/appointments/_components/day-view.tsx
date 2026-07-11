"use client";

import * as React from "react";
import { format, isToday } from "date-fns";

import {
  clientName,
  serviceById,
  staff,
  type Appointment,
  type LocationFilter,
  type StaffMember,
} from "@/data";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const START_HOUR = 8; // 8:00 AM
const END_HOUR = 19; // 7:00 PM
const HOUR_PX = 64;
const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_PX;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
);

function hourLabel(h: number) {
  return `${((h + 11) % 12) + 1} ${h >= 12 ? "PM" : "AM"}`;
}

function StaffColumn({
  staffMember,
  appointments,
  onSelect,
}: {
  staffMember: StaffMember;
  appointments: Appointment[];
  onSelect: (a: Appointment) => void;
}) {
  const sorted = [...appointments].sort((a, b) =>
    a.startISO.localeCompare(b.startISO)
  );

  return (
    <div
      className="relative min-w-60 flex-1 border-l border-line/60"
      style={{ height: GRID_HEIGHT }}
    >
      {HOURS.map((h) => (
        <div key={h} className="h-16 border-b border-line/40 last:border-b-0" />
      ))}

      {sorted.map((a) => {
        const start = new Date(a.startISO);
        const top =
          (((start.getHours() - START_HOUR) * 60 + start.getMinutes()) / 60) *
          HOUR_PX;
        const height = Math.max((a.durationMin / 60) * HOUR_PX, 34);
        const cancelled = a.status === "cancelled";
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a)}
            className={cn(
              "absolute right-1.5 left-1.5 overflow-hidden rounded-xl border border-line bg-white px-2.5 py-1.5 text-left shadow-xs transition-all hover:border-gold-200 hover:shadow-md",
              cancelled && "opacity-50",
              a.status === "no-show" && "border-red-100 bg-red-50"
            )}
            style={{
              top,
              height,
              borderLeftWidth: 3,
              borderLeftColor: staffMember.color,
            }}
          >
            <p
              className={cn(
                "truncate text-[11px] font-light text-muted-warm",
                cancelled && "line-through"
              )}
            >
              {format(start, "h:mm a")} · {a.durationMin} min
            </p>
            <p
              className={cn(
                "truncate text-xs text-ink",
                cancelled && "line-through"
              )}
            >
              {clientName(a.clientId)}
            </p>
            {height >= 62 && (
              <p
                className={cn(
                  "truncate text-[11px] font-light text-muted-warm",
                  cancelled && "line-through"
                )}
              >
                {serviceById.get(a.serviceId)?.name}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DayView({
  date,
  appointments,
  locationFilter,
  onSelect,
}: {
  date: Date;
  appointments: Appointment[];
  locationFilter: LocationFilter;
  onSelect: (a: Appointment) => void;
}) {
  // Client-only clock so the "now" line never mismatches on hydration.
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const columns = staff.filter(
    (s) => locationFilter === "all" || s.locations.includes(locationFilter)
  );

  const nowOffset =
    now && isToday(date)
      ? (((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / 60) * HOUR_PX
      : null;
  const showNowLine =
    nowOffset !== null && nowOffset >= 0 && nowOffset <= GRID_HEIGHT;

  return (
    <Card className="gap-0 border-line bg-white py-0 shadow-xs">
      {appointments.length === 0 && (
        <div className="border-b border-line bg-cream/60 px-4 py-2.5 text-center text-xs font-light text-muted-warm">
          No appointments scheduled for this day.
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-fit">
          {/* Staff column headers */}
          <div className="flex border-b border-line">
            <div className="sticky left-0 z-30 w-14 shrink-0 bg-white" />
            {columns.map((s) => (
              <div
                key={s.id}
                className="flex min-w-60 flex-1 items-center gap-2.5 border-l border-line/60 px-3 py-3"
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${s.color}1f`, color: s.color }}
                >
                  {s.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{s.name}</p>
                  <p className="truncate text-[11px] font-light text-muted-warm">
                    {s.role}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="relative flex">
            <div className="sticky left-0 z-20 w-14 shrink-0 bg-white">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="h-16 border-b border-line/40 pt-1 pr-2 text-right text-[11px] font-light text-muted-warm last:border-b-0"
                >
                  {hourLabel(h)}
                </div>
              ))}
            </div>

            {columns.map((s) => (
              <StaffColumn
                key={s.id}
                staffMember={s}
                appointments={appointments.filter((a) => a.staffId === s.id)}
                onSelect={onSelect}
              />
            ))}

            {showNowLine && (
              <div
                className="pointer-events-none absolute right-0 left-14 z-10"
                style={{ top: nowOffset ?? 0 }}
              >
                <div className="relative border-t border-gold-600/80">
                  <span className="absolute -top-[3.5px] left-0 size-1.5 rounded-full bg-gold-600" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
