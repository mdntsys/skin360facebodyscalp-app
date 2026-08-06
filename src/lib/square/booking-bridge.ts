// Bridge between Square Bookings and the room engine.
//
// Square (on the Plus plan) has no concept of rooms, so it will happily offer
// a slot when every room is full. This module is the safety layer: it takes
// Square's availability plus Square's existing bookings, simulates which room
// each existing booking occupies, and drops any slot the rooms can't absorb.
//
// Room assignment for existing bookings is a chronological greedy simulation
// using the same findRoom logic used at booking time, so the website and the
// simulation always agree.

import type { Appointment, Room, Service, ServiceCategory } from "../../data/types";
import { findRoom, type SchedulingContext } from "../scheduling/engine";
import { square } from "./client";

// --- Square reporting category -> the app's room categories ----------------
// (Keys are Square's category names as they exist in Carolina's account,
// including the misspelled surgery category.)
const SQUARE_CATEGORY_TO_ROOM: Record<string, ServiceCategory> = {
  FACE: "Facials",
  "FACE ADD-ON SERVICES": "Face Add-Ons",
  BODY: "Body",
  "POST-COSMETIC SUREGERY SERVICES": "Body",
  "POST-COSMETIC SURGERY SERVICES": "Body",
  "HEAD SPA (SCALP)": "Scalp",
  "HEADSPA ADD-ON SERVICES": "Scalp",
  "NAIL SERVICES": "Nails",
  "NAIL ADD-ON SERVICES": "Nails",
  // Carolina's combined category (per her 2026-08-05 text: these happen in
  // either the massage (Body) room or the facial room). Use this exact name
  // when creating the category in Square.
  "LASH + BROW + WAX": "Lash + Brow + Wax",
};

export function roomCategoryForSquareCategory(
  squareCategoryName: string | undefined
): ServiceCategory | null {
  if (!squareCategoryName) return null;
  return SQUARE_CATEGORY_TO_ROOM[squareCategoryName.toUpperCase().trim()] ?? null;
}

// --- Minimal shapes for what we consume from Square -------------------------

/** One bookable service variation, as the bridge needs it. */
export interface BridgeService {
  variationId: string;
  name: string;
  durationMin: number;
  /** null = category we can't map; such bookings/slots skip room checks. */
  roomCategory: ServiceCategory | null;
}

/** One existing Square booking segment, flattened. */
export interface BridgeBooking {
  id: string;
  startAt: string; // ISO
  durationMin: number;
  teamMemberId: string;
  serviceVariationId: string;
}

export interface SlotCheck {
  ok: boolean;
  /** false when the service category is unmapped and rooms weren't enforced. */
  roomChecked: boolean;
  roomId: string | null;
}

// --- Pure simulation ---------------------------------------------------------

const LOCATION_ID = "valencia" as const;

function pseudoService(s: BridgeService): Service {
  return {
    id: s.variationId,
    name: s.name,
    category: (s.roomCategory ?? "Facials") as ServiceCategory,
    price: 0,
    durationMin: s.durationMin,
    bufferMin: 0,
    description: "",
  };
}

function makeContext(
  rooms: Room[],
  services: Map<string, BridgeService>,
  appointments: Appointment[]
): SchedulingContext {
  const serviceById = new Map<string, Service>();
  for (const [id, s] of services) serviceById.set(id, pseudoService(s));
  return {
    appointments,
    timeBlocks: [],
    availabilityRules: [],
    availabilityOverrides: [],
    rooms,
    serviceById,
  };
}

/**
 * Chronologically assign rooms to existing Square bookings. Bookings whose
 * service can't be mapped to a room category occupy no room (we can't know),
 * which keeps the check permissive rather than blocking real openings.
 */
