// Public booking over the app's own scheduling engine — the app IS the
// booking authority (post-Square pivot). Reads go through the anon-safe
// public_booking_config / public_booking_occupancy RPCs; writes go through
// public_create_booking, which re-validates staff + room under a per-day
// advisory lock so two clients can't take the same slot.
//
// The route contract (field names like variationId/teamMemberId) is kept
// from the Square era so the /book UI needed no changes.

// The engine interprets "HH:MM" rules in process-local time; deploys run UTC,
// so pin the process to salon time. (TZ=America/Los_Angeles in the deploy env
// is the belt to this suspender.)
process.env.TZ = "America/Los_Angeles";

import { createClient } from "@supabase/supabase-js";
import { addDays, addMinutes, parseISO, startOfDay } from "date-fns";

import type {
  Appointment,
  AvailabilityOverride,
  AvailabilityRule,
  LocationId,
  Room,
  Service,
  ServiceCategory,
  StaffMember,
  TimeBlock,
} from "../../data/types";
import {
  availableSlots,
  findRoom,
  getConflicts,
  type SchedulingContext,
} from "../scheduling/engine";
import { sendEmail } from "../email/send";
import {
  escapeHtml,
  formatAppointmentWhen,
  sendClientBookingConfirmation,
} from "../email/confirmation";

const LOCATION_ID: LocationId = "valencia";

/** Thrown for anything the booker should see as a friendly message. */
export class BookingError extends Error {}

// --- Gate --------------------------------------------------------------------

export async function bookingSurfaceEnabled(): Promise<boolean> {
  if (process.env.VERCEL_ENV === "production") {
    const data = await getPublicBookingData();
    return data.settings.onlineBookingEnabled;
  }
  return process.env.BOOKING_STAGING === "1";
}

// --- Config + occupancy ------------------------------------------------------

interface PublicStaffRow {
  id: string;
  name: string;
  bookable: boolean;
  serviceIds: string[];
}

export interface PublicBookingData {
  settings: { onlineBookingEnabled: boolean; minNoticeHours: number };
  rooms: Room[];
  services: Service[];
  serviceById: Map<string, Service>;
  staff: PublicStaffRow[];
  availabilityRules: AvailabilityRule[];
  availabilityOverrides: AvailabilityOverride[];
  timeBlocks: TimeBlock[];
}

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

interface RawConfig {
  onlineBookingEnabled: boolean;
  minNoticeHours: number;
  rooms: Room[];
  services: Array<Omit<Service, "price"> & { price: number | string }>;
  staff: PublicStaffRow[];
  availabilityRules: AvailabilityRule[];
  availabilityOverrides: AvailabilityOverride[];
  timeBlocks: TimeBlock[];
}

export async function getPublicBookingData(): Promise<PublicBookingData> {
  const { data, error } = await supabase().rpc("public_booking_config");
  if (error) throw new Error(`public_booking_config failed: ${error.message}`);
  const raw = data as RawConfig;
  const services: Service[] = raw.services.map((s) => ({
    ...s,
    price: Number(s.price),
    category: s.category as ServiceCategory,
  }));
  return {
    settings: {
      onlineBookingEnabled: raw.onlineBookingEnabled,
      minNoticeHours: Number(raw.minNoticeHours),
    },
    rooms: raw.rooms,
    services,
    serviceById: new Map(services.map((s) => [s.id, s])),
    staff: raw.staff,
    availabilityRules: raw.availabilityRules,
    availabilityOverrides: raw.availabilityOverrides,
    timeBlocks: raw.timeBlocks,
  };
}

interface OccupancyRow {
  id: string;
  serviceId: string;
  staffId: string;
  locationId: string;
  startISO: string;
  durationMin: number;
  status: string;
  roomId: string | null;
}

async function fetchOccupancy(
  fromISO: string,
  toISO: string
): Promise<Appointment[]> {
  const { data, error } = await supabase().rpc("public_booking_occupancy", {
    p_from: fromISO,
    p_to: toISO,
  });
  if (error)
    throw new Error(`public_booking_occupancy failed: ${error.message}`);
  return ((data ?? []) as OccupancyRow[]).map((r) => ({
    id: r.id,
    clientId: "",
    serviceId: r.serviceId,
    staffId: r.staffId,
    locationId: r.locationId as Appointment["locationId"],
    startISO: r.startISO,
    durationMin: r.durationMin,
    price: 0,
    status: r.status as Appointment["status"],
    roomId: r.roomId ?? undefined,
  }));
}

