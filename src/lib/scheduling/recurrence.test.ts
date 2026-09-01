import { describe, it, expect } from "vitest";
import { format } from "date-fns";

import type {
  Appointment,
  AppointmentStatus,
  AvailabilityRule,
  Room,
  Service,
} from "../../data/types";
import type { SchedulingContext } from "./engine";
import {
  cadenceLabel,
  expandRepeatStarts,
  planRepeatOccurrences,
  seriesNoteLine,
  MAX_REPEAT_OCCURRENCES,
} from "./recurrence";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

describe("expandRepeatStarts", () => {
  it("weekly through an inclusive end date", () => {
    const first = new Date(2027, 8, 7, 13, 0); // Tue Sep 7 2027 1:00 PM
    const { starts, truncated } = expandRepeatStarts(first, {
      every: 1,
      unit: "week",
      untilDate: "2027-10-05",
    });
    expect(truncated).toBe(false);
    expect(starts.map(ymd)).toEqual([
      "2027-09-07",
      "2027-09-14",
      "2027-09-21",
      "2027-09-28",
      "2027-10-05",
    ]);
    expect(starts.every((d) => d.getHours() === 13 && d.getMinutes() === 0)).toBe(
      true
    );
  });

  it("every 2 weeks", () => {
    const first = new Date(2027, 8, 7, 10, 0);
    const { starts } = expandRepeatStarts(first, {
      every: 2,
      unit: "week",
      untilDate: "2027-10-05",
    });
    expect(starts.map(ymd)).toEqual(["2027-09-07", "2027-09-21", "2027-10-05"]);
  });

  it("daily", () => {
    const first = new Date(2027, 8, 7, 10, 0);
    const { starts } = expandRepeatStarts(first, {
      every: 1,
      unit: "day",
      untilDate: "2027-09-09",
    });
    expect(starts.map(ymd)).toEqual(["2027-09-07", "2027-09-08", "2027-09-09"]);
  });

  it("end date equal to the first visit is just that visit", () => {
    const first = new Date(2027, 8, 7, 13, 0);
    const { starts } = expandRepeatStarts(first, {
      every: 1,
      unit: "week",
      untilDate: "2027-09-07",
    });
    expect(starts.map(ymd)).toEqual(["2027-09-07"]);
  });

  it("monthly keeps the 31st when the month has one", () => {
    const first = new Date(2027, 0, 31, 11, 0); // Jan 31
    const { starts } = expandRepeatStarts(first, {
      every: 1,
      unit: "month",
      untilDate: "2027-03-31",
    });
    expect(starts.map(ymd)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });

  it("caps at 52 and flags truncated", () => {
    const first = new Date(2027, 0, 4, 10, 0);
    const { starts, truncated } = expandRepeatStarts(first, {
      every: 1,
      unit: "week",
      untilDate: "2029-01-01",
    });
    expect(starts).toHaveLength(MAX_REPEAT_OCCURRENCES);
    expect(truncated).toBe(true);
  });
});

describe("cadenceLabel / seriesNoteLine", () => {
  it("reads like Square", () => {
    expect(cadenceLabel(1, "week")).toBe("every week");
    expect(cadenceLabel(2, "week")).toBe("every 2 weeks");
    expect(cadenceLabel(1, "month")).toBe("every month");
    expect(
      seriesNoteLine({ every: 1, unit: "week", untilDate: "2027-11-24" })
    ).toBe("Repeats every week through Nov 24");
  });
});

const services: Service[] = [
  {
    id: "svc-scalp",
    name: "Head Spa",
    category: "Scalp",
    price: 120,
    durationMin: 60,
    bufferMin: 10,
    description: "",
  },
];
const serviceById = new Map(services.map((s) => [s.id, s]));
const rooms: Room[] = [
  {
    id: "room-headspa",
    locationId: "valencia",
    name: "Head Spa Room",
    capacity: 1,
    categories: ["Scalp"],
    sort: 0,
  },
];
function rule(weekday: number): AvailabilityRule {
  return {
    id: `rule-${weekday}`,
    staffId: "staff-dom",
    locationId: "valencia",
    weekday,
    startTime: "10:00",
    endTime: "18:00",
  };
}

describe("planRepeatOccurrences", () => {
  const draft = {
    locationId: "valencia" as const,
    serviceId: "svc-scalp",
    staffId: "staff-dom",
    durationMin: 60,
  };

  it("keeps every week when the column is free", () => {
    const ctx: SchedulingContext = {
      appointments: [],
      timeBlocks: [],
      availabilityRules: [rule(2)], // Tuesdays
      availabilityOverrides: [],
      rooms,
      serviceById,
    };
    const { starts } = expandRepeatStarts(new Date(2027, 8, 7, 13, 0), {
      every: 1,
      unit: "week",
      untilDate: "2027-09-21",
    });
    const { keep, skipped } = planRepeatOccurrences({
      ctx,
      draft,
      starts,
      preferredRoomId: "room-headspa",
    });
    expect(keep).toHaveLength(3);
    expect(skipped).toHaveLength(0);
    expect(keep.every((k) => k.roomId === "room-headspa")).toBe(true);
  });

  it("skips a later week that is already taken, keeps the rest", () => {
    const busy: Appointment = {
      id: "busy",
      clientId: "other",
      serviceId: "svc-scalp",
      staffId: "staff-dom",
      locationId: "valencia",
      startISO: new Date(2027, 8, 14, 13, 0).toISOString(),
      durationMin: 60,
      price: 120,
      status: "confirmed" as AppointmentStatus,
      roomId: "room-headspa",
    };
    const ctx: SchedulingContext = {
      appointments: [busy],
      timeBlocks: [],
      availabilityRules: [rule(2)],
      availabilityOverrides: [],
      rooms,
      serviceById,
    };
    const { starts } = expandRepeatStarts(new Date(2027, 8, 7, 13, 0), {
      every: 1,
      unit: "week",
      untilDate: "2027-09-21",
    });
    const { keep, skipped } = planRepeatOccurrences({
      ctx,
      draft,
      starts,
    });
    expect(keep.map((k) => ymd(new Date(k.startISO)))).toEqual([
      "2027-09-07",
      "2027-09-21",
    ]);
    expect(skipped).toHaveLength(1);
    expect(ymd(new Date(skipped[0].startISO))).toBe("2027-09-14");
  });

  it("skips a week she is not working", () => {
    const ctx: SchedulingContext = {
      appointments: [],
      timeBlocks: [],
      availabilityRules: [rule(2)], // Tuesdays only
      availabilityOverrides: [],
      rooms,
      serviceById,
    };
    // Start Tuesday, then a Wednesday 1 day later would be skipped if we used daily —
    // use weekly but include a Wednesday start via mixed starts.
    const starts = [
      new Date(2027, 8, 7, 13, 0), // Tue
      new Date(2027, 8, 8, 13, 0), // Wed — off
      new Date(2027, 8, 14, 13, 0), // Tue
    ];
    const { keep, skipped } = planRepeatOccurrences({ ctx, draft, starts });
    expect(keep).toHaveLength(2);
    expect(skipped).toHaveLength(1);
    expect(ymd(new Date(skipped[0].startISO))).toBe("2027-09-08");
    expect(skipped[0].reasons).toContain("staff-unavailable");
  });
});
