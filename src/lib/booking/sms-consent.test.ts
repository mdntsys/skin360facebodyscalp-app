import { describe, expect, it } from "vitest";
import { SMS_OPT_IN_LABEL, smsOptInMissingPhone } from "./sms-consent";

describe("SMS_OPT_IN_LABEL", () => {
  it("matches the A2P campaign opt-in description word for word", () => {
    expect(SMS_OPT_IN_LABEL).toBe(
      "Text me about my appointment — confirmations, reminders and changes. Msg & data rates may apply. Msg frequency varies. Reply STOP to unsubscribe, HELP for help."
    );
  });
});

describe("smsOptInMissingPhone", () => {
  it("only blocks when they opted in with no number", () => {
    expect(smsOptInMissingPhone(false, "")).toBe(false);
    expect(smsOptInMissingPhone(true, "")).toBe(true);
    expect(smsOptInMissingPhone(true, "   ")).toBe(true);
    expect(smsOptInMissingPhone(true, "(661) 812-6999")).toBe(false);
    expect(smsOptInMissingPhone(false, null)).toBe(false);
  });
});
