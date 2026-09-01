// Repeat-appointment expansion. Pure — no React, no I/O.
// Dates are local-time, same as the in-app booker.

import { addDays, addMonths, addWeeks, format, parse, startOfDay } from "date-fns";

import type { Appointment, LocationId } from "../../data/types";
import {
  findRoom,
  getConflicts,
  type ConflictKind,
  type DraftAppointment,
  type SchedulingContext,
} from "./engine";

export type RepeatUnit = "day" | "week" | "month";

export interface RepeatRule {
  every: number;
  unit: RepeatUnit;
  /** Inclusive yyyy-MM-dd. */
  untilDate: string;
}

export const MAX_REPEAT_OCCURRENCES = 52;

export function cadenceLabel(every: number, unit: RepeatUnit): string {
  const n = Math.max(1, Math.floor(every));
  if (n === 1) {
    return unit === "day" ? "every day" : unit === "week" ? "every week" : "every month";
  }
  const plural =
    unit === "day" ? "days" : unit === "week" ? "weeks" : "months";
  return `every ${n} ${plural}`;
}

/**
 * First visit plus every N days/weeks/months, through untilDate inclusive.
 * Monthly keeps the original day-of-month when the month is long enough
 * (Jan 31 → Feb 28 → Mar 31).
 */
export function expandRepeatStarts(
  first: Date,
  rule: RepeatRule
): { starts: Date[]; truncated: boolean } {
  const every = Math.max(1, Math.floor(rule.every) || 1);
  const until = parse(rule.untilDate, "yyyy-MM-dd", new Date());
  if (Number.isNaN(until.getTime())) return { starts: [new Date(first)], truncated: false };

  const untilDay = startOfDay(until);
  const originalDay = first.getDate();
  const starts: Date[] = [];
  let current = new Date(first);
  let truncated = false;

  while (startOfDay(current).getTime() <= untilDay.getTime()) {
    if (starts.length >= MAX_REPEAT_OCCURRENCES) {
      truncated = true;
      break;
    }
    starts.push(new Date(current));
    current =
      rule.unit === "day"
        ? addDays(current, every)
        : rule.unit === "week"
          ? addWeeks(current, every)
          : addMonthsKeepDay(current, every, originalDay);
  }

  return { starts, truncated };
}

function addMonthsKeepDay(date: Date, months: number, originalDay: number): Date {
  const nextMonth = addMonths(
    new Date(date.getFullYear(), date.getMonth(), 1),
    months
  );
  const lastDay = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth() + 1,
    0
  ).getDate();
  const result = new Date(date);
  result.setFullYear(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(originalDay, lastDay));
  return result;
}

export interface PlannedOccurrence {
  startISO: string;
  roomId?: string;
}

export interface SkippedOccurrence {
  startISO: string;
  reasons: ConflictKind[];
}

/**
 * Decide which expanded starts actually get a row. The first visit is kept
 * even if it has conflicts (same as a one-off booker). Later visits that
 * collide, fall on a day off, or have no room are skipped.
 */
export function planRepeatOccurrences(args: {
  ctx: SchedulingContext;
  draft: Omit<DraftAppointment, "startISO">;
  starts: Date[];
  preferredRoomId?: string;
}): { keep: PlannedOccurrence[]; skipped: SkippedOccurrence[] } {
  const keep: PlannedOccurrence[] = [];
  const skipped: SkippedOccurrence[] = [];
  let appointments: Appointment[] = args.ctx.appointments;

  args.starts.forEach((start, index) => {
    const ctx: SchedulingContext = { ...args.ctx, appointments };
    const startISO = start.toISOString();
    const draft: DraftAppointment = { ...args.draft, startISO };

    let roomId: string | undefined;
    if (args.preferredRoomId) {
      const pinned = getConflicts(ctx, {
        ...draft,
        roomId: args.preferredRoomId,
      });
      if (pinned.length === 0) roomId = args.preferredRoomId;
    }
    if (!roomId) {
      roomId = findRoom(ctx, draft) ?? undefined;
    }

    const conflicts = getConflicts(ctx, { ...draft, roomId });
    if (conflicts.length > 0 && index > 0) {
      skipped.push({
        startISO,
        reasons: conflicts.map((c) => c.kind),
      });
      return;
    }

    keep.push({ startISO, roomId });
    appointments = [
      ...appointments,
      {
        id: `repeat-pending-${index}`,
        clientId: "pending",
        serviceId: args.draft.serviceId,
        staffId: args.draft.staffId,
        locationId: args.draft.locationId as LocationId,
        startISO,
        durationMin: args.draft.durationMin,
        price: 0,
        status: "confirmed",
        roomId,
      },
    ];
  });

  return { keep, skipped };
}

export function seriesNoteLine(rule: RepeatRule): string {
  const until = parse(rule.untilDate, "yyyy-MM-dd", new Date());
  const untilLabel = Number.isNaN(until.getTime())
    ? rule.untilDate
    : format(until, "MMM d");
  return `Repeats ${cadenceLabel(rule.every, rule.unit)} through ${untilLabel}`;
}