export function simulateRoomAssignments(
  rooms: Room[],
  services: Map<string, BridgeService>,
  bookings: BridgeBooking[]
): Appointment[] {
  const assigned: Appointment[] = [];
  const ordered = [...bookings].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
  for (const b of ordered) {
    const service = services.get(b.serviceVariationId);
    const mapped = service?.roomCategory != null;
    let roomId: string | undefined;
    if (mapped) {
      const ctx = makeContext(rooms, services, assigned);
      roomId =
        findRoom(ctx, {
          locationId: LOCATION_ID,
          serviceId: b.serviceVariationId,
          staffId: b.teamMemberId,
          startISO: b.startAt,
          durationMin: b.durationMin,
        }) ?? undefined;
    }
    assigned.push({
      id: b.id,
      clientId: "square",
      serviceId: b.serviceVariationId,
      staffId: b.teamMemberId,
      locationId: LOCATION_ID,
      startISO: b.startAt,
      durationMin: b.durationMin,
      price: 0,
      status: "confirmed",
      roomId,
    });
  }
  return assigned;
}

/**
 * Would a new booking of `variationId` starting at `startAt` still find a
 * room, given existing Square bookings? The core question the website asks
 * for every slot Square offers.
 */
export function checkSlot(
  rooms: Room[],
  services: Map<string, BridgeService>,
  existing: Appointment[],
  candidate: { serviceVariationId: string; startAt: string; durationMin: number }
): SlotCheck {
  const service = services.get(candidate.serviceVariationId);
  if (!service || service.roomCategory === null) {
    return { ok: true, roomChecked: false, roomId: null };
  }
  const ctx = makeContext(rooms, services, existing);
  const roomId = findRoom(ctx, {
    locationId: LOCATION_ID,
    serviceId: candidate.serviceVariationId,
    staffId: "candidate",
    startISO: candidate.startAt,
    durationMin: candidate.durationMin,
  });
  return { ok: roomId !== null, roomChecked: true, roomId };
}

// --- Square fetchers ---------------------------------------------------------

interface SquareCatalogResponse {
  items?: Array<{
    id: string;
    item_data?: {
      name?: string;
      categories?: Array<{ id: string }>;
      reporting_category?: { id: string };
      variations?: Array<{
        id: string;
        item_variation_data?: {
          name?: string;
          service_duration?: number;
          team_member_ids?: string[];
        };
      }>;
    };
  }>;
  cursor?: string;
}

interface SquareCategoriesResponse {
  objects?: Array<{ id: string; category_data?: { name?: string } }>;
  cursor?: string;
}

/** All bookable services with their room category, keyed by variation id. */
export async function fetchBridgeServices(): Promise<Map<string, BridgeService>> {
  const categories = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const res = await square<SquareCategoriesResponse>(
      "GET",
      `/v2/catalog/list?types=CATEGORY${cursor ? `&cursor=${cursor}` : ""}`
    );
    for (const obj of res.objects ?? []) {
      if (obj.category_data?.name) categories.set(obj.id, obj.category_data.name);
    }
    cursor = res.cursor;
  } while (cursor);

  const services = new Map<string, BridgeService>();
  cursor = undefined;
  do {
    const res: SquareCatalogResponse = await square(
      "POST",
      "/v2/catalog/search-catalog-items",
      { product_types: ["APPOINTMENTS_SERVICE"], cursor }
    );
    for (const item of res.items ?? []) {
      const categoryId =
        item.item_data?.reporting_category?.id ??
        item.item_data?.categories?.[0]?.id;
      const categoryName = categoryId ? categories.get(categoryId) : undefined;
      for (const v of item.item_data?.variations ?? []) {
        const ms = v.item_variation_data?.service_duration ?? 0;
        services.set(v.id, {
          variationId: v.id,
          name: item.item_data?.name ?? "Service",
          durationMin: Math.round(ms / 60000),
          roomCategory: roomCategoryForSquareCategory(categoryName),
        });
      }
    }
    cursor = res.cursor;
  } while (cursor);
  return services;
}

