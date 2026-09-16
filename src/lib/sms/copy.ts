const SALON_TZ = "America/Los_Angeles";
const GSM_LIMIT = 160;

export function toGsmSafe(s: string): string {
  return s
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\u00a0/g, " ");
}

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  if (max <= 1) return t.slice(0, max);
  return `${t.slice(0, Math.max(1, max - 1)).trimEnd()}-`;
}

function parts(startAt: string) {
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
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .replace(" ", "")
    .toLowerCase();
  return { weekday, monthDay, time };
}

function fit(prefix: string, middle: string, suffix: string): string {
  const budget = GSM_LIMIT - prefix.length - suffix.length;
  return toGsmSafe(prefix + clip(middle, Math.max(4, budget)) + suffix);
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
  const name = args.firstName.trim() || "there";
  const { weekday, monthDay, time } = parts(args.startAt);
  const staff = args.staffName.trim() || "us";
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
  const name = args.firstName.trim() || "there";
  const { time } = parts(args.startAt);
  const staff = args.staffName.trim() || "us";
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
  const { weekday, monthDay, time } = parts(args.startAt);
  const phone = salonSmsPhone(args.locationId);
  return toGsmSafe(
    `Skin 360: ${weekday} ${monthDay} ${time} is cancelled. Rebook at app.skin360facebodyscalp.com/book or ${phone}. Reply STOP to opt out.`
  );
}

export function smsLength(body: string): number {
  return toGsmSafe(body).length;
}

export function isSingleSegment(body: string): boolean {
  return smsLength(body) <= GSM_LIMIT;
}
