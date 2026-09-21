import { describe, expect, it } from "vitest";
import { resendPlan } from "./resend";

describe("resendPlan", () => {
  it("sends both when they have an email, a phone, and opted in", () => {
    expect(
      resendPlan({
        status: "confirmed",
        email: "ana@example.com",
        phone: "(661) 649-2566",
        smsOptIn: true,
      })
    ).toEqual({ email: true, sms: true, skipped: [] });
  });

  it("emails only when they never checked the text box", () => {
    expect(
      resendPlan({
        status: "checked-in",
        email: "ana@example.com",
        phone: "6616492566",
        smsOptIn: false,
      })
    ).toEqual({ email: true, sms: false, skipped: ["not-opted-in"] });
  });

  it("texts only when there is no email", () => {
    expect(
      resendPlan({
        status: "confirmed",
        email: "",
        phone: "+16616492566",
        smsOptIn: true,
      }).email
    ).toBe(false);
  });

  it("refuses a cancelled or no-show visit", () => {
    expect(
      resendPlan({
        status: "cancelled",
        email: "ana@example.com",
        phone: "6616492566",
        smsOptIn: true,
      }).skipped
    ).toContain("not-active");
    expect(
      resendPlan({
        status: "no-show",
        email: "ana@example.com",
        phone: "6616492566",
        smsOptIn: true,
      }).email
    ).toBe(false);
  });

  it("does not text a bad phone even if they opted in", () => {
    const plan = resendPlan({
      status: "confirmed",
      email: "ana@example.com",
      phone: "123",
      smsOptIn: true,
    });
    expect(plan.sms).toBe(false);
    expect(plan.skipped).toContain("no-phone");
  });
});
