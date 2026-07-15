// Pure scheduling engine — no React, no Supabase, no I/O.
// All "HH:MM" strings are interpreted in LOCAL time against the given date.

import { addMinutes, format, parseISO, startOfDay } from "date-fns";
import type {
  Appointment,
  AvailabilityOverride,
  AvailabilityRule,
  LocationId,
  Room,
  Service,
  StaffMember,
  TimeBlock,
} from "../../data/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SchedulingContext {
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  availabilityRules: AvailabilityRule[];
  availabilityOverrides: AvailabilityOverride[];
  rooms: Room[];
  serviceById: Map<string, Service>;
  /**
   * Optional: when provided, availableSlots filters candidates by
   * bookability and capability (serviceIds empty = performs all).
   */
  staff?: StaffMember[];
}

export interface DraftAppointment {
  locationId: LocationId;
  serviceId: string;
  staffId: string;
  startISO: string;
  durationMin: number;
  roomId?: string;
  /** When editing an existing appointment, exclude it from occupancy checks. */
  excludeAppointmentId?: string;
}

export type ConflictKind =
  | "staff-busy"
  | "staff-unavailable"
  | "room-full"
  | "no-room"
  | "time-blocked";

export interface Conflict {
  kind: ConflictKind;
  message: string;
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface AvailableSlot {
  startISO: string;
  staffId: string;
  roomId: string | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES = new Set(["confirmed", "checked-in", "completed"]);

function isActive(appointment: Appointment): boolean {
  return ACTIVE_STATUSES.has(appointment.status);
}

/** Half-open interval overlap: [aStart, aEnd) vs [bStart, bEnd). */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Parse "HH:MM" against a date in LOCAL time. */
function timeOnDate(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((part) => parseInt(part, 10));
  const result = startOfDay(date);
  result.setHours(h, m, 0, 0);
  return result;
}

function appointmentInterval(
  appointment: Appointment,
  serviceById: Map<string, Service>
): TimeWindow {
  const bufferMin = serviceById.get(appointment.serviceId)?.bufferMin ?? 0;
  return occupiedInterval(appointment.startISO, appointment.durationMin, bufferMin);
}

/** Active appointments (not cancelled / no-show), minus an excluded id. */
function activeAppointments(
  ctx: SchedulingContext,
  excludeAppointmentId?: string
): Appointment[] {
  return ctx.appointments.filter(
    (a) => isActive(a) && a.id !== excludeAppointmentId
  );
}

function sortWindows(windows: TimeWindow[]): TimeWindow[] {
  return [...windows].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Merge overlapping/touching windows into a minimal sorted set. */
function mergeWindows(windows: TimeWindow[]): TimeWindow[] {
  const sorted = sortWindows(windows).filter((w) => w.start < w.end);
  const merged: TimeWindow[] = [];
  for (const w of sorted) {
    const last = merged[merged.length - 1];
    if (last && w.start <= last.end) {
      if (w.end > last.end) last.end = w.end;
    } else {
      merged.push({ start: w.start, end: w.end });
    }
  }
  return merged;
}

/** Subtract [cutStart, cutEnd) from each window, possibly splitting windows. */
function subtractWindow(
  windows: TimeWindow[],
  cutStart: Date,
  cutEnd: Date
): TimeWindow[] {
  const result: TimeWindow[] = [];
  for (const w of windows) {
    if (!overlaps(w.start, w.end, cutStart, cutEnd)) {
      result.push(w);
      continue;
    }
    if (w.start < cutStart) result.push({ start: w.start, end: cutStart });
    if (cutEnd < w.end) result.push({ start: cutEnd, end: w.end });
  }
  return result;
}

/** Rooms at a location that can host the given service, lowest sort first. */
function candidateRooms(
  ctx: SchedulingContext,
  locationId: LocationId,
  service: Service | undefined
): Room[] {
  if (!service) return [];
  return ctx.rooms
    .filter(
      (room) =>
        room.locationId === locationId &&
        room.categories.includes(service.category)
    )
    .sort((a, b) => a.sort - b.sort);
}

/** Count active appointments occupying a room during [start, end). */
function roomOccupancy(
  ctx: SchedulingContext,
  roomId: string,
  start: Date,
  end: Date,
  excludeAppointmentId?: string
): number {
  return activeAppointments(ctx, excludeAppointmentId).filter((a) => {
    if (a.roomId !== roomId) return false;
    const occupied = appointmentInterval(a, ctx.serviceById);
    return overlaps(occupied.start, occupied.end, start, end);
  }).length;
}

/** Room-specific time blocks overlapping [start, end). */
function roomBlocked(
  ctx: SchedulingContext,
  roomId: string,
  start: Date,
  end: Date
): boolean {
  return ctx.timeBlocks.some(
    (block) =>
      block.roomId === roomId &&
      overlaps(parseISO(block.startISO), parseISO(block.endISO), start, end)
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The interval a booking occupies for both the staff member and the room:
 * [start, start + durationMin + bufferMin).
 */
export function occupiedInterval(
  startISO: string,
  durationMin: number,
  bufferMin: number
): TimeWindow {
  const start = parseISO(startISO);
  return { start, end: addMinutes(start, durationMin + bufferMin) };
}

/**
 * Working windows for a staff member on a given calendar date (local time).
 * Base weekly rules, then overrides:
 * - available=false, no times → whole day off
 * - available=false, with times → subtract that window
 * - available=true, with times → additional working window
 */
export function staffWorkingWindows(
  ctx: SchedulingContext,
  staffId: string,
  date: Date,
  locationId?: LocationId
): TimeWindow[] {
  const weekday = date.getDay();
  const dateISO = format(date, "yyyy-MM-dd");

  let windows: TimeWindow[] = ctx.availabilityRules
    .filter(
      (rule) =>
        rule.staffId === staffId &&
        rule.weekday === weekday &&
        (locationId === undefined || rule.locationId === locationId)
    )
    .map((rule) => ({
      start: timeOnDate(date, rule.startTime),
      end: timeOnDate(date, rule.endTime),
    }));

  const overrides = ctx.availabilityOverrides.filter(
    (o) => o.staffId === staffId && o.dateISO === dateISO
  );

  // Whole day off wins over everything else on that date.
  if (overrides.some((o) => !o.available && (!o.startTime || !o.endTime))) {
    return [];
  }

  // Additional working windows.
  for (const o of overrides) {
    if (o.available && o.startTime && o.endTime) {
      windows.push({
        start: timeOnDate(date, o.startTime),
        end: timeOnDate(date, o.endTime),
      });
    }
  }

  windows = mergeWindows(windows);

  // Subtracted windows (may split a window in two).
  for (const o of overrides) {
    if (!o.available && o.startTime && o.endTime) {
      windows = subtractWindow(
        windows,
        timeOnDate(date, o.startTime),
        timeOnDate(date, o.endTime)
      );
    }
  }

  return sortWindows(windows);
}

/**
 * Pick a room for the draft: categories must include the service's category,
 * spare capacity during the occupied interval, not blocked; lowest sort wins.
 * Returns null when the location has no rooms, none match, or all are full.
 */
export function findRoom(
  ctx: SchedulingContext,
  draft: DraftAppointment
): string | null {
  const service = ctx.serviceById.get(draft.serviceId);
  const rooms = candidateRooms(ctx, draft.locationId, service);
  if (rooms.length === 0) return null;

  const bufferMin = service?.bufferMin ?? 0;
  const occupied = occupiedInterval(draft.startISO, draft.durationMin, bufferMin);

  for (const room of rooms) {
    if (roomBlocked(ctx, room.id, occupied.start, occupied.end)) continue;
    const count = roomOccupancy(
      ctx,
      room.id,
      occupied.start,
      occupied.end,
      draft.excludeAppointmentId
    );
    if (count < room.capacity) return room.id;
  }
  return null;
}

/**
 * All conflicts for a draft appointment. Empty array = bookable.
 */
export function getConflicts(
  ctx: SchedulingContext,
  draft: DraftAppointment
): Conflict[] {
  const conflicts: Conflict[] = [];
  const service = ctx.serviceById.get(draft.serviceId);
  const bufferMin = service?.bufferMin ?? 0;
  const occupied = occupiedInterval(draft.startISO, draft.durationMin, bufferMin);
  const serviceStart = parseISO(draft.startISO);
  const serviceEnd = addMinutes(serviceStart, draft.durationMin);

  // --- Staff busy: overlapping active appointments for the same staff.
  const staffDoubleBooked = activeAppointments(ctx, draft.excludeAppointmentId).some(
    (a) => {
      if (a.staffId !== draft.staffId) return false;
      const other = appointmentInterval(a, ctx.serviceById);
      return overlaps(other.start, other.end, occupied.start, occupied.end);
    }
  );
  // Staff-specific time blocks also read as the staff member being busy.
  const staffTimeBlocked = ctx.timeBlocks.some(
    (block) =>
      block.staffId === draft.staffId &&
      overlaps(
        parseISO(block.startISO),
        parseISO(block.endISO),
        occupied.start,
        occupied.end
      )
  );
  if (staffDoubleBooked || staffTimeBlocked) {
    conflicts.push({
      kind: "staff-busy",
      message: "This staff member is already booked or blocked during this time.",
    });
  }

  // --- Staff availability: the service itself must fit inside a working
  // window; the wind-down buffer may spill past the window end.
  const windows = staffWorkingWindows(
    ctx,
    draft.staffId,
    serviceStart,
    draft.locationId
  );
  const insideWindow = windows.some(
    (w) => w.start <= serviceStart && serviceEnd <= w.end
  );
  if (!insideWindow) {
    conflicts.push({
      kind: "staff-unavailable",
      message: "This staff member is not scheduled to work at this time.",
    });
  }

  // --- Rooms: locations with no rooms (call-only) skip all room constraints.
  const locationRooms = ctx.rooms.filter((r) => r.locationId === draft.locationId);
  if (locationRooms.length > 0) {
    const explicitRoom = draft.roomId
      ? locationRooms.find((r) => r.id === draft.roomId)
      : undefined;

    if (draft.roomId && !explicitRoom) {
      conflicts.push({
        kind: "no-room",
        message: "The selected room does not exist at this location.",
      });
    } else if (explicitRoom) {
      if (service && !explicitRoom.categories.includes(service.category)) {
        conflicts.push({
          kind: "no-room",
          message: `${explicitRoom.name} is not set up for ${service.category}.`,
        });
      }
      const blocked = roomBlocked(ctx, explicitRoom.id, occupied.start, occupied.end);
      const count = roomOccupancy(
        ctx,
        explicitRoom.id,
        occupied.start,
        occupied.end,
        draft.excludeAppointmentId
      );
      if (blocked || count >= explicitRoom.capacity) {
        conflicts.push({
          kind: "room-full",
          message: `${explicitRoom.name} is full or blocked at this time.`,
        });
      }
    } else {
      const candidates = candidateRooms(ctx, draft.locationId, service);
      if (candidates.length === 0) {
        conflicts.push({
          kind: "no-room",
          message: "No room at this location supports this service.",
        });
      } else if (findRoom(ctx, draft) === null) {
        conflicts.push({
          kind: "room-full",
          message: "Every suitable room is full or blocked at this time.",
        });
      }
    }
  }

  // --- Location-wide time blocks (no staffId, no roomId).
  const locationBlocked = ctx.timeBlocks.some(
    (block) =>
      block.locationId === draft.locationId &&
      !block.staffId &&
      !block.roomId &&
      overlaps(
        parseISO(block.startISO),
        parseISO(block.endISO),
        occupied.start,
        occupied.end
      )
  );
  if (locationBlocked) {
    conflicts.push({
      kind: "time-blocked",
      message: "This location is blocked off during this time.",
    });
  }

  return conflicts;
}

/**
 * Conflict-free start times for a service on a date, stepped by stepMin
 * within each staff member's working windows. Excludes past times, sorted
 * ascending (multiple staff may share a time — consumers dedupe).
 */
export function availableSlots(
  ctx: SchedulingContext,
  params: {
    serviceId: string;
    locationId: LocationId;
    date: Date;
    staffId?: string;
    stepMin?: number;
  }
): AvailableSlot[] {
  const { serviceId, locationId, date, staffId, stepMin = 15 } = params;
  const service = ctx.serviceById.get(serviceId);
  if (!service || stepMin <= 0) return [];

  const staffById = new Map((ctx.staff ?? []).map((s) => [s.id, s]));
  const canPerform = (id: string): boolean => {
    const member = staffById.get(id);
    if (!member) return ctx.staff === undefined; // unknown staff only ok when no roster given
    if (!member.bookable) return false;
    return member.serviceIds.length === 0 || member.serviceIds.includes(serviceId);
  };

  let candidateIds: string[];
  if (staffId) {
    candidateIds = [staffId];
  } else if (ctx.staff) {
    candidateIds = ctx.staff.map((s) => s.id);
  } else {
    candidateIds = [
      ...new Set(
        ctx.availabilityRules
          .filter((rule) => rule.locationId === locationId)
          .map((rule) => rule.staffId)
      ),
    ];
  }
  candidateIds = candidateIds.filter(canPerform);

  const now = new Date();
  const slots: AvailableSlot[] = [];

  for (const candidateId of candidateIds) {
    const windows = staffWorkingWindows(ctx, candidateId, date, locationId);
    for (const window of windows) {
      for (
        let start = window.start;
        addMinutes(start, service.durationMin) <= window.end;
        start = addMinutes(start, stepMin)
      ) {
        if (start < now) continue; // never offer past times
        const draft: DraftAppointment = {
          locationId,
          serviceId,
          staffId: candidateId,
          startISO: start.toISOString(),
          durationMin: service.durationMin,
        };
        if (getConflicts(ctx, draft).length > 0) continue;
        slots.push({
          startISO: draft.startISO,
          staffId: candidateId,
          roomId: findRoom(ctx, draft),
        });
      }
    }
  }

  return slots.sort(
    (a, b) =>
      a.startISO.localeCompare(b.startISO) || a.staffId.localeCompare(b.staffId)
  );
}
