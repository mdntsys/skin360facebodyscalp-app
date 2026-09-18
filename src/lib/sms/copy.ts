import { salonDateParts } from "./when";

const GSM_LIMIT = 160;

export function toGsmSafe(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[\u00a0\u202f\u2007\u2009\u200a]/g, " ")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "")
    .replace(/ {2,}/g, " ");
}

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  if (max <= 1) return t.slice(0, max);
  return `${t.slice(0, Math.max(1, max - 1)).trimEnd()}-`;
}

function fit(prefix: string, middle: string, suffix: string): string {
  const p = toGsmSafe(prefix);
  const m = toGsmSafe(middle);
  const s = toGsmSafe(suffix);
  const budget = GSM_LIMIT - p.length - s.length;
  return p + clip(m, Math.max(4, budget)) + s;
}

export function salonSmsPhone(locationId?: string): string {
  return locationId === "toluca" ? "(818) 601-2852" : "(661) 812-6999";
}

export function bookedSms(args: {
  firstName: string;
  serviceName: string;
  startAt: string;
  staffName: string;
}): string {
  const name = toGsmSafe(args.firstName).trim() || "there";
  const { weekday, monthDay, time } = salonDateParts(args.startAt);
  const staff = toGsmSafe(args.staffName).trim() || "us";
  return fit(
    `Skin 360: Hi ${name}, you're booked ${weekday} ${monthDay} at ${time} with ${staff} for `,
    args.serviceName,
    ". Reply STOP to opt out."
  );
}

export function reminderSms(args: {
  firstName: string;
  serviceName: string;
  startAt: string;
  staffName: string;
  locationId?: string;
}): string {
  const name = toGsmSafe(args.firstName).trim() || "there";
  const { time } = salonDateParts(args.startAt);
  const staff = toGsmSafe(args.staffName).trim() || "us";
  const phone = salonSmsPhone(args.locationId);
  return fit(
    `Skin 360: Reminder, ${name}, tomorrow ${time} with ${staff}: `,
    args.serviceName,
    `. Call ${phone}. Reply STOP to opt out.`
  );
}

export function cancelledSms(args: {
  startAt: string;
  locationId?: string;
}): string {
  const { weekday, monthDay, time } = salonDateParts(args.startAt);
  const phone = salonSmsPhone(args.locationId);
  return toGsmSafe(
    `Skin 360: ${weekday} ${monthDay} ${time} is cancelled. Rebook at app.skin360facebodyscalp.com/book or ${phone}. Reply STOP to opt out.`
  );
}

export function smsLength(body: string): number {
  return toGsmSafe(body).length;
}

export function isSingleSegment(body: string): boolean {
  return toGsmSafe(body).length <= GSM_LIMIT;
}
