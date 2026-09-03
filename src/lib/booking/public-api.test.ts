// Tests for the engine-backed public booking layer. Fixtures mirror the real
// Valencia setup: 4 rooms, category-scoped girls, real-shaped schedules.
// Dates are 2027 (future) with explicit -07:00 offsets; the module pins
// process TZ to America/Los_Angeles.
import { describe, expect, it } from "vitest";

import type { Appointment } from "../../data/types";
import {
  computeSlots,
  performersForService,
  type PublicBookingData,
} from "./public-api";

// 2027-08-04 = Wednesday, 2027-08-09 = Monday, 2027-08-10 = Tuesday.

function mkData(): PublicBookingData {
  const services = [
    { id: "svc-facial", name: "Classic Facial", category: "Facials" as const, price: 145, durationMin: 55, bufferMin: 15, description: "" },
    { id: "svc-body", name: "Lymphatic Drainage", category: "Body" as const, price: 195, durationMin: 55, bufferMin: 15, description: "" },
    { id: "svc-mani", name: "Gel Manicure", category: "Nails" as const, price: 40, durationMin: 45, bufferMin: 15, description: "" },
    { id: "svc-fills", name: "Nail Fills", category: "Nails" as const, price: 60, durationMin: 60, bufferMin: 15, description: "" },
    { id: "svc-gold", name: "24K Gold Therapy", category: "Face Add-Ons" as const, price: 100, durationMin: 25, bufferMin: 0, description: "", addonFor: ["Facials", "Advanced Treatments"] },
    { id: "svc-french", name: "French Tip w/Service", category: "Nails" as const, price: 10, durationMin: 30, bufferMin: 0, description: "", addonFor: ["Nails"] },
  ];
  return {
    settings: { onlineBookingEnabled: true, minNoticeHours: 0 },
    rooms: [
      { id: "room-headspa", locationId: "valencia", name: "Head Spa Room", capacity: 1, categories: ["Scalp"], sort: 1 },
      { id: "room-body", locationId: "valencia", name: "Body Room", capacity: 1, categories: ["Body", "Lash + Brow + Wax"], sort: 2 },
      { id: "room-facial", locationId: "valencia", name: "Facial/Body Room", capacity: 2, categories: ["Facials", "Advanced Treatments", "Body", "Face Add-Ons", "Lash + Brow + Wax"], sort: 3 },
      { id: "room-nails", locationId: "valencia", name: "Nails Room", capacity: 1, categories: ["Nails"], sort: 4 },
    ],
    services,
    serviceById: new Map(services.map((s) => [s.id, s])),
    staff: [
      { id: "staff-karen", name: "Karen Paredes", bookable: true, serviceIds: ["svc-body"] },
      { id: "staff-josseline", name: "Josseline Mejia", bookable: true, serviceIds: ["svc-facial", "svc-gold"] },
      { id: "staff-gloria", name: "Gloria Sanchez", bookable: true, serviceIds: ["svc-facial"] },
      // Cassie does the nail add-ons; Vero only the mani itself.
      { id: "staff-cassie", name: "Cassie Hughes", bookable: true, serviceIds: ["svc-mani", "svc-french", "svc-fills"] },
      { id: "staff-vero", name: "Vero Alvarez", bookable: true, serviceIds: ["svc-mani", "svc-fills"] },
      { id: "staff-carolina", name: "Carolina", bookable: true, serviceIds: [] },
    ],
    availabilityRules: [
      // Karen: Wed + Thu. Josseline: Mon. Gloria: Mon. Cassie/Vero: Mon.
      { id: "r1", staffId: "staff-karen", locationId: "valencia", weekday: 3, startTime: "10:00", endTime: "18:00" },
      { id: "r2", staffId: "staff-karen", locationId: "valencia", weekday: 4, startTime: "10:00", endTime: "18:00" },
      { id: "r3", staffId: "staff-josseline", locationId: "valencia", weekday: 1, startTime: "10:00", endTime: "18:00" },
      { id: "r4", staffId: "staff-gloria", locationId: "valencia", weekday: 1, startTime: "10:00", endTime: "18:00" },
      { id: "r5", staffId: "staff-cassie", locationId: "valencia", weekday: 1, startTime: "10:00", endTime: "18:00" },
      { id: "r6", staffId: "staff-vero", locationId: "valencia", weekday: 1, startTime: "10:00", endTime: "18:00" },
    ],
    availabilityOverrides: [],
    timeBlocks: [],
  };
}

function appt(partial: Partial<Appointment> & Pick<Appointment, "id" | "serviceId" | "staffId" | "startISO" | "durationMin">): Appointment {
  return {
    clientId: "",
    locationId: "valencia",
    price: 0,
    status: "confirmed",
    ...partial,
  };
}

const WED = { startAt: "2027-08-04T00:00:00-07:00", endAt: "2027-08-05T00:00:00-07:00" };
const MON = { startAt: "2027-08-09T00:00:00-07:00", endAt: "2027-08-10T00:00:00-07:00" };

/** Epoch ms of an ISO string — engine slots come back as UTC ISO strings. */
const ms = (iso: string) => new Date(iso).getTime();

describe("performersForService", () => {
  it("scopes girls to their specialties; empty list means performs all", () => {
    const data = mkData();
    const facialists = performersForService(data, "svc-facial").map((s) => s.id);
    expect(facialists).toContain("staff-josseline");
    expect(facialists).toContain("staff-carolina"); // empty = all
    expect(facialists).not.toContain("staff-karen");
  });
});

