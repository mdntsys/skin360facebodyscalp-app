// Schedule-filter tests encoding the girls' real schedules (all times are
// salon-local; the module pins process TZ to America/Los_Angeles).
import { describe, expect, it } from "vitest";

import { slotWithinSchedule, type ScheduleData } from "./schedule-filter";

// 2026-08-12 is a Wednesday, 2026-08-15 / 2026-08-22 are Saturdays.
const KAREN_TM = "TM-karen";
const CATALINA_TM = "TM-catalina";

const DATA: ScheduleData = {
  staffSquareIds: { [KAREN_TM]: "staff-karen", [CATALINA_TM]: "staff-catalina" },
  availabilityRules: [
    // Karen: Wednesday + Thursday 10:00-18:00
    { id: "r1", staffId: "staff-karen", locationId: "valencia", weekday: 3, startTime: "10:00", endTime: "18:00" },
    { id: "r2", staffId: "staff-karen", locationId: "valencia", weekday: 4, startTime: "10:00", endTime: "18:00" },
    // Catalina: Tuesday + Wednesday 10:00-14:00
    { id: "r3", staffId: "staff-catalina", locationId: "valencia", weekday: 2, startTime: "10:00", endTime: "14:00" },
    { id: "r4", staffId: "staff-catalina", locationId: "valencia", weekday: 3, startTime: "10:00", endTime: "14:00" },
  ],
  availabilityOverrides: [
    // Karen's every-other-Saturday: Aug 15 yes (9-4), Aug 22 no rule at all.
    { id: "o1", staffId: "staff-karen", dateISO: "2026-08-15", available: true, startTime: "09:00", endTime: "16:00", note: "Every other Saturday" },
  ],
  timeBlocks: [
    { id: "b1", locationId: "valencia", staffId: "staff-karen", startISO: "2026-08-12T12:00:00-07:00", endISO: "2026-08-12T13:00:00-07:00", reason: "Lunch" },
  ],
};

const ok = (tm: string, iso: string, min = 60) =>
  slotWithinSchedule(DATA, tm, iso, min);

describe("slotWithinSchedule", () => {
  it("allows Karen on a Wednesday inside her hours", () => {
    expect(ok(KAREN_TM, "2026-08-12T10:00:00-07:00")).toBe(true);
  });

  it("rejects Karen on a Monday even though Square's default hours allow it", () => {
    expect(ok(KAREN_TM, "2026-08-10T11:00:00-07:00")).toBe(false);
  });

  it("rejects a slot that runs past the end of her day", () => {
    expect(ok(KAREN_TM, "2026-08-12T17:30:00-07:00")).toBe(false);
  });

  it("honors her every-other-Saturday override on the on-week", () => {
    expect(ok(KAREN_TM, "2026-08-15T09:00:00-07:00")).toBe(true);
  });

  it("rejects the off-week Saturday", () => {
    expect(ok(KAREN_TM, "2026-08-22T09:00:00-07:00")).toBe(false);
  });

  it("respects Catalina's 10-2: fits at 1pm, not at 1:30", () => {
    expect(ok(CATALINA_TM, "2026-08-11T13:00:00-07:00")).toBe(true);
    expect(ok(CATALINA_TM, "2026-08-11T13:30:00-07:00")).toBe(false);
  });

  it("blocks time off (time blocks) inside a working day", () => {
    expect(ok(KAREN_TM, "2026-08-12T12:30:00-07:00")).toBe(false);
  });

  it("passes through team members we have no schedule for", () => {
    expect(ok("TM-sandbox-unknown", "2026-08-10T03:00:00-07:00")).toBe(true);
  });
});
