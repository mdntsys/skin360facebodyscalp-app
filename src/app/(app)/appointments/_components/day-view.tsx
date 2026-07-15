"use client";

import * as React from "react";
import { addDays, format, isToday, startOfDay } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
  matchesLocation,
  useData,
  type Appointment,
  type LocationFilter,
  type StaffMember,
  type TimeBlock,
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

// Subtle diagonal hatch so blocked time can't be mistaken for an appointment.
const HATCH_STYLE =
  "repeating-linear-gradient(135deg, rgba(120,113,108,0.08) 0px, rgba(120,113,108,0.08) 5px, transparent 5px, transparent 12px)";

function hourLabel(h: number) {
  return `${((h + 11) % 12) + 1} ${h >= 12 ? "PM" : "AM"}`;
}

/** Pixel position of a time block on the grid, clipped to visible hours. */
function blockPosition(
  block: TimeBlock,
  date: Date
): { top: number; height: number } | null {
  const gridStart = new Date(date);
  gridStart.setHours(START_HOUR, 0, 0, 0);
  const gridEnd = new Date(date);
  gridEnd.setHours(END_HOUR, 0, 0, 0);

  const start = new Date(block.startISO);
  const end = new Date(block.endISO);
  const clampedStart = start < gridStart ? gridStart : start;
  const clampedEnd = end > gridEnd ? gridEnd : end;
  if (clampedEnd <= clampedStart) return null;

  const top =
    ((clampedStart.getTime() - gridStart.getTime()) / 60000 / 60) * HOUR_PX;
  const height = Math.max(
    ((clampedEnd.getTime() - clampedStart.getTime()) / 60000 / 60) * HOUR_PX,
    26
  );
  return { top, height };
}

function blockTimeLabel(block: TimeBlock) {
  return `${format(new Date(block.startISO), "h:mm a")} – ${format(
    new Date(block.endISO),
    "h:mm a"
  )}`;
}

function StaffColumn({
  staffMember,
  appointments,
  blocks,
  date,
  onSelect,
  onDeleteBlock,
}: {
  staffMember: StaffMember;
  appointments: Appointment[];
  blocks: TimeBlock[];
  date: Date;
  onSelect: (a: Appointment) => void;
  onDeleteBlock: (b: TimeBlock) => void;
}) {
  const { clientName, serviceById } = useData();

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

      {blocks.map((b) => {
        const pos = blockPosition(b, date);
        if (!pos) return null;
        return (
          <div
            key={b.id}
            title={`Blocked · ${b.reason} · ${blockTimeLabel(b)}`}
            className="absolute right-1.5 left-1.5 overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-100/90 px-2.5 py-1.5"
            style={{
              top: pos.top,
              height: pos.height,
              backgroundImage: HATCH_STYLE,
            }}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-light text-stone-500">
                  Blocked · {blockTimeLabel(b)}
                </p>
                {pos.height >= 48 && (
                  <p className="truncate text-xs font-light text-stone-600">
                    {b.reason}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Remove time block"
                onClick={() => onDeleteBlock(b)}
                className="shrink-0 rounded-full p-0.5 text-stone-400 transition-colors hover:bg-white hover:text-red-500"
              >
                <X className="size-3" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        );
      })}

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
  const { staff, timeBlocks, roomById, deleteTimeBlock } = useData();

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

  const dayBlocks = React.useMemo(() => {
    const dayStart = startOfDay(date);
    const dayEnd = addDays(dayStart, 1);
    return timeBlocks.filter(
      (b) =>
        matchesLocation(b.locationId, locationFilter) &&
        new Date(b.startISO) < dayEnd &&
        new Date(b.endISO) > dayStart
    );
  }, [timeBlocks, date, locationFilter]);

  const staffBlocks = dayBlocks.filter((b) => b.staffId);
  const roomBlocks = dayBlocks.filter((b) => !b.staffId && b.roomId);
  const locationBlocks = dayBlocks.filter((b) => !b.staffId && !b.roomId);

  const handleDeleteBlock = React.useCallback(
    async (block: TimeBlock) => {
      const ok = window.confirm(
        `Remove this time block${block.reason ? ` (${block.reason})` : ""}?`
      );
      if (!ok) return;
      try {
        await deleteTimeBlock(block.id);
        toast("Time block removed");
      } catch {
        toast.error("Couldn't remove the time block. Please try again.");
      }
    },
    [deleteTimeBlock]
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

      {roomBlocks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-stone-50/70 px-4 py-2.5">
          <span className="text-[10px] font-normal tracking-[0.14em] text-muted-warm uppercase">
            Room blocks
          </span>
          {roomBlocks.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-stone-300 bg-stone-100 px-2.5 py-1 text-[11px] font-light text-stone-600"
            >
              {roomById.get(b.roomId ?? "")?.name ?? "Room"} ·{" "}
              {blockTimeLabel(b)} · {b.reason}
              <button
                type="button"
                aria-label="Remove time block"
                onClick={() => handleDeleteBlock(b)}
                className="text-stone-400 transition-colors hover:text-red-500"
              >
                <X className="size-3" strokeWidth={1.75} />
              </button>
            </span>
          ))}
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
                blocks={staffBlocks.filter((b) => b.staffId === s.id)}
                date={date}
                onSelect={onSelect}
                onDeleteBlock={handleDeleteBlock}
              />
            ))}

            {/* Location-wide blocks span every column. */}
            {locationBlocks.map((b) => {
              const pos = blockPosition(b, date);
              if (!pos) return null;
              return (
                <div
                  key={b.id}
                  className="pointer-events-none absolute right-0 left-14 z-[5] px-1.5"
                  style={{ top: pos.top, height: pos.height }}
                >
                  <div
                    className="flex h-full items-start justify-center overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-100/70 p-2"
                    style={{ backgroundImage: HATCH_STYLE }}
                  >
                    <span className="pointer-events-auto inline-flex max-w-full items-center gap-1.5 rounded-full border border-stone-200 bg-white/90 px-2.5 py-1 text-[11px] font-light text-stone-600 shadow-xs">
                      <span className="truncate">
                        Location blocked · {b.reason} · {blockTimeLabel(b)}
                      </span>
                      <button
                        type="button"
                        aria-label="Remove time block"
                        onClick={() => handleDeleteBlock(b)}
                        className="shrink-0 text-stone-400 transition-colors hover:text-red-500"
                      >
                        <X className="size-3" strokeWidth={1.75} />
                      </button>
                    </span>
                  </div>
                </div>
              );
            })}

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
