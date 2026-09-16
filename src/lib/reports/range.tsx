"use client";

import * as React from "react";
import {
  addDays,
  eachDayOfInterval,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

export type ReportPreset = "this-week" | "this-month" | "last-30" | "last-90" | "custom";

export interface ReportRange {
  from: string;
  to: string;
  preset: ReportPreset;
  setPreset: (preset: ReportPreset) => void;
  setFrom: (from: string) => void;
  setTo: (to: string) => void;
  start: Date;
  endExclusive: Date;
  label: string;
}

const ReportRangeContext = React.createContext<ReportRange | null>(null);

function ymd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function boundsForPreset(preset: ReportPreset, now = new Date()): {
  from: string;
  to: string;
} {
  const today = startOfDay(now);
  if (preset === "this-week") {
    const start = startOfWeek(today, { weekStartsOn: 1 });
    return { from: ymd(start), to: ymd(today) };
  }
  if (preset === "this-month") {
    return { from: ymd(startOfMonth(today)), to: ymd(today) };
  }
  if (preset === "last-90") {
    return { from: ymd(subDays(today, 89)), to: ymd(today) };
  }
  return { from: ymd(subDays(today, 29)), to: ymd(today) };
}

export function ReportRangeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preset, setPresetState] = React.useState<ReportPreset>("this-week");
  const initial = boundsForPreset("this-week");
  const [from, setFromState] = React.useState(initial.from);
  const [to, setToState] = React.useState(initial.to);

  const setPreset = React.useCallback((next: ReportPreset) => {
    setPresetState(next);
    if (next === "custom") return;
    const b = boundsForPreset(next);
    setFromState(b.from);
    setToState(b.to);
  }, []);

  const setFrom = React.useCallback((next: string) => {
    setPresetState("custom");
    setFromState(next);
  }, []);

  const setTo = React.useCallback((next: string) => {
    setPresetState("custom");
    setToState(next);
  }, []);

  const start = startOfDay(new Date(`${from}T00:00:00`));
  const endExclusive = addDays(startOfDay(new Date(`${to}T00:00:00`)), 1);
  const label =
    from === to
      ? format(start, "MMM d, yyyy")
      : `${format(start, "MMM d")} – ${format(addDays(endExclusive, -1), "MMM d, yyyy")}`;

  const value = React.useMemo(
    () => ({
      from,
      to,
      preset,
      setPreset,
      setFrom,
      setTo,
      start,
      endExclusive,
      label,
    }),
    [from, to, preset, setPreset, setFrom, setTo, start.getTime(), endExclusive.getTime(), label]
  );

  return (
    <ReportRangeContext.Provider value={value}>
      {children}
    </ReportRangeContext.Provider>
  );
}

export function useReportRange(): ReportRange {
  const ctx = React.useContext(ReportRangeContext);
  if (!ctx) {
    throw new Error("useReportRange must be used inside ReportRangeProvider");
  }
  return ctx;
}

export function isoInRange(
  iso: string,
  start: Date,
  endExclusive: Date
): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < endExclusive.getTime();
}

export function daysInRange(
  start: Date,
  endExclusive: Date
): { date: string; label: string; day: Date }[] {
  const last = addDays(endExclusive, -1);
  if (last < start) return [];
  return eachDayOfInterval({ start, end: last }).map((day) => ({
    date: ymd(day),
    label: format(day, "MMM d"),
    day,
  }));
}
