import { describe, expect, it, vi, beforeEach } from "vitest";

import { sendEmail } from "./send";
import {
  cancellationEmailHtml,
  rebookUrl,
  salonPhone,
  sendClientCancellationNotice,
  sendSalonCancellationNotice,
} from "./cancellation";

vi.mock("./send", () => ({
  sendEmail: vi.fn(async () => ({ sent: true })),
}));

const sendEmailMock = vi.mocked(sendEmail);

const base = {
  to: "client@example.com",
  firstName: "Karen",
  serviceName: "Lymphatic Massage",
  startAt: "2027-08-04T17:00:00.000Z",
  staffName: "Karen",
  locationId: "valencia",
};

beforeEach(() => {
  sendEmailMock.mockClear();
});

describe("cancellation email", () => {
  it("points Valencia clients at our booker and Toluca clients at nobody", () => {
    expect(rebookUrl("valencia")).toContain("/book");
    // Toluca lives on GlossGenius — never send those clients to our app.
    expect(rebookUrl("toluca")).toBeNull();
  });

  it("gives each location its own phone number", () => {
    expect(salonPhone("valencia")).toBe("(661) 812-6999");
    expect(salonPhone("toluca")).toBe("(818) 601-2852");
  });

  it("shows the cancelled slot in Pacific time", () => {
    expect(cancellationEmailHtml(base)).toMatch(/10:00\sAM\sPDT/);
  });

  it("escapes client-supplied names", () => {
    const html = cancellationEmailHtml({
      ...base,
      firstName: '<script>alert("x")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("skips clients with no email on file", async () => {
    const result = await sendClientCancellationNotice({ ...base, to: "" });
    expect(result.sent).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("bccs nic on the client notice", async () => {
    await sendClientCancellationNotice(base);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const arg = sendEmailMock.mock.calls[0][0];
    expect(arg.bcc).toContain("nic@midnitesystems.com");
    expect(arg.subject).toContain("Cancelled");
  });

  it("names the girl who cancelled on the salon copy", async () => {
    await sendSalonCancellationNotice({
      clientName: "Jane Doe",
      clientPhone: "6615551234",
      serviceName: "Lymphatic Massage",
      startAt: base.startAt,
      staffName: "Karen",
      cancelledBy: "Karen Paredes",
      locationId: "valencia",
    });
    const arg = sendEmailMock.mock.calls[0][0];
    expect(arg.to).toBe("skin360facebodyscalp@yahoo.com");
    expect(arg.subject).toContain("Karen Paredes");
    expect(arg.html).toContain("Jane Doe");
  });
});
