import { describe, expect, it } from "vitest";

import { staffNoticeHtml, type StaffNoticeArgs } from "./staff-notify";

const base: StaffNoticeArgs = {
  staffId: "staff-vero",
  staffName: "Vero",
  serviceName: "Gel Manicure or Pedicure",
  startAt: "2027-08-04T17:00:00.000Z",
  clientName: "Jane Doe",
  clientPhone: "6615551234",
  locationId: "valencia",
  bookedVia: "online",
};

describe("staff booking notice", () => {
  it("shows the slot in Pacific time", () => {
    expect(staffNoticeHtml(base)).toMatch(/10:00\sAM\sPDT/);
  });

  it("says how it was booked", () => {
    expect(staffNoticeHtml(base)).toContain("Booked online just now");
    expect(staffNoticeHtml({ ...base, bookedVia: "salon" })).toContain(
      "Booked for you at the salon"
    );
  });

  it("carries the client and the note through", () => {
    const html = staffNoticeHtml({ ...base, note: "Coming in at 3pm" });
    expect(html).toContain("Jane Doe");
    expect(html).toContain("6615551234");
    expect(html).toContain("Coming in at 3pm");
  });

  it("escapes anything the client typed", () => {
    const html = staffNoticeHtml({
      ...base,
      clientName: '<script>alert("x")</script>',
      note: "<b>hi</b>",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>hi</b>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("leaves the contact line out when there's nothing to show", () => {
    const html = staffNoticeHtml({
      ...base,
      clientPhone: undefined,
      clientEmail: undefined,
    });
    expect(html).toContain("Jane Doe");
    expect(html).not.toContain("undefined");
  });
});