describe("computeSlots", () => {
  it("offers Karen for a body service on her Wednesday", () => {
    const slots = computeSlots(mkData(), [], {
      serviceVariationId: "svc-body",
      teamMemberId: "staff-karen",
      ...WED,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(ms(slots[0].startAt)).toBe(ms("2027-08-04T10:00:00-07:00"));
  });

  it("never offers Karen a facial, even on a day she works", () => {
    const slots = computeSlots(mkData(), [], {
      serviceVariationId: "svc-facial",
      teamMemberId: "staff-karen",
      ...WED,
    });
    expect(slots).toEqual([]);
  });

  it("dedupes to one slot per start time across multiple facialists", () => {
    const slots = computeSlots(mkData(), [], {
      serviceVariationId: "svc-facial",
      ...MON,
    });
    const starts = slots.map((s) => s.startAt);
    expect(new Set(starts).size).toBe(starts.length);
    expect(slots.length).toBeGreaterThan(0);
  });

  it("stops offering facial times when the Facial/Body room (cap 2) is full", () => {
    // Two long facials occupy the room 10:00-16:00; Gloria's overlapping
    // facial can't fit anywhere.
    const occupancy = [
      appt({ id: "a1", serviceId: "svc-facial", staffId: "staff-x1", startISO: "2027-08-09T10:00:00-07:00", durationMin: 345, roomId: "room-facial" }),
      appt({ id: "a2", serviceId: "svc-facial", staffId: "staff-x2", startISO: "2027-08-09T10:00:00-07:00", durationMin: 345, roomId: "room-facial" }),
    ];
    const slots = computeSlots(mkData(), occupancy, {
      serviceVariationId: "svc-facial",
      teamMemberId: "staff-gloria",
      ...MON,
    });
    // Nothing before 16:00 (rooms full); from 16:00 on, slots exist.
    expect(slots.length).toBeGreaterThan(0);
    expect(Math.min(...slots.map((s) => ms(s.startAt)))).toBe(
      ms("2027-08-09T16:00:00-07:00")
    );
  });

  it("one nail chair: Vero's booking blocks Cassie's overlapping client", () => {
    const occupancy = [
      appt({ id: "a1", serviceId: "svc-mani", staffId: "staff-vero", startISO: "2027-08-09T10:00:00-07:00", durationMin: 45, roomId: "room-nails" }),
    ];
    const slots = computeSlots(mkData(), occupancy, {
      serviceVariationId: "svc-mani",
      teamMemberId: "staff-cassie",
      ...MON,
    });
    // 10:00 + 45min + 15 buffer -> chair free again at 11:00.
    expect(slots.length).toBeGreaterThan(0);
    expect(Math.min(...slots.map((s) => ms(s.startAt)))).toBe(
      ms("2027-08-09T11:00:00-07:00")
    );
  });

  it("an add-on extends the block: Josseline's last facial start moves earlier", () => {
    const base = {
      serviceVariationId: "svc-facial",
      teamMemberId: "staff-josseline",
      ...MON,
    };
    const noAddon = computeSlots(mkData(), [], base);
    // 55-min facial fits until 17:00 in a 10:00-18:00 day.
    expect(noAddon.map((s) => ms(s.startAt))).toContain(
      ms("2027-08-09T17:00:00-07:00")
    );
    // +25-min gold therapy -> 80 min -> nothing later than 16:30.
    const withAddon = computeSlots(mkData(), [], {
      ...base,
      addonIds: ["svc-gold"],
    });
    expect(withAddon.length).toBeGreaterThan(0);
    expect(Math.max(...withAddon.map((s) => ms(s.startAt)))).toBe(
      ms("2027-08-09T16:30:00-07:00")
    );
  });

  it("only girls who do the add-on remain: french tip forces Cassie", () => {
    const any = computeSlots(mkData(), [], {
      serviceVariationId: "svc-mani",
      addonIds: ["svc-french"],
      ...MON,
    });
    expect(any.length).toBeGreaterThan(0);
    expect(new Set(any.map((s) => s.teamMemberId))).toEqual(
      new Set(["staff-cassie"])
    );
    const vero = computeSlots(mkData(), [], {
      serviceVariationId: "svc-mani",
      teamMemberId: "staff-vero",
      addonIds: ["svc-french"],
      ...MON,
    });
    expect(vero).toEqual([]);
  });

  it("lets a second nail main ride along (fill + pedi)", () => {
    const slots = computeSlots(mkData(), [], {
      serviceVariationId: "svc-fills",
      addonIds: ["svc-mani"],
      teamMemberId: "staff-vero",
      ...MON,
    });
    expect(slots.length).toBeGreaterThan(0);
    // 60 + 45 = 105 min, last start in a 10–18 day is 16:15.
    expect(Math.max(...slots.map((s) => ms(s.startAt)))).toBe(
      ms("2027-08-09T16:15:00-07:00")
    );
  });

  it("rejects an add-on that doesn't pair with the service", () => {
    const slots = computeSlots(mkData(), [], {
      serviceVariationId: "svc-mani",
      addonIds: ["svc-gold"],
      ...MON,
    });
    expect(slots).toEqual([]);
  });

  it("never offers an add-on as a standalone booking", () => {
    const slots = computeSlots(mkData(), [], {
      serviceVariationId: "svc-gold",
      ...MON,
    });
    expect(slots).toEqual([]);
  });

  it("respects the requested window bounds", () => {
    const slots = computeSlots(mkData(), [], {
      serviceVariationId: "svc-body",
      teamMemberId: "staff-karen",
      startAt: "2027-08-04T12:00:00-07:00",
      endAt: "2027-08-04T14:00:00-07:00",
    });
    expect(slots.length).toBeGreaterThan(0);
    const from = ms("2027-08-04T12:00:00-07:00");
    const to = ms("2027-08-04T14:00:00-07:00");
    expect(slots.every((s) => ms(s.startAt) >= from && ms(s.startAt) < to)).toBe(
      true
    );
  });
});
