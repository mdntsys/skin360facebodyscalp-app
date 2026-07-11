import { addDays, addMinutes, isBefore, set, startOfWeek } from "date-fns";
import type { Appointment, AppointmentStatus, LocationId } from "./types";
import { services } from "./core";

// All appointments are seeded relative to the current week (Mon–Sun) so the
// calendar and dashboard always show live-looking data.
export const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

const svc = (id: string) => {
  const s = services.find((x) => x.id === id);
  if (!s) throw new Error(`unknown service ${id}`);
  return s;
};

interface Seed {
  day: number; // 0 = Monday
  h: number;
  m?: number;
  clientId: string;
  serviceId: string;
  staffId: string;
  locationId: LocationId;
  status?: AppointmentStatus; // explicit override (cancelled / no-show)
  note?: string;
}

const seeds: Seed[] = [
  // Monday
  { day: 0, h: 9, m: 30, clientId: "cl-07", serviceId: "svc-classic-facial", staffId: "staff-carolina", locationId: "toluca", note: "Series session 6 of 10" },
  { day: 0, h: 11, clientId: "cl-10", serviceId: "svc-gel-manicure", staffId: "staff-jenny", locationId: "toluca" },
  { day: 0, h: 13, clientId: "cl-02", serviceId: "svc-classic-facial", staffId: "staff-jenny", locationId: "toluca" },
  { day: 0, h: 15, clientId: "cl-04", serviceId: "svc-zero-gravity", staffId: "staff-carolina", locationId: "toluca" },
  // Tuesday
  { day: 1, h: 9, clientId: "cl-14", serviceId: "svc-japanese-scalp", staffId: "staff-carolina", locationId: "toluca" },
  { day: 1, h: 10, m: 30, clientId: "cl-08", serviceId: "svc-post-op-body", staffId: "staff-marisol", locationId: "valencia", note: "Week 5 post-op — medium pressure OK" },
  { day: 1, h: 11, clientId: "cl-16", serviceId: "svc-classic-facial", staffId: "staff-jenny", locationId: "toluca" },
  { day: 1, h: 14, clientId: "cl-03", serviceId: "svc-lymphatic", staffId: "staff-marisol", locationId: "valencia", note: "Series session 4 of 6" },
  { day: 1, h: 16, clientId: "cl-01", serviceId: "svc-cleopatra-gold", staffId: "staff-carolina", locationId: "toluca" },
  // Wednesday
  { day: 2, h: 9, m: 30, clientId: "cl-12", serviceId: "svc-derma-glow", staffId: "staff-carolina", locationId: "toluca", note: "Bridal prep — first visit" },
  { day: 2, h: 11, m: 30, clientId: "cl-11", serviceId: "svc-classic-facial", staffId: "staff-marisol", locationId: "valencia", note: "Glow Society monthly facial" },
  { day: 2, h: 13, clientId: "cl-09", serviceId: "svc-japanese-scalp", staffId: "staff-jenny", locationId: "toluca", note: "Scalp Ritual Club monthly" },
  { day: 2, h: 14, m: 30, clientId: "cl-17", serviceId: "svc-lymphatic", staffId: "staff-marisol", locationId: "valencia" },
  { day: 2, h: 16, m: 30, clientId: "cl-18", serviceId: "svc-procell", staffId: "staff-carolina", locationId: "toluca" },
  // Thursday
  { day: 3, h: 9, clientId: "cl-05", serviceId: "svc-classic-facial", staffId: "staff-marisol", locationId: "valencia", note: "Fragrance-free products only" },
  { day: 3, h: 10, clientId: "cl-15", serviceId: "svc-classic-facial", staffId: "staff-jenny", locationId: "toluca", status: "no-show" },
  { day: 3, h: 11, m: 30, clientId: "cl-13", serviceId: "svc-lymphatic-cavitation", staffId: "staff-marisol", locationId: "valencia" },
  { day: 3, h: 13, m: 30, clientId: "cl-06", serviceId: "svc-signature-facial", staffId: "staff-carolina", locationId: "toluca", note: "Second visit — discuss membership" },
  { day: 3, h: 15, m: 30, clientId: "cl-04", serviceId: "svc-luxury-scalp", staffId: "staff-carolina", locationId: "toluca" },
  { day: 3, h: 17, clientId: "cl-10", serviceId: "svc-gel-manicure", staffId: "staff-jenny", locationId: "toluca" },
  // Friday
  { day: 4, h: 9, m: 30, clientId: "cl-08", serviceId: "svc-post-op-body", staffId: "staff-marisol", locationId: "valencia" },
  { day: 4, h: 10, clientId: "cl-01", serviceId: "svc-signature-facial", staffId: "staff-carolina", locationId: "toluca" },
  { day: 4, h: 12, clientId: "cl-02", serviceId: "svc-gel-manicure", staffId: "staff-jenny", locationId: "toluca" },
  { day: 4, h: 13, m: 30, clientId: "cl-07", serviceId: "svc-classic-facial", staffId: "staff-carolina", locationId: "toluca", note: "Series session 7 of 10" },
  { day: 4, h: 15, clientId: "cl-03", serviceId: "svc-lymphatic", staffId: "staff-marisol", locationId: "valencia", note: "Series session 5 of 6" },
  { day: 4, h: 16, m: 30, clientId: "cl-14", serviceId: "svc-derma-glow", staffId: "staff-carolina", locationId: "toluca", status: "cancelled", note: "Rescheduling to next week" },
  // Saturday
  { day: 5, h: 9, clientId: "cl-18", serviceId: "svc-signature-facial", staffId: "staff-carolina", locationId: "toluca" },
  { day: 5, h: 10, clientId: "cl-13", serviceId: "svc-lymphatic", staffId: "staff-marisol", locationId: "valencia" },
  { day: 5, h: 11, m: 30, clientId: "cl-06", serviceId: "svc-classic-facial", staffId: "staff-jenny", locationId: "toluca" },
  { day: 5, h: 13, clientId: "cl-05", serviceId: "svc-japanese-scalp", staffId: "staff-marisol", locationId: "valencia" },
  { day: 5, h: 14, m: 30, clientId: "cl-09", serviceId: "svc-luxury-scalp", staffId: "staff-carolina", locationId: "toluca" },
  // Sunday (light day — Valencia pop-up hours)
  { day: 6, h: 11, clientId: "cl-08", serviceId: "svc-post-op-body", staffId: "staff-marisol", locationId: "valencia" },
];

export const appointments: Appointment[] = seeds.map((s, i) => {
  const start = set(addDays(weekStart, s.day), {
    hours: s.h,
    minutes: s.m ?? 0,
    seconds: 0,
    milliseconds: 0,
  });
  const service = svc(s.serviceId);
  const ended = isBefore(addMinutes(start, service.durationMin), new Date());
  const status: AppointmentStatus =
    s.status ?? (ended ? "completed" : "confirmed");
  return {
    id: `apt-${String(i + 1).padStart(2, "0")}`,
    clientId: s.clientId,
    serviceId: s.serviceId,
    staffId: s.staffId,
    locationId: s.locationId,
    startISO: start.toISOString(),
    durationMin: service.durationMin,
    price: service.price,
    status,
    note: s.note,
  };
});
