import { sendEmail, type EmailResult } from "./send";

const SALON_TZ = "America/Los_Angeles";
const NIC_BCC = ["nic@midnitesystems.com"];

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatAppointmentWhen(startAt: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(startAt));
}

export function staffFirstName(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0];
  return first || "our team";
}

export function salonAddressLine(locationId?: string): string {
  if (locationId === "toluca") {
    return "Skin 360, 4425 W. Riverside Drive Suite 203, Burbank CA";
  }
  return "Skin 360, 24510 Town Center Dr Suite 170, Valencia CA";
}

export function confirmationEmailHtml(rawArgs: {
  firstName: string;
  serviceName: string;
  addonNames?: string[];
  startAt: string;
  staffName: string;
  locationId?: string;
}): string {
  const args = {
    firstName: escapeHtml(rawArgs.firstName),
    serviceName: escapeHtml(rawArgs.serviceName),
    staffName: escapeHtml(rawArgs.staffName),
    addonNames: (rawArgs.addonNames ?? []).map(escapeHtml),
  };
  const when = formatAppointmentWhen(rawArgs.startAt);
  const address = salonAddressLine(rawArgs.locationId);
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;background:#fdfbf6;color:#2b2723">
    <p style="text-align:center;letter-spacing:4px;font-size:11px;color:#a67c34">SKIN 360 · FACE BODY SCALP</p>
    <h1 style="text-align:center;font-weight:500">You're booked${args.firstName ? `, ${args.firstName}` : ""}</h1>
    <div style="margin:24px auto;padding:20px;border:1px solid #ece3d3;border-radius:16px;background:#fff;text-align:center">
      <p style="margin:0;font-size:16px">${args.serviceName}</p>
      ${args.addonNames
        .map(
          (n) =>
            `<p style="margin:4px 0 0;font-size:13px;color:#837a6d">+ ${n}</p>`
        )
        .join("")}
      <p style="margin:8px 0 0;font-size:14px">${when}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#837a6d">with ${args.staffName}</p>
    </div>
    <p style="text-align:center;font-size:13px;color:#837a6d">
      ${escapeHtml(address)}<br/>
      Need to change your appointment? Just reply to this email or call us.
    </p>
  </div>`;
}

/** Best-effort client confirmation. Never throws. Skips if there is no email. */
export async function sendClientBookingConfirmation(args: {
  to: string;
  firstName: string;
  serviceName: string;
  addonNames?: string[];
  startAt: string;
  staffName: string;
  locationId?: string;
}): Promise<EmailResult> {
  const to = args.to.trim();
  if (!to.includes("@")) return { sent: false };
  try {
    return await sendEmail({
      to,
      subject: `You're booked — ${args.serviceName}`,
      html: confirmationEmailHtml({
        firstName: args.firstName,
        serviceName: args.serviceName,
        addonNames: args.addonNames,
        startAt: args.startAt,
        staffName: args.staffName,
        locationId: args.locationId,
      }),
      bcc: NIC_BCC,
    });
  } catch (err) {
    console.error("booking confirmation email failed:", err);
    return { sent: false };
  }
}
