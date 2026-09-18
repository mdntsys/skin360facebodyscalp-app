export const SALON_TZ = "America/Los_Angeles";

export function salonYmd(iso: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

export function addYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function tomorrowSalonYmd(now = new Date()): string {
  return addYmd(salonYmd(now), 1);
}

export function salonDateParts(startAt: string): {
  weekday: string;
  monthDay: string;
  time: string;
} {
  const d = new Date(startAt);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TZ,
    weekday: "short",
  }).format(d);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TZ,
    month: "short",
    day: "numeric",
  }).format(d);
  const timeRaw = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  const time = timeRaw
    .replace(/[\u00a0\u202f\u2007\u2009\u200a]/g, " ")
    .replace(/\s+/g, "")
    .toLowerCase();
  return { weekday, monthDay, time };
}
