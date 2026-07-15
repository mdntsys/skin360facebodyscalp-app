import { describe, it, expect } from "vitest";
import type {
  Appointment,
  AppointmentStatus,
  AvailabilityRule,
  Room,
  Service,
  StaffMember,
} from "../../data/types";
import {
  availableSlots,
  findRoom,
  getConflicts,
  occupiedInterval,
  staffWorkingWindows,
  type Conflict,
  type SchedulingContext,
} from "./engine";

// ---------------------------------------------------------------------------
// Fixtures — anchored to Monday 2027-03-15 (weekday 1) so tests are
// deterministic and always in the future relative to "now".
// ---------------------------------------------------------------------------

const D = (h: number, m = 0) => new Date(2027, 2, 15, h, m); // local time
const iso = (h: number, m = 0) => D(h, m).toISOString();

const services: Service[] = [
  { id: "svc-facial", name: "Signature Facial", category: "Facials", price: 150, durationMin: 55, bufferMin: 15, description: "" },
  { id: "svc-mani", name: "Spa Manicure", category: "Nails", price: 60, durationMin: 45, bufferMin: 15, description: "" },
  { id: "svc-body", name: "Body Contour", category: "Body", price: 200, durationMin: 60, bufferMin: 0, description: "" },
  { id: "svc-scalp", name: "Head Spa", category: "Scalp", price: 120, durationMin: 60, bufferMin: 10, description: "" },
];
const serviceById = new Map(services.map((s) => [s.id, s]));

const rooms: Room[] = [
  { id: "room-headspa", locationId: "valencia", name: "Head Spa Room", capacity: 1, categories: ["Scalp"], sort: 0 },
  { id: "room-facial", locationId: "valencia", name: "Facial/Body Room", capacity: 2, categories: ["Facials", "Advanced Treatments", "Body"], sort: 1 },
  { id: "room-body", locationId: "valencia", name: "Body Room", capacity: 1, categories: ["Body"], sort: 2 },
  { id: "room-nails", locationId: "valencia", name: "Nails Room", capacity: 1, categories: ["Nails"], sort: 3 },
];

function rule(staffId: string, over: Partial<AvailabilityRule> = {}): AvailabilityRule {
  return {
    id: `rule-${staffId}-${over.weekday ?? 1}-${over.locationId ?? "valencia"}`,
    staffId,
    locationId: "valencia",
    weekday: 1,
    startTime: "10:00",
    endTime: "18:00",
    ...over,
  };
}

// staff-a/b/c all work Mondays 10:00-18:00 at Valencia.
const baseRules = [rule("staff-a"), rule("staff-b"), rule("staff-c")];

let apptSeq = 0;
function appt(
  serviceId: string,
  staffId: string,
  startISO: string,
  over: Partial<Appointment> = {}
): Appointment {
  const svc = serviceById.get(serviceId)!;
  return {
    id: `appt-${++apptSeq}`,
    clientId: "client-1",
    serviceId,
    staffId,
    locationId: "valencia",
    startISO,
    durationMin: svc.durationMin,
    price: svc.price,
    status: "confirmed" as AppointmentStatus,
    ...over,
  };
}

function makeCtx(over: Partial<SchedulingContext> = {}): SchedulingContext {
  return {
    appointments: [],
    timeBlocks: [],
    availabilityRules: baseRules,
    availabilityOverrides: [],
    rooms,
    serviceById,
    ...over,
  };
}

const kinds = (conflicts: Conflict[]) => conflicts.map((c) => c.kind);

// ---------------------------------------------------------------------------
// occupiedInterval
// ---------------------------------------------------------------------------

describe("occupiedInterval", () => {
  it("occupies [start, start + duration + buffer)", () => {
    const { start, end } = occupiedInterval(iso(10), 55, 15);
    expect(start.getTime()).toBe(D(10).getTime());
    expect(end.getTime()).toBe(D(11, 10).getTime());
  });

  it("handles zero buffer", () => {
    const { end } = occupiedInterval(iso(10), 60, 0);
    expect(end.getTime()).toBe(D(11).getTime());
  });
});

// ---------------------------------------------------------------------------
// Buffers
// ---------------------------------------------------------------------------