// --- Context building (exported for tests) -----------------------------------

/** Minimal StaffMember for the engine; only id/bookable/serviceIds matter. */
function toEngineStaff(s: PublicStaffRow): StaffMember {
  return {
    id: s.id,
    name: s.name,
    role: "",
    initials: "",
    color: "",
    locations: [LOCATION_ID],
    email: "",
    phone: "",
    bookable: s.bookable,
    employmentType: "contractor-1099",
    serviceIds: s.serviceIds ?? [],
  };
}

export function buildContext(
  data: PublicBookingData,
  occupancy: Appointment[]
): SchedulingContext {
  return {
    appointments: occupancy,
    timeBlocks: data.timeBlocks,
    availabilityRules: data.availabilityRules,
    availabilityOverrides: data.availabilityOverrides,
    rooms: data.rooms,
    serviceById: data.serviceById,
    staff: data.staff.map(toEngineStaff),
  };
}

export function performersForService(
  data: PublicBookingData,
  serviceId: string
): PublicStaffRow[] {
  return data.staff.filter(
    (s) =>
      s.bookable &&
      ((s.serviceIds ?? []).length === 0 || s.serviceIds.includes(serviceId))
  );
}

/** Girls who can perform every one of the given services (main + add-ons). */
export function performersForAll(
  data: PublicBookingData,
  serviceIds: string[]
): PublicStaffRow[] {
  return data.staff.filter(
    (s) =>
      s.bookable &&
      serviceIds.every(
        (id) =>
          (s.serviceIds ?? []).length === 0 || s.serviceIds.includes(id)
      )
  );
}

// --- Services + staff for the picker -----------------------------------------

export interface PublicService {
  variationId: string;
  name: string;
  durationMin: number;
  priceCents: number | null;
  category: string;
  teamMemberIds: string[];
}

export interface PublicStaff {
  id: string;
  name: string;
}

/** Add-on: only offered after a main service in one of `addonFor`'s categories. */
export interface PublicAddon {
  variationId: string;
  name: string;
  durationMin: number;
  priceCents: number;
  addonFor: string[];
  teamMemberIds: string[];
}