interface SquareBookingsResponse {
  bookings?: Array<{
    id: string;
    status: string;
    start_at: string;
    appointment_segments?: Array<{
      duration_minutes?: number;
      team_member_id?: string;
      service_variation_id?: string;
    }>;
  }>;
  cursor?: string;
}

// Cancelled/declined/no-show bookings free their room.
const ACTIVE_BOOKING_STATUSES = new Set(["ACCEPTED", "PENDING"]);

/** Active Square bookings in [startAt, endAt), flattened to segments. */
export async function fetchBridgeBookings(
  locationId: string,
  startAt: string,
  endAt: string
): Promise<BridgeBooking[]> {
  const out: BridgeBooking[] = [];
  let cursor: string | undefined;
  do {
    const params = new URLSearchParams({
      location_id: locationId,
      start_at_min: startAt,
      start_at_max: endAt,
    });
    if (cursor) params.set("cursor", cursor);
    const res = await square<SquareBookingsResponse>(
      "GET",
      `/v2/bookings?${params.toString()}`
    );
    for (const b of res.bookings ?? []) {
      if (!ACTIVE_BOOKING_STATUSES.has(b.status)) continue;
      let offsetMin = 0;
      for (const seg of b.appointment_segments ?? []) {
        const duration = seg.duration_minutes ?? 0;
        out.push({
          id: `${b.id}:${offsetMin}`,
          startAt: new Date(
            new Date(b.start_at).getTime() + offsetMin * 60000
          ).toISOString(),
          durationMin: duration,
          teamMemberId: seg.team_member_id ?? "unknown",
          serviceVariationId: seg.service_variation_id ?? "unknown",
        });
        offsetMin += duration;
      }
    }
    cursor = res.cursor;
  } while (cursor);
  return out;
}

interface SquareAvailabilityResponse {
  availabilities?: Array<{
    start_at: string;
    appointment_segments?: Array<{
      duration_minutes?: number;
      team_member_id?: string;
      service_variation_id?: string;
      service_variation_version?: number;
    }>;
  }>;
}

export interface BridgeSlot {
  startAt: string;
  teamMemberId: string;
  serviceVariationVersion?: number;
  roomId: string | null;
}

/**
 * The website's availability call: Square's slots for a service (optionally a
 * specific team member), filtered so every returned slot also fits a room.
 */
export async function roomSafeAvailability(args: {
  locationId: string;
  serviceVariationId: string;
  teamMemberIds?: string[];
  startAt: string;
  endAt: string;
  rooms: Room[];
  services: Map<string, BridgeService>;
}): Promise<BridgeSlot[]> {
  const res = await square<SquareAvailabilityResponse>(
    "POST",
    "/v2/bookings/availability/search",
    {
      query: {
        filter: {
          start_at_range: { start_at: args.startAt, end_at: args.endAt },
          location_id: args.locationId,
          segment_filters: [
            {
              service_variation_id: args.serviceVariationId,
              ...(args.teamMemberIds?.length
                ? { team_member_id_filter: { any: args.teamMemberIds } }
                : {}),
            },
          ],
        },
      },
    }
  );

  const bookings = await fetchBridgeBookings(
    args.locationId,
    args.startAt,
    args.endAt
  );
  const occupancy = simulateRoomAssignments(args.rooms, args.services, bookings);

  const slots: BridgeSlot[] = [];
  for (const a of res.availabilities ?? []) {
    const seg = a.appointment_segments?.[0];
    const durationMin =
      seg?.duration_minutes ??
      args.services.get(args.serviceVariationId)?.durationMin ??
      0;
    const check = checkSlot(args.rooms, args.services, occupancy, {
      serviceVariationId: args.serviceVariationId,
      startAt: a.start_at,
      durationMin,
    });
    if (check.ok) {
      slots.push({
        startAt: a.start_at,
        teamMemberId: seg?.team_member_id ?? "",
        serviceVariationVersion: seg?.service_variation_version,
        roomId: check.roomId,
      });
    }
  }
  return slots;
}
