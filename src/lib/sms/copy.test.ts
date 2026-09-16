import { describe, expect, it } from "vitest";
import {
  bookedSms,
  cancelledSms,
  isSingleSegment,
  reminderSms,
  toGsmSafe,
} from "./copy";

const START = "2026-09-17T17:10:00.000Z"; // 10:10am PDT

describe("sms copy", () => {
  it("keeps booked, reminder, and cancel to one GSM segment", () => {
    const booked = bookedSms({
      firstName: "Maria",
      serviceName: "Signature Customized Facial",
      startAt: START,
      staffName: "Josseline",
    });
    const reminder = reminderSms({
      firstName: "Maria",
      serviceName: "Facial Skin Workouts Treatment",
      startAt: START,
      staffName: "Josseline",
      locationId: "valencia",
    });
    const cancelled = cancelledSms({
      startAt: START,
      locationId: "valencia",
    });
    expect(isSingleSegment(booked)).toBe(true);
    expect(isSingleSegment(reminder)).toBe(true);
    expect(isSingleSegment(cancelled)).toBe(true);
    expect(booked.startsWith("Skin 360:")).toBe(true);
    expect(booked).toContain("STOP");
    expect(toGsmSafe(reminder)).not.toContain("—");
    for (const body of [booked, reminder, cancelled]) {
      expect([...body].every((c) => c.charCodeAt(0) < 127)).toBe(true);
    }
  });

  it("clips a long service name instead of going over 160", () => {
    const body = bookedSms({
      firstName: "Christina",
      serviceName:
        "Microcurrent Serum Infusion + Red Laser Scalp Therapy Extra Long Name",
      startAt: START,
      staffName: "Dominique",
    });
    expect(isSingleSegment(body)).toBe(true);
  });
});
