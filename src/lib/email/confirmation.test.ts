import { describe, expect, it, vi, beforeEach } from "vitest";

import { sendEmail } from "./send";
import {
  confirmationEmailHtml,
  formatAppointmentWhen,
  salonAddressLine,
  sendClientBookingConfirmation,
  staffFirstName,
} from "./confirmation";

vi.mock("./send", () => ({
  sendEmail: vi.fn(async () => ({ sent: true })),
}));

const sendEmailMock = vi.mocked(sendEmail);

describe("confirmation email", () => {
  it("formats the slot in Pacific time", () => {
    // 17:00 UTC on a PDT day is 10:00 AM PT.
    expect(formatAppointmentWhen("2027-08-04T17:00:00.000Z")).toMatch(
      /10:00\sAM\sPDT/
    );
  });

  it("uses the Valencia address by default and Burbank for Toluca", () => {
    expect(salonAddressLine()).toContain("Valencia");
    expect(salonAddressLine("valencia")).toContain("Valencia");
    expect(salonAddressLine("toluca")).toContain("Burbank");
  });

  it("takes the girl's first name", () => {
    expect(staffFirstName("Josseline Mejia")).toBe("Josseline");
    expect(staffFirstName("Carolina")).toBe("Carolina");
    expect(staffFirstName("")).toBe("our team");
  });

  it("renders service, add-ons, staff, and first name", () => {
    const html = confirmationEmailHtml({
      firstName: "Ana",
      serviceName: "Classic Facial",
      addonNames: ["24K Gold Therapy"],
      startAt: "2027-08-04T17:00:00.000Z",
      staffName: "Josseline",
      locationId: "valencia",
    });
    expect(html).toContain("You're booked, Ana");
    expect(html).toContain("Classic Facial");
    expect(html).toContain("+ 24K Gold Therapy");
    expect(html).toContain("with Josseline");
    expect(html).toContain("Valencia");
    expect(html).toMatch(/10:00\sAM\sPDT/);
  });

  it("escapes names that look like HTML", () => {
    const html = confirmationEmailHtml({
      firstName: "<script>alert(1)</script>",
      serviceName: 'Facial & "Glow"',
      addonNames: ["<b>Gold</b>"],
      startAt: "2027-08-04T17:00:00.000Z",
      staffName: "Josseline",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Gold</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Facial &amp; &quot;Glow&quot;");
  });
});

describe("sendClientBookingConfirmation", () => {
  beforeEach(() => {
    sendEmailMock.mockClear();
    sendEmailMock.mockResolvedValue({ sent: true });
  });

  it("does not send when there is no email", async () => {
    const result = await sendClientBookingConfirmation({
      to: "",
      firstName: "Ana",
      serviceName: "Classic Facial",
      startAt: "2027-08-04T17:00:00.000Z",
      staffName: "Josseline",
    });
    expect(result.sent).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends the confirmation and BCCs Nic", async () => {
    const result = await sendClientBookingConfirmation({
      to: "ana@example.com",
      firstName: "Ana",
      serviceName: "Classic Facial",
      startAt: "2027-08-04T17:00:00.000Z",
      staffName: "Josseline",
      locationId: "valencia",
    });
    expect(result.sent).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const args = sendEmailMock.mock.calls[0][0];
    expect(args.to).toBe("ana@example.com");
    expect(args.subject).toBe("You're booked — Classic Facial");
    expect(args.bcc).toEqual(["nic@midnitesystems.com"]);
    expect(args.html).toContain("You're booked, Ana");
  });
});
