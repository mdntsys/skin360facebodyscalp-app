// Server-side helpers behind the public /api/booking routes.
//
// Gate: in production (SQUARE_ENV=production) the master switch in
// app_settings decides whether the public booking surface exists at all.
// Outside production it requires BOOKING_STAGING=1, so the admin deployment
// never grows a surprise public page.

import { createClient } from "@supabase/supabase-js";

import type {
  AvailabilityOverride,
  AvailabilityRule,
  Room,
  TimeBlock,
} from "../../data/types";
import {
  checkSlot,
  fetchBridgeBookings,
  fetchBridgeServices,
  roomSafeAvailability,
  simulateRoomAssignments,
  type BridgeSlot,
} from "./booking-bridge";
import { square, SquareApiError } from "./client";
import { slotWithinSchedule } from "./schedule-filter";

export interface BookingConfig {
  onlineBookingEnabled: boolean;
  minNoticeHours: number;
  rooms: Room[];
  staffSquareIds: Record<string, string>;
  availabilityRules: AvailabilityRule[];
  availabilityOverrides: AvailabilityOverride[];
  timeBlocks: TimeBlock[];
}

export async function getBookingConfig(): Promise<BookingConfig> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  const { data, error } = await supabase.rpc("public_booking_config");
  if (error) throw new Error(`public_booking_config failed: ${error.message}`);
  return data as BookingConfig;
}

export async function bookingSurfaceEnabled(): Promise<boolean> {
  if (process.env.SQUARE_ENV === "production") {
    const config = await getBookingConfig();
    return config.onlineBookingEnabled;
  }
  return process.env.BOOKING_STAGING === "1";
}

function locationId(): string {
  const id = process.env.SQUARE_LOCATION_ID;
  if (!id) throw new Error("Missing SQUARE_LOCATION_ID env var");
  return id;
}

// --- Services + staff for the picker ----------------------------------------

interface BookingProfilesResponse {
  team_member_booking_profiles?: Array<{
    team_member_id: string;
    display_name?: string;
    is_bookable?: boolean;
  }>;
  cursor?: string;
}

export interface PublicStaff {
  id: string;
  name: string;
}

export async function listBookableStaff(): Promise<PublicStaff[]> {
  const out: PublicStaff[] = [];
  let cursor: string | undefined;
  do {
    const res: BookingProfilesResponse = await square(
      "GET",
      `/v2/bookings/team-member-booking-profiles?bookable_only=true${cursor ? `&cursor=${cursor}` : ""}`
    );
    for (const p of res.team_member_booking_profiles ?? []) {
      if (p.is_bookable === false) continue;
      out.push({
        id: p.team_member_id,
        name: p.display_name?.split(" ")[0] ?? "Staff",
      });
    }
    cursor = res.cursor;
  } while (cursor);
  return out;
}

export interface PublicService {
  variationId: string;
  name: string;
  durationMin: number;
  priceCents: number | null;
  category: string;
  teamMemberIds: string[];
}

export async function listPublicServices(): Promise<{
  services: PublicService[];
  staff: PublicStaff[];
}> {
  const [services, staff] = await Promise.all([
    fetchBridgeServices(),
    listBookableStaff(),
  ]);
  const bookableIds = new Set(staff.map((s) => s.id));
  const out: PublicService[] = [];
  for (const s of services.values()) {
    const performers = (s.teamMemberIds ?? []).filter((id) => bookableIds.has(id));
    if (performers.length === 0) continue; // nobody performs it -> not bookable
    out.push({
      variationId: s.variationId,
      name: s.name,
      durationMin: s.durationMin,
      priceCents: s.priceCents ?? null,
      category: s.squareCategory ?? "Other",
      teamMemberIds: performers,
    });
  }
  out.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return { services: out, staff };
}

// --- Availability ------------------------------------------------------------

