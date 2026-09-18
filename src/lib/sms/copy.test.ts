import { describe, expect, it } from "vitest";
import {
  bookedSms,
  cancelledSms,
  isSingleSegment,
  reminderSms,
  toGsmSafe,
} from "./copy";
import { toE164 } from "./phone";
import { staffFirstName } from "../email/confirmation";

const SAT_9AM = "2026-09-19T16:00:00.000Z"; // 9:00am PDT
const SAT_1030 = "2026-09-19T17:30:00.000Z"; // 10:30am PDT

function assertSms(body: string) {
  expect(isSingleSegment(body)).toBe(true);
  expect(body.startsWith("Skin 360:")).toBe(true);
  expect(body).toContain("STOP");
  expect([...body].every((c) => c.charCodeAt(0) < 127)).toBe(true);
}

describe("sms copy", () => {
  it("keeps booked, reminder, and cancel to one GSM segment", () => {
    const booked = bookedSms({
      firstName: "Maria",
      serviceName: "90 Min Custom Facial",
      startAt: SAT_1030,
      staffName: "Josseline",
    });
    const reminder = reminderSms({
      firstName: "Brooke",
      serviceName: "Body Skin Workout",
      startAt: SAT_9AM,
      staffName: "Dom",
      locationId: "valencia",
    });
    const cancelled = cancelledSms({
      startAt: SAT_1030,
      locationId: "valencia",
    });
    assertSms(booked);
    assertSms(reminder);
    assertSms(cancelled);
    expect(booked).toContain("10:30am");
    expect(booked).toContain("Sat Sep 19");
    expect(reminder).toBe(
      "Skin 360: Reminder, Brooke, tomorrow 9:00am with Dom: Body Skin Workout. Call (661) 812-6999. Reply STOP to opt out."
    );
    expect(toGsmSafe(reminder)).not.toContain("—");
  });

  it("matches the two Saturday visits that can actually be texted", () => {
    const brooke = reminderSms({
      firstName: "Brooke",
      serviceName: "Body Skin Workout",
      startAt: "2026-09-19T16:00:00.000Z",
      staffName: staffFirstName("Dom"),
      locationId: "valencia",
    });
    const kirk = reminderSms({
      firstName: "Kirk",
      serviceName: "Lip Wax",
      startAt: "2026-09-19T17:30:00.000Z",
      staffName: staffFirstName("Cassie"),
      locationId: "valencia",
    });
    assertSms(brooke);
    assertSms(kirk);
    expect(brooke).toContain("9:00am");
    expect(kirk).toContain("10:30am");
    expect(kirk).toContain("Lip Wax");
  });

  it("clips a long service name instead of going over 160", () => {
    const body = bookedSms({
      firstName: "Christina",
      serviceName:
        "Microcurrent Serum Infusion + Red Laser Scalp Therapy Extra Long Name",
      startAt: SAT_1030,
      staffName: "Dominique",
    });
    assertSms(body);
  });

  it("folds accents so Spanish names stay one GSM segment", () => {
    const body = reminderSms({
      firstName: "José María",
      serviceName: "Delfín Sculpting Therapy: Per-Area Treatments",
      startAt: SAT_1030,
      staffName: "Josseline",
      locationId: "valencia",
    });
    assertSms(body);
    expect(body).toContain("Jose Maria");
    expect(body).toContain("Delfin");
  });

  it("falls back if the name is missing", () => {
    const body = bookedSms({
      firstName: "  ",
      serviceName: "Lip Wax",
      startAt: SAT_1030,
      staffName: "",
    });
    assertSms(body);
    expect(body).toContain("Hi there");
    expect(body).toContain("with us for");
  });

  it("uses the Toluca number on cancel when that is the location", () => {
    const body = cancelledSms({
      startAt: SAT_1030,
      locationId: "toluca",
    });
    assertSms(body);
    expect(body).toContain("(818) 601-2852");
  });
});

describe("phones on file", () => {
  it("accepts the formats already in the database", () => {
    expect(toE164("+1 (661) 678-5823")).toBe("+16616785823");
    expect(toE164("8184545558")).toBe("+18184545558");
    expect(toE164("+1 (916) 519-3465")).toBe("+19165193465");
    expect(toE164("6614094134")).toBe("+16614094134");
  });
});