export async function listPublicServices(): Promise<{
  services: PublicService[];
  addons: PublicAddon[];
  staff: PublicStaff[];
}> {
  const data = await getPublicBookingData();
  const services: PublicService[] = [];
  const addons: PublicAddon[] = [];
  for (const s of data.services) {
    const performers = performersForService(data, s.id);
    if (performers.length === 0) continue; // nobody performs it -> not bookable
    if (s.addonFor && s.addonFor.length > 0) {
      addons.push({
        variationId: s.id,
        name: s.name,
        durationMin: s.durationMin,
        priceCents: Math.round(s.price * 100),
        addonFor: s.addonFor,
        teamMemberIds: performers.map((p) => p.id),
      });
      continue;
    }
    services.push({
      variationId: s.id,
      name: s.name,
      durationMin: s.durationMin,
      priceCents: Math.round(s.price * 100),
      category: s.category,
      teamMemberIds: performers.map((p) => p.id),
    });
  }
  services.sort(
    (a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
  addons.sort((a, b) => a.name.localeCompare(b.name));
  const staff = data.staff
    .filter((s) => s.bookable)
    .map((s) => ({ id: s.id, name: s.name.split(" ")[0] }));
  return { services, addons, staff };
}

// --- Availability ------------------------------------------------------------

export interface BridgeSlot {
  startAt: string;
  teamMemberId: string;
}

/**
 * Pure slot computation over pre-fetched data — exported for tests.
 * Walks each salon-local day in [startAt, endAt), runs the engine, and
 * dedupes to one slot per start time (first staff wins) so "first available"
 * doesn't render duplicate time buttons.
 *
 * Add-ons extend the same appointment block: the engine sees one service with
 * the combined duration, and only girls who perform the main service AND every
 * chosen add-on are candidates.
 */
export function computeSlots(
  data: PublicBookingData,
  occupancy: Appointment[],
  args: {
    serviceVariationId: string;
    teamMemberId?: string;
    startAt: string;
    endAt: string;
    addonIds?: string[];
  }
): BridgeSlot[] {
  const main = data.serviceById.get(args.serviceVariationId);
  if (!main || (main.addonFor && main.addonFor.length > 0)) return [];
  const addonIds = [...new Set(args.addonIds ?? [])];
  const addons: Service[] = [];
  for (const id of addonIds) {
    const addon = data.serviceById.get(id);
    if (!addon?.addonFor?.includes(main.category)) return [];
    addons.push(addon);
  }

  let ctx = buildContext(data, occupancy);
  if (addons.length > 0) {
    const durationMin =
      main.durationMin + addons.reduce((sum, a) => sum + a.durationMin, 0);
    const serviceById = new Map(ctx.serviceById);
    serviceById.set(main.id, { ...main, durationMin });
    const eligible = performersForAll(data, [main.id, ...addonIds]);
    if (
      args.teamMemberId &&
      !eligible.some((s) => s.id === args.teamMemberId)
    ) {
      return [];
    }
    ctx = { ...ctx, serviceById, staff: eligible.map(toEngineStaff) };
  }

  const start = parseISO(args.startAt);
  const end = parseISO(args.endAt);
  const out: BridgeSlot[] = [];
  const seenStarts = new Set<string>();
  for (let day = startOfDay(start); day <= end; day = addDays(day, 1)) {
    const slots = availableSlots(ctx, {
      serviceId: args.serviceVariationId,
      locationId: LOCATION_ID,
      date: day,
      staffId: args.teamMemberId,
    });
    for (const slot of slots) {
      const t = parseISO(slot.startISO).getTime();
      if (t < start.getTime() || t >= end.getTime()) continue;
      if (seenStarts.has(slot.startISO)) continue;
      seenStarts.add(slot.startISO);
      out.push({ startAt: slot.startISO, teamMemberId: slot.staffId });
    }
  }
  return out;
}

export async function publicAvailability(args: {
  serviceVariationId: string;
  teamMemberId?: string;
  startAt: string;
  endAt: string;
  addonIds?: string[];
}): Promise<BridgeSlot[]> {
  const data = await getPublicBookingData();
  const occupancy = await fetchOccupancy(
    addMinutes(parseISO(args.startAt), -24 * 60).toISOString(),
    addMinutes(parseISO(args.endAt), 24 * 60).toISOString()
  );
  return computeSlots(data, occupancy, args);
}

// --- Create ------------------------------------------------------------------

export interface CreateBookingResult {
  bookingId: string;
  startAt: string;
  status: string;
}

export async function createPublicBooking(args: {
  serviceVariationId: string;
  teamMemberId: string;
  startAt: string;
  addonIds?: string[];
  customer: {
    givenName: string;
    familyName: string;
    email: string;
    phone?: string;
  };
  note?: string;
}): Promise<CreateBookingResult> {
  const data = await getPublicBookingData();
  const service = data.serviceById.get(args.serviceVariationId);
  if (!service || (service.addonFor && service.addonFor.length > 0))
    throw new BookingError("Unknown service.");
  const addonIds = [...new Set(args.addonIds ?? [])];
  const addons: Service[] = [];
  for (const id of addonIds) {
    const addon = data.serviceById.get(id);
    if (!addon?.addonFor?.includes(service.category)) {
      throw new BookingError(
        "One of those add-ons isn't available with this service."
      );
    }
    addons.push(addon);
  }
  const performs = performersForAll(data, [service.id, ...addonIds]).some(
    (s) => s.id === args.teamMemberId
  );
  if (!performs)
    throw new BookingError("That team member does not offer this service.");

  const start = parseISO(args.startAt);
  // Same-day stays phone/walk-in; online booking opens at the next salon-local
  // day (the process is pinned to America/Los_Angeles).
  if (start < addDays(startOfDay(new Date()), 1)) {
    throw new BookingError(
      "Same-day times can't be booked online — call us and we'll fit you in."
    );
  }
  const earliest =
    Date.now() + (data.settings.minNoticeHours - 1) * 60 * 60 * 1000;
  if (start.getTime() < earliest) {
    throw new BookingError(
      "That time can no longer be booked online. Please pick another time."
    );
  }

  const durationMin =
    service.durationMin + addons.reduce((sum, a) => sum + a.durationMin, 0);
  const occupancy = await fetchOccupancy(
    addMinutes(start, -24 * 60).toISOString(),
    addMinutes(start, 24 * 60).toISOString()
  );
  let ctx = buildContext(data, occupancy);
  if (addons.length > 0) {
    const serviceById = new Map(ctx.serviceById);
    serviceById.set(service.id, { ...service, durationMin });
    ctx = { ...ctx, serviceById };
  }
  const draft = {
    locationId: LOCATION_ID,
    serviceId: service.id,
    staffId: args.teamMemberId,
    startISO: args.startAt,
    durationMin,
  };
  if (getConflicts(ctx, draft).length > 0) {
    throw new BookingError("That time was just taken. Please pick another time.");
  }
  const roomId = findRoom(ctx, draft);
  if (!roomId) {
    throw new BookingError("That time was just taken. Please pick another time.");
  }

  const { data: created, error } = await supabase().rpc(
    "public_create_booking",
    {
      p_service_id: service.id,
      p_staff_id: args.teamMemberId,
      p_start: args.startAt,
      p_room_id: roomId,
      p_first: args.customer.givenName,
      p_last: args.customer.familyName,
      p_email: args.customer.email,
      p_phone: args.customer.phone ?? "",
      p_note: args.note ?? "",
      p_addon_ids: addonIds,
    }
  );
  if (error) {
    if (error.message.includes("BOOKING_CONFLICT")) {
      throw new BookingError(
        "That time was just taken. Please pick another time."
      );
    }
    if (error.message.includes("BOOKING_INVALID")) {
      throw new BookingError(
        "That time can't be booked online. Please pick another time."
      );
    }
    throw new Error(`public_create_booking failed: ${error.message}`);
  }
  const result = created as CreateBookingResult;

  // Confirmation email is best-effort — the booking exists either way.
  const staffName =
    data.staff.find((s) => s.id === args.teamMemberId)?.name.split(" ")[0] ??
    "our team";
  const when = formatAppointmentWhen(result.startAt);
  const addonLine =
    addons.length > 0 ? ` + ${addons.map((a) => a.name).join(", ")}` : "";
  const clientName = [args.customer.givenName, args.customer.familyName]
    .filter(Boolean)
    .join(" ");
  await sendClientBookingConfirmation({
    to: args.customer.email,
    firstName: args.customer.givenName,
    serviceName: service.name,
    addonNames: addons.map((a) => a.name),
    startAt: result.startAt,
    staffName,
    locationId: LOCATION_ID,
  });

  // Salon copy so Carolina sees the booking without opening the app.
  // Default is the yahoo inbox replies already go to. Not a blast to the girls.
  const salonTo =
    process.env.EMAIL_SALON_NOTIFY ?? "skin360facebodyscalp@yahoo.com";
  try {
    await sendEmail({
      to: salonTo,
      subject: `New online booking — ${service.name} with ${staffName}`,
      html: `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;background:#fdfbf6;color:#2b2723">
    <p style="text-align:center;letter-spacing:4px;font-size:11px;color:#a67c34">SKIN 360 · VALENCIA</p>
    <h1 style="text-align:center;font-weight:500">New online booking</h1>
    <div style="margin:24px auto;padding:20px;border:1px solid #ece3d3;border-radius:16px;background:#fff">
      <p style="margin:0;font-size:16px">${escapeHtml(service.name)}${escapeHtml(addonLine)}</p>
      <p style="margin:8px 0 0;font-size:14px">${when}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#837a6d">with ${escapeHtml(staffName)}</p>
      <p style="margin:16px 0 0;font-size:14px">${escapeHtml(clientName)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#837a6d">${escapeHtml(args.customer.email)}${args.customer.phone ? `<br/>${escapeHtml(args.customer.phone)}` : ""}</p>
    </div>
    <p style="text-align:center;font-size:13px;color:#837a6d">
      It's already on the calendar in the app. No need to add it in Square.
    </p>
  </div>`,
    });
  } catch (err) {
    console.error("salon booking notify failed:", err);
  }

  return result;
}