export async function publicAvailability(args: {
  serviceVariationId: string;
  teamMemberId?: string;
  startAt: string;
  endAt: string;
}): Promise<BridgeSlot[]> {
  const config = await getBookingConfig();
  const services = await fetchBridgeServices();
  const durationMin = services.get(args.serviceVariationId)?.durationMin ?? 0;
  const slots = await roomSafeAvailability({
    locationId: locationId(),
    serviceVariationId: args.serviceVariationId,
    teamMemberIds: args.teamMemberId ? [args.teamMemberId] : undefined,
    startAt: args.startAt,
    endAt: args.endAt,
    rooms: config.rooms,
    services,
  });
  return slots.filter((slot) =>
    slotWithinSchedule(config, slot.teamMemberId, slot.startAt, durationMin)
  );
}

// --- Create ------------------------------------------------------------------

interface CustomerSearchResponse {
  customers?: Array<{ id: string }>;
}

/** "(818) 555-0123" -> "+18185550123"; returns undefined when hopeless. */
function normalizePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.startsWith("+") ? raw : undefined;
}

async function findOrCreateCustomer(details: {
  givenName: string;
  familyName: string;
  email: string;
  phone?: string;
}): Promise<string> {
  const found: CustomerSearchResponse = await square("POST", "/v2/customers/search", {
    query: { filter: { email_address: { exact: details.email } } },
    limit: 1,
  });
  if (found.customers?.[0]?.id) return found.customers[0].id;

  const create = (phone: string | undefined) =>
    square<{ customer?: { id: string } }>("POST", "/v2/customers", {
      idempotency_key: crypto.randomUUID(),
      given_name: details.givenName,
      family_name: details.familyName,
      email_address: details.email,
      phone_number: phone,
    });

  let created;
  try {
    created = await create(normalizePhone(details.phone));
  } catch (err) {
    // A phone Square won't accept must not cost the client her booking.
    if (
      err instanceof SquareApiError &&
      err.errors.some((e) => e.code === "INVALID_PHONE_NUMBER")
    ) {
      created = await create(undefined);
    } else {
      throw err;
    }
  }
  if (!created.customer?.id) throw new Error("Could not create customer");
  return created.customer.id;
}

export interface CreateBookingResult {
  bookingId: string;
  startAt: string;
  status: string;
}

export async function createPublicBooking(args: {
  serviceVariationId: string;
  serviceVariationVersion?: number;
  teamMemberId: string;
  startAt: string;
  customer: { givenName: string; familyName: string; email: string; phone?: string };
  note?: string;
}): Promise<CreateBookingResult> {
  const config = await getBookingConfig();
  const services = await fetchBridgeServices();
  const service = services.get(args.serviceVariationId);
  if (!service) throw new Error("Unknown service");

  // Race safety: re-check the room right before writing. Square re-checks the
  // staff side itself and rejects a taken slot.
  const windowEnd = new Date(
    new Date(args.startAt).getTime() + service.durationMin * 60000
  ).toISOString();
  const bookings = await fetchBridgeBookings(locationId(), args.startAt, windowEnd);
  const occupancy = simulateRoomAssignments(config.rooms, services, bookings);
  const room = checkSlot(config.rooms, services, occupancy, {
    serviceVariationId: args.serviceVariationId,
    startAt: args.startAt,
    durationMin: service.durationMin,
  });
  if (!room.ok) {
    throw new Error(
      "That time was just taken. Please pick another time."
    );
  }
  if (
    !slotWithinSchedule(config, args.teamMemberId, args.startAt, service.durationMin)
  ) {
    throw new Error("That time isn't available. Please pick another time.");
  }

  const customerId = await findOrCreateCustomer(args.customer);
  const created = await square<{
    booking?: { id: string; start_at: string; status: string };
  }>("POST", "/v2/bookings", {
    idempotency_key: crypto.randomUUID(),
    booking: {
      location_id: locationId(),
      start_at: args.startAt,
      customer_id: customerId,
      customer_note: args.note || undefined,
      appointment_segments: [
        {
          team_member_id: args.teamMemberId,
          service_variation_id: args.serviceVariationId,
          service_variation_version:
            args.serviceVariationVersion ?? service.version,
        },
      ],
    },
  });
  if (!created.booking) throw new Error("Square did not return a booking");
  return {
    bookingId: created.booking.id,
    startAt: created.booking.start_at,
    status: created.booking.status,
  };
}
