import { format, parse } from "date-fns";

export const FIELD_CLASSES =
  "h-11 w-full rounded-full border-line bg-ivory/50 px-4 text-sm font-light data-[size=default]:h-11 focus-visible:border-gold-300 focus-visible:ring-gold-200/50";

export const COMPACT_FIELD_CLASSES =
  "h-9 rounded-full border-line bg-ivory/50 px-3 text-sm font-light data-[size=default]:h-9 focus-visible:border-gold-300 focus-visible:ring-gold-200/50";

export const LABEL_CLASSES = "text-xs tracking-wide uppercase text-muted-warm";

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export interface TimeOption {
  value: string; // "HH:MM"
  label: string; // "7:00 AM"
}

// 15-minute increments from 7:00 AM through 9:00 PM.
export const TIME_OPTIONS: TimeOption[] = (() => {
  const out: TimeOption[] = [];
  for (let mins = 7 * 60; mins <= 21 * 60; mins += 15) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const h12 = ((h + 11) % 12) + 1;
    out.push({
      value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      label: `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`,
    });
  }
  return out;
})();

/** "14:30" (or "14:30:00") → "2:30 PM" */
export function fmtTime(hhmm: string): string {
  return format(parse(hhmm.slice(0, 5), "HH:mm", new Date()), "h:mm a");
}
