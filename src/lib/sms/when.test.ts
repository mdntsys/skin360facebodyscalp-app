import { describe, expect, it } from "vitest";
import {
  addYmd,
  salonDateParts,
  salonYmd,
  tomorrowSalonYmd,
} from "./when";

describe("salon calendar", () => {
  it("uses Los Angeles date, not UTC", () => {
    // 2026-09-19 00:30 PDT = 07:30 UTC same calendar day
    expect(salonYmd("2026-09-19T07:30:00.000Z")).toBe("2026-09-19");
    // 2026-09-19 23:30 PDT = 2026-09-20 06:30 UTC — still Friday the 19th in LA
    expect(salonYmd("2026-09-20T06:30:00.000Z")).toBe("2026-09-19");
  });

  it("rolls the month and year", () => {
    expect(addYmd("2026-09-30", 1)).toBe("2026-10-01");
    expect(addYmd("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("computes tomorrow in LA around a late UTC instant", () => {
    // Fri Sep 18 2026 5pm PDT = Sat Sep 19 00:00 UTC
    expect(tomorrowSalonYmd(new Date("2026-09-19T00:00:00.000Z"))).toBe(
      "2026-09-19"
    );
    // Sat Sep 19 2026 10am PDT
    expect(tomorrowSalonYmd(new Date("2026-09-19T17:00:00.000Z"))).toBe(
      "2026-09-20"
    );
  });
});

describe("salon clock in the text", () => {
  it("shows 9:00am Saturday PDT from the stored UTC instant", () => {
    const p = salonDateParts("2026-09-19T16:00:00.000Z");
    expect(p.weekday).toBe("Sat");
    expect(p.monthDay).toBe("Sep 19");
    expect(p.time).toBe("9:00am");
  });

  it("shows 10:00am in January PST (UTC-8)", () => {
    const p = salonDateParts("2027-01-15T18:00:00.000Z");
    expect(p.time).toBe("10:00am");
    expect(p.weekday).toBe("Fri");
  });

  it("does not shift an hour on the March 2026 DST start after 2am", () => {
    // 10:00am PDT on Sun Mar 8 2026 = 17:00 UTC
    const p = salonDateParts("2026-03-08T17:00:00.000Z");
    expect(p.time).toBe("10:00am");
    expect(p.weekday).toBe("Sun");
  });

  it("strips the unicode space some Node versions put before AM", () => {
    const p = salonDateParts("2026-09-19T17:30:00.000Z");
    expect(p.time).toMatch(/^\d{1,2}:\d{2}(am|pm)$/);
    expect(p.time).not.toMatch(/\s/);
  });
});