describe("buffer semantics", () => {
  it("staff occupied until duration + buffer: 10:55 conflicts, 11:10 does not", () => {
    const ctx = makeCtx({ appointments: [appt("svc-facial", "staff-a", iso(10))] });
    const draft = { locationId: "valencia" as const, serviceId: "svc-facial", staffId: "staff-a", durationMin: 55 };

    expect(kinds(getConflicts(ctx, { ...draft, startISO: iso(10, 55) }))).toContain("staff-busy");
    expect(getConflicts(ctx, { ...draft, startISO: iso(11, 10) })).toEqual([]);
  });

  it("room occupied until duration + buffer: 10:55 conflicts, 11:10 does not", () => {
    // Facial/Body Room (cap 2) fully occupied by two facials until 11:10.
    const ctx = makeCtx({
      appointments: [
        appt("svc-facial", "staff-a", iso(10), { roomId: "room-facial" }),
        appt("svc-facial", "staff-b", iso(10), { roomId: "room-facial" }),
      ],
    });
    const draft = { locationId: "valencia" as const, serviceId: "svc-facial", staffId: "staff-c", durationMin: 55 };

    expect(kinds(getConflicts(ctx, { ...draft, startISO: iso(10, 55) }))).toContain("room-full");
    expect(getConflicts(ctx, { ...draft, startISO: iso(11, 10) })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Room capacity
// ---------------------------------------------------------------------------

describe("room capacity", () => {
  it("Facial/Body Room (cap 2) allows two overlapping facials with different staff", () => {
    const ctx = makeCtx({
      appointments: [appt("svc-facial", "staff-a", iso(10), { roomId: "room-facial" })],
    });
    const conflicts = getConflicts(ctx, {
      locationId: "valencia", serviceId: "svc-facial", staffId: "staff-b", startISO: iso(10, 15), durationMin: 55,
    });
    expect(conflicts).toEqual([]);
  });

  it("third overlapping facial is room-full", () => {
    const ctx = makeCtx({
      appointments: [
        appt("svc-facial", "staff-a", iso(10), { roomId: "room-facial" }),
        appt("svc-facial", "staff-b", iso(10, 15), { roomId: "room-facial" }),
      ],
    });
    const conflicts = getConflicts(ctx, {
      locationId: "valencia", serviceId: "svc-facial", staffId: "staff-c", startISO: iso(10, 30), durationMin: 55,
    });
    expect(kinds(conflicts)).toContain("room-full");
  });

  it("Nails Room (cap 1): overlapping manicures for different clients is room-full", () => {
    const ctx = makeCtx({
      appointments: [appt("svc-mani", "staff-a", iso(10), { roomId: "room-nails", clientId: "client-1" })],
    });
    const conflicts = getConflicts(ctx, {
      locationId: "valencia", serviceId: "svc-mani", staffId: "staff-b", startISO: iso(10, 30), durationMin: 45,
    });
    expect(kinds(conflicts)).toContain("room-full");
  });

  it("Nails Room back-to-back respecting the buffer is fine", () => {
    // 45min mani + 15min buffer at 10:00 frees the room at 11:00.
    const ctx = makeCtx({
      appointments: [appt("svc-mani", "staff-a", iso(10), { roomId: "room-nails" })],
    });
    const conflicts = getConflicts(ctx, {
      locationId: "valencia", serviceId: "svc-mani", staffId: "staff-b", startISO: iso(11), durationMin: 45,
    });
    expect(conflicts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findRoom
// ---------------------------------------------------------------------------

describe("findRoom", () => {
  const bodyDraft = {
    locationId: "valencia" as const, serviceId: "svc-body", staffId: "staff-a", startISO: iso(10), durationMin: 60,
  };

  it("prefers the matching room with the lowest sort", () => {
    // Body fits both room-facial (sort 1) and room-body (sort 2).
    expect(findRoom(makeCtx(), bodyDraft)).toBe("room-facial");
  });

  it("falls to the next matching room when the first is full", () => {
    const ctx = makeCtx({
      appointments: [
        appt("svc-facial", "staff-b", iso(10), { roomId: "room-facial" }),
        appt("svc-facial", "staff-c", iso(10), { roomId: "room-facial" }),
      ],
    });
    expect(findRoom(ctx, bodyDraft)).toBe("room-body");
  });

  it("returns null when every matching room is full", () => {
    const ctx = makeCtx({
      appointments: [
        appt("svc-facial", "staff-b", iso(10), { roomId: "room-facial" }),
        appt("svc-facial", "staff-c", iso(10), { roomId: "room-facial" }),
        appt("svc-body", "staff-a", iso(10), { roomId: "room-body" }),
      ],
    });
    expect(findRoom(ctx, bodyDraft)).toBeNull();
  });

  it("returns null when no room supports the category; getConflicts says no-room", () => {
    const noNails = makeCtx({ rooms: rooms.filter((r) => r.id !== "room-nails") });
    const draft = {
      locationId: "valencia" as const, serviceId: "svc-mani", staffId: "staff-a", startISO: iso(10), durationMin: 45,
    };
    expect(findRoom(noNails, draft)).toBeNull();
    expect(kinds(getConflicts(noNails, draft))).toContain("no-room");
  });
});

// ---------------------------------------------------------------------------
// Toluca — call-only location with no rooms
// ---------------------------------------------------------------------------

describe("locations with no rooms (Toluca)", () => {
  const tolucaCtx = makeCtx({
    availabilityRules: [rule("staff-a", { locationId: "toluca" })],
  });
  const draft = {
    locationId: "toluca" as const, serviceId: "svc-facial", staffId: "staff-a", startISO: iso(10), durationMin: 55,
  };

  it("findRoom returns null", () => {
    expect(findRoom(tolucaCtx, draft)).toBeNull();
  });

  it("getConflicts never reports room conflicts", () => {
    expect(getConflicts(tolucaCtx, draft)).toEqual([]);
  });

  it("overlapping bookings still flag staff-busy but nothing room-related", () => {
    const ctx = makeCtx({
      availabilityRules: [rule("staff-a", { locationId: "toluca" })],
      appointments: [appt("svc-facial", "staff-a", iso(10), { locationId: "toluca" })],
    });
    expect(kinds(getConflicts(ctx, { ...draft, startISO: iso(10, 30) }))).toEqual(["staff-busy"]);
  });
});

// ---------------------------------------------------------------------------
// staffWorkingWindows
// ---------------------------------------------------------------------------

describe("staffWorkingWindows", () => {
  it("returns base weekly rule windows", () => {
    const windows = staffWorkingWindows(makeCtx(), "staff-a", D(12), "valencia");
    expect(windows).toHaveLength(1);
    expect(windows[0].start.getTime()).toBe(D(10).getTime());
    expect(windows[0].end.getTime()).toBe(D(18).getTime());
  });

  it("returns nothing on weekdays without rules", () => {
    const tuesday = new Date(2027, 2, 16, 12, 0);
    expect(staffWorkingWindows(makeCtx(), "staff-a", tuesday, "valencia")).toEqual([]);
  });

  it("filters by location", () => {
    expect(staffWorkingWindows(makeCtx(), "staff-a", D(12), "toluca")).toEqual([]);
  });

  it("override available=false with no times kills the whole day", () => {
    const ctx = makeCtx({
      availabilityOverrides: [
        { id: "ov-1", staffId: "staff-a", dateISO: "2027-03-15", available: false },
      ],
    });
    expect(staffWorkingWindows(ctx, "staff-a", D(12), "valencia")).toEqual([]);
  });

  it("override available=false with times splits the window in two", () => {
    const ctx = makeCtx({
      availabilityOverrides: [
        { id: "ov-1", staffId: "staff-a", dateISO: "2027-03-15", available: false, startTime: "12:00", endTime: "13:00" },
      ],
    });
    const windows = staffWorkingWindows(ctx, "staff-a", D(12), "valencia");
    expect(windows).toHaveLength(2);
    expect(windows[0].start.getTime()).toBe(D(10).getTime());
    expect(windows[0].end.getTime()).toBe(D(12).getTime());
    expect(windows[1].start.getTime()).toBe(D(13).getTime());
    expect(windows[1].end.getTime()).toBe(D(18).getTime());
  });

  it("override available=true with times adds an extra window", () => {
    const ctx = makeCtx({
      availabilityOverrides: [
        { id: "ov-1", staffId: "staff-a", dateISO: "2027-03-15", available: true, startTime: "19:00", endTime: "21:00" },
      ],
    });
    const windows = staffWorkingWindows(ctx, "staff-a", D(12), "valencia");
    expect(windows).toHaveLength(2);
    expect(windows[1].start.getTime()).toBe(D(19).getTime());
    expect(windows[1].end.getTime()).toBe(D(21).getTime());
  });

  it("overrides only apply to their own date", () => {
    const ctx = makeCtx({
      availabilityOverrides: [
        { id: "ov-1", staffId: "staff-a", dateISO: "2027-03-22", available: false },
      ],
    });
    expect(staffWorkingWindows(ctx, "staff-a", D(12), "valencia")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// staff-unavailable
// ---------------------------------------------------------------------------

describe("staff-unavailable", () => {
  const draft = { locationId: "valencia" as const, serviceId: "svc-facial", staffId: "staff-a", durationMin: 55 };

  it("flags bookings outside working windows", () => {
    expect(kinds(getConflicts(makeCtx(), { ...draft, startISO: iso(9) }))).toContain("staff-unavailable");
  });

  it("service ending exactly at window close is fine even though the buffer spills past", () => {
    // 17:05 + 55min = 18:00 close; buffer runs to 18:15 — allowed.
    expect(getConflicts(makeCtx(), { ...draft, startISO: iso(17, 5) })).toEqual([]);
  });

  it("service itself spilling past window close is flagged", () => {
    expect(kinds(getConflicts(makeCtx(), { ...draft, startISO: iso(17, 10) }))).toContain("staff-unavailable");
  });

  it("bookings inside an added override window are fine", () => {
    const ctx = makeCtx({
      availabilityOverrides: [
        { id: "ov-1", staffId: "staff-a", dateISO: "2027-03-15", available: true, startTime: "19:00", endTime: "21:00" },
      ],
    });
    expect(getConflicts(ctx, { ...draft, startISO: iso(19) })).toEqual([]);
  });

  it("bookings inside a subtracted window are flagged", () => {
    const ctx = makeCtx({
      availabilityOverrides: [
        { id: "ov-1", staffId: "staff-a", dateISO: "2027-03-15", available: false, startTime: "12:00", endTime: "13:00" },
      ],
    });
    expect(kinds(getConflicts(ctx, { ...draft, startISO: iso(12) }))).toContain("staff-unavailable");
  });
});

// ---------------------------------------------------------------------------
// Time blocks
// ---------------------------------------------------------------------------

describe("time blocks", () => {
  const facialDraft = { locationId: "valencia" as const, serviceId: "svc-facial", staffId: "staff-a", durationMin: 55 };

  it("staff block flags staff-busy for that staff only", () => {
    const ctx = makeCtx({
      timeBlocks: [
        { id: "tb-1", locationId: "valencia", staffId: "staff-a", startISO: iso(12), endISO: iso(14), reason: "Lunch" },
      ],
    });
    expect(kinds(getConflicts(ctx, { ...facialDraft, startISO: iso(12) }))).toContain("staff-busy");
    expect(getConflicts(ctx, { ...facialDraft, staffId: "staff-b", startISO: iso(12) })).toEqual([]);
  });

  it("room block flags room-full for that room only", () => {
    const ctx = makeCtx({
      timeBlocks: [
        { id: "tb-1", locationId: "valencia", roomId: "room-nails", startISO: iso(12), endISO: iso(14), reason: "Maintenance" },
      ],
    });
    const maniDraft = { locationId: "valencia" as const, serviceId: "svc-mani", staffId: "staff-a", startISO: iso(12), durationMin: 45 };
    expect(kinds(getConflicts(ctx, maniDraft))).toContain("room-full");
    // Facials use a different room — unaffected.
    expect(getConflicts(ctx, { ...facialDraft, startISO: iso(12) })).toEqual([]);
  });

  it("location-wide block flags time-blocked for everything at that location", () => {
    const ctx = makeCtx({
      availabilityRules: [...baseRules, rule("staff-a", { locationId: "toluca" })],
      timeBlocks: [
        { id: "tb-1", locationId: "valencia", startISO: iso(12), endISO: iso(14), reason: "Staff meeting" },
      ],
    });
    expect(kinds(getConflicts(ctx, { ...facialDraft, startISO: iso(12) }))).toContain("time-blocked");
    // Ends at 14:00 — a 14:00 start is clear.
    expect(getConflicts(ctx, { ...facialDraft, startISO: iso(14) })).toEqual([]);
    // Other locations unaffected.
    expect(getConflicts(ctx, { ...facialDraft, locationId: "toluca", startISO: iso(12) })).toEqual([]);
  });

  it("buffer spilling into a location block still conflicts", () => {
    // Facial at 11:00 occupies until 12:10 — overlaps a block starting at 12:00.
    const ctx = makeCtx({
      timeBlocks: [
        { id: "tb-1", locationId: "valencia", startISO: iso(12), endISO: iso(14), reason: "Staff meeting" },
      ],
    });
    expect(kinds(getConflicts(ctx, { ...facialDraft, startISO: iso(11) }))).toContain("time-blocked");
  });
});

// ---------------------------------------------------------------------------
// Cancelled / no-show / edits
// ---------------------------------------------------------------------------

describe("cancelled, no-show, and excludeAppointmentId", () => {
  const draft = {
    locationId: "valencia" as const, serviceId: "svc-mani", staffId: "staff-a", startISO: iso(10), durationMin: 45,
  };

  it("cancelled appointments occupy nothing", () => {
    const ctx = makeCtx({
      appointments: [appt("svc-mani", "staff-a", iso(10), { roomId: "room-nails", status: "cancelled" })],
    });
    expect(getConflicts(ctx, draft)).toEqual([]);
  });

  it("no-show appointments occupy nothing", () => {
    const ctx = makeCtx({
      appointments: [appt("svc-mani", "staff-a", iso(10), { roomId: "room-nails", status: "no-show" })],
    });
    expect(getConflicts(ctx, draft)).toEqual([]);
  });

  it("excludeAppointmentId lets an edited appointment ignore itself", () => {
    const existing = appt("svc-mani", "staff-a", iso(10), { roomId: "room-nails" });
    const ctx = makeCtx({ appointments: [existing] });

    // Without the exclusion the draft collides with itself.
    expect(kinds(getConflicts(ctx, { ...draft, startISO: iso(10, 15) }))).toEqual(
      expect.arrayContaining(["staff-busy", "room-full"])
    );
    // With it, the reschedule is clean — and findRoom sees the room as free.
    const edit = { ...draft, startISO: iso(10, 15), excludeAppointmentId: existing.id };
    expect(getConflicts(ctx, edit)).toEqual([]);
    expect(findRoom(ctx, edit)).toBe("room-nails");
  });
});

// ---------------------------------------------------------------------------
// availableSlots
// ---------------------------------------------------------------------------

describe("availableSlots", () => {
  const soloRules = [rule("staff-a")];

  it("steps through working windows and only offers slots the service fits in", () => {
    const ctx = makeCtx({ availabilityRules: soloRules });
    const slots = availableSlots(ctx, {
      serviceId: "svc-facial", locationId: "valencia", date: D(0), stepMin: 60,
    });
    // 10:00..17:00 hourly; 17:00 + 55min = 17:55 <= 18:00 close.
    expect(slots.map((s) => s.startISO)).toEqual(
      [10, 11, 12, 13, 14, 15, 16, 17].map((h) => iso(h))
    );
    expect(slots.every((s) => s.staffId === "staff-a")).toBe(true);
    expect(slots.every((s) => s.roomId === "room-facial")).toBe(true);
  });

  it("respects stepMin", () => {
    const ctx = makeCtx({ availabilityRules: soloRules });
    const slots = availableSlots(ctx, {
      serviceId: "svc-facial", locationId: "valencia", date: D(0), stepMin: 120,
    });
    expect(slots.map((s) => s.startISO)).toEqual([iso(10), iso(12), iso(14), iso(16)]);
  });

  it("skips slots that conflict with existing occupancy (incl. buffer)", () => {
    const ctx = makeCtx({
      availabilityRules: soloRules,
      appointments: [appt("svc-facial", "staff-a", iso(10), { roomId: "room-facial" })],
    });
    const slots = availableSlots(ctx, {
      serviceId: "svc-facial", locationId: "valencia", date: D(0), stepMin: 60,
    });
    // Staff occupied until 11:10 → 10:00 and 11:00 gone.
    expect(slots.map((s) => s.startISO)).toEqual(
      [12, 13, 14, 15, 16, 17].map((h) => iso(h))
    );
  });

  it("filters staff by capability (serviceIds empty = all) and bookable", () => {
    const staff: StaffMember[] = [
      { id: "staff-a", name: "A", role: "", initials: "A", color: "", locations: ["valencia"], email: "", phone: "", bookable: true, employmentType: "employee", serviceIds: [] },
      { id: "staff-b", name: "B", role: "", initials: "B", color: "", locations: ["valencia"], email: "", phone: "", bookable: true, employmentType: "employee", serviceIds: ["svc-facial"] },
      { id: "staff-c", name: "C", role: "", initials: "C", color: "", locations: ["valencia"], email: "", phone: "", bookable: true, employmentType: "employee", serviceIds: ["svc-mani"] },
      { id: "staff-d", name: "D", role: "", initials: "D", color: "", locations: ["valencia"], email: "", phone: "", bookable: false, employmentType: "admin", serviceIds: [] },
    ];
    const ctx = makeCtx({
      staff,
      availabilityRules: [rule("staff-a"), rule("staff-b"), rule("staff-c"), rule("staff-d")],
    });
    const slots = availableSlots(ctx, {
      serviceId: "svc-facial", locationId: "valencia", date: D(0), stepMin: 240,
    });
    const staffIds = new Set(slots.map((s) => s.staffId));
    expect(staffIds).toEqual(new Set(["staff-a", "staff-b"]));
  });

  it("restricts to the requested staffId", () => {
    const slots = availableSlots(makeCtx(), {
      serviceId: "svc-facial", locationId: "valencia", date: D(0), staffId: "staff-b", stepMin: 120,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.staffId === "staff-b")).toBe(true);
  });

  it("excludes past times", () => {
    // Monday 2020-01-06 — every slot is in the past.
    const slots = availableSlots(makeCtx(), {
      serviceId: "svc-facial", locationId: "valencia", date: new Date(2020, 0, 6), stepMin: 60,
    });
    expect(slots).toEqual([]);
  });

  it("returns slots sorted ascending, with multiple staff sharing times", () => {
    const ctx = makeCtx({ availabilityRules: [rule("staff-a"), rule("staff-b")] });
    const slots = availableSlots(ctx, {
      serviceId: "svc-facial", locationId: "valencia", date: D(0), stepMin: 240,
    });
    expect(slots.map((s) => [s.startISO, s.staffId])).toEqual([
      [iso(10), "staff-a"],
      [iso(10), "staff-b"],
      [iso(14), "staff-a"],
      [iso(14), "staff-b"],
    ]);
  });

  it("accounts for room capacity per slot", () => {
    // Nails Room busy until 11:00 → staff-b's first mani slot is 11:00.
    const ctx = makeCtx({
      appointments: [appt("svc-mani", "staff-a", iso(10), { roomId: "room-nails" })],
    });
    const slots = availableSlots(ctx, {
      serviceId: "svc-mani", locationId: "valencia", date: D(0), staffId: "staff-b", stepMin: 30,
    });
    expect(slots[0].startISO).toBe(iso(11));
    expect(slots[0].roomId).toBe("room-nails");
  });

  it("returns roomId null at locations without rooms", () => {
    const ctx = makeCtx({ availabilityRules: [rule("staff-a", { locationId: "toluca" })] });
    const slots = availableSlots(ctx, {
      serviceId: "svc-facial", locationId: "toluca", date: D(0), stepMin: 240,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.roomId === null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ADVERSARIAL PROBES (review agent) — edge cases beyond the base suite
// ---------------------------------------------------------------------------

describe("probe: buffer edges, reverse direction", () => {
  it("draft placed BEFORE an existing appointment: own buffer touching the next start is fine, one minute over conflicts", () => {
    // Existing facial at 11:10. Draft 10:00 occupies [10:00, 11:10) — touch, no conflict.
    const ctx = makeCtx({ appointments: [appt("svc-facial", "staff-a", iso(11, 10), { roomId: "room-facial" })] });
    const draft = { locationId: "valencia" as const, serviceId: "svc-facial", staffId: "staff-a", durationMin: 55 };
    expect(getConflicts(ctx, { ...draft, startISO: iso(10) })).toEqual([]);
    expect(kinds(getConflicts(ctx, { ...draft, startISO: iso(10, 1) }))).toContain("staff-busy");
  });

  it("room block half-open edges: occupancy ending exactly at block start is fine", () => {
    // Mani 11:00 occupies room-nails [11:00, 12:00); block [12:00, 14:00) — touch only.
    const ctx = makeCtx({
      timeBlocks: [{ id: "tb-x", locationId: "valencia", roomId: "room-nails", startISO: iso(12), endISO: iso(14), reason: "x" }],
    });
    expect(getConflicts(ctx, {
      locationId: "valencia", serviceId: "svc-mani", staffId: "staff-a", startISO: iso(11), durationMin: 45,
    })).toEqual([]);
    // But buffer spilling one minute into the block conflicts.
    expect(kinds(getConflicts(ctx, {
      locationId: "valencia", serviceId: "svc-mani", staffId: "staff-a", startISO: iso(11, 1), durationMin: 45,
    }))).toContain("room-full");
  });
});

describe("probe: excludeAppointmentId at exact capacity", () => {
  it("editing one of two occupants of a cap-2 room keeps the room bookable for the edit", () => {
    const a = appt("svc-facial", "staff-a", iso(10), { roomId: "room-facial" });
    const b = appt("svc-facial", "staff-b", iso(10), { roomId: "room-facial" });
    const ctx = makeCtx({ appointments: [a, b] });
    const edit = {
      locationId: "valencia" as const, serviceId: "svc-facial", staffId: "staff-a",
      startISO: iso(10, 30), durationMin: 55, excludeAppointmentId: a.id,
    };
    expect(getConflicts(ctx, edit)).toEqual([]);
    expect(findRoom(ctx, edit)).toBe("room-facial");
    // A third party (no exclusion) still sees it full.
    expect(kinds(getConflicts(ctx, {
      locationId: "valencia", serviceId: "svc-facial", staffId: "staff-c", startISO: iso(10, 30), durationMin: 55,
    }))).toContain("room-full");
  });

  it("explicit-room branch honors excludeAppointmentId too", () => {
    const a = appt("svc-mani", "staff-a", iso(10), { roomId: "room-nails" });
    const ctx = makeCtx({ appointments: [a] });
    const edit = {
      locationId: "valencia" as const, serviceId: "svc-mani", staffId: "staff-a",
      startISO: iso(10, 15), durationMin: 45, roomId: "room-nails", excludeAppointmentId: a.id,
    };
    expect(getConflicts(ctx, edit)).toEqual([]);
  });
});

describe("probe: override compositions", () => {
  it("added window + subtraction spanning base and added windows", () => {
    // Base 10-18, add 19-21, subtract 17-20 → [10,17) and [20,21).
    const ctx = makeCtx({
      availabilityOverrides: [
        { id: "ov-add", staffId: "staff-a", dateISO: "2027-03-15", available: true, startTime: "19:00", endTime: "21:00" },
        { id: "ov-cut", staffId: "staff-a", dateISO: "2027-03-15", available: false, startTime: "17:00", endTime: "20:00" },
      ],
    });
    const windows = staffWorkingWindows(ctx, "staff-a", D(12), "valencia");
    expect(windows.map((w) => [w.start.getTime(), w.end.getTime()])).toEqual([
      [D(10).getTime(), D(17).getTime()],
      [D(20).getTime(), D(21).getTime()],
    ]);
  });

  it("subtraction exactly matching a window boundary leaves clean edges", () => {
    const ctx = makeCtx({
      availabilityOverrides: [
        { id: "ov-cut", staffId: "staff-a", dateISO: "2027-03-15", available: false, startTime: "10:00", endTime: "12:00" },
      ],
    });
    const windows = staffWorkingWindows(ctx, "staff-a", D(12), "valencia");
    expect(windows).toHaveLength(1);
    expect(windows[0].start.getTime()).toBe(D(12).getTime());
    expect(windows[0].end.getTime()).toBe(D(18).getTime());
  });

  it("whole-day-off override wins even when an available=true window exists the same day", () => {
    const ctx = makeCtx({
      availabilityOverrides: [
        { id: "ov-off", staffId: "staff-a", dateISO: "2027-03-15", available: false },
        { id: "ov-add", staffId: "staff-a", dateISO: "2027-03-15", available: true, startTime: "19:00", endTime: "21:00" },
      ],
    });
    expect(staffWorkingWindows(ctx, "staff-a", D(12), "valencia")).toEqual([]);
  });
});

describe("probe: multiple rules on the same weekday", () => {
  it("overlapping rules merge — no duplicate slots", () => {
    const ctx = makeCtx({
      availabilityRules: [
        rule("staff-a", { startTime: "10:00", endTime: "14:00" }),
        { ...rule("staff-a"), id: "rule-a-2", startTime: "12:00", endTime: "18:00" },
      ],
    });
    const slots = availableSlots(ctx, {
      serviceId: "svc-facial", locationId: "valencia", date: D(0), stepMin: 60,
    });
    const starts = slots.map((s) => s.startISO);
    expect(new Set(starts).size).toBe(starts.length); // no duplicates
    expect(starts).toEqual([10, 11, 12, 13, 14, 15, 16, 17].map((h) => iso(h)));
  });

  it("split shift: no slot may span the gap between two windows", () => {
    const ctx = makeCtx({
      availabilityRules: [
        rule("staff-a", { startTime: "10:00", endTime: "12:00" }),
        { ...rule("staff-a"), id: "rule-a-2", startTime: "13:00", endTime: "18:00" },
      ],
    });
    const slots = availableSlots(ctx, {
      serviceId: "svc-facial", locationId: "valencia", date: D(0), stepMin: 60,
    });
    // 11:00 fits window 1 (ends 11:55); 12:00 does not exist; window 2 gives 13..17.
    expect(slots.map((s) => s.startISO)).toEqual([10, 11, 13, 14, 15, 16, 17].map((h) => iso(h)));
  });
});

describe("probe: last slot of the day with buffer spill", () => {
  it("availableSlots offers the last start whose SERVICE fits even though the buffer spills past close", () => {
    const ctx = makeCtx({ availabilityRules: [rule("staff-a")] });
    const slots = availableSlots(ctx, {
      serviceId: "svc-facial", locationId: "valencia", date: D(0), stepMin: 5,
    });
    // 17:05 + 55 = 18:00 exactly; buffer to 18:15 spills — must still be offered.
    expect(slots[slots.length - 1].startISO).toBe(iso(17, 5));
  });
});

describe("probe: cross-location staff occupancy", () => {
  it("an active appointment at another location still makes the staff busy", () => {
    const ctx = makeCtx({
      availabilityRules: [...baseRules, rule("staff-a", { locationId: "toluca" })],
      appointments: [appt("svc-facial", "staff-a", iso(10), { locationId: "toluca" })],
    });
    expect(kinds(getConflicts(ctx, {
      locationId: "valencia", serviceId: "svc-facial", staffId: "staff-a", startISO: iso(10, 30), durationMin: 55,
    }))).toContain("staff-busy");
  });
});

describe("probe: cancelled appointments in availableSlots and findRoom", () => {
  it("cancelled occupants free their room for slot generation", () => {
    const ctx = makeCtx({
      availabilityRules: [rule("staff-b")],
      appointments: [
        appt("svc-mani", "staff-a", iso(10), { roomId: "room-nails", status: "cancelled" }),
        appt("svc-mani", "staff-a", iso(11), { roomId: "room-nails", status: "no-show" }),
      ],
    });
    const slots = availableSlots(ctx, {
      serviceId: "svc-mani", locationId: "valencia", date: D(0), staffId: "staff-b", stepMin: 60,
    });
    expect(slots[0].startISO).toBe(iso(10));
    expect(slots[0].roomId).toBe("room-nails");
  });
});

describe("probe: availableSlots today never leaks past times", () => {
  it("only offers starts at or after now for today's date", () => {
    const today = new Date();
    const before = new Date(today.getTime() - 1);
    const todayRule = rule("staff-a", { weekday: today.getDay(), startTime: "00:00", endTime: "23:45" });
    const ctx = makeCtx({ availabilityRules: [todayRule] });
    const slots = availableSlots(ctx, {
      serviceId: "svc-body", locationId: "valencia", date: today, stepMin: 15,
    });
    expect(slots.every((s) => new Date(s.startISO).getTime() >= before.getTime())).toBe(true);
    // Unless we're within ~90 min of midnight there must be at least one future slot.
    if (today.getHours() < 22) expect(slots.length).toBeGreaterThan(0);
  });
});

describe("probe: explicit roomId edge cases", () => {
  it("explicit roomId whose categories do NOT include the service category → no-room conflict", () => {
    // Booking a FACIAL explicitly into the Nails Room (categories: ["Nails"]).
    const conflicts = getConflicts(makeCtx(), {
      locationId: "valencia", serviceId: "svc-facial", staffId: "staff-a",
      startISO: iso(10), durationMin: 55, roomId: "room-nails",
    });
    expect(conflicts.map((c) => c.kind)).toContain("no-room");
  });

  it("explicit roomId that does not exist at the location → no-room conflict", () => {
    const conflicts = getConflicts(makeCtx(), {
      locationId: "valencia", serviceId: "svc-facial", staffId: "staff-a",
      startISO: iso(10), durationMin: 55, roomId: "room-ghost",
    });
    expect(conflicts.map((c) => c.kind)).toContain("no-room");
  });
});
