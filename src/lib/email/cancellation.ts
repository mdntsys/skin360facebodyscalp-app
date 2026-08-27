import {
  escapeHtml,
  formatAppointmentWhen,
  salonAddressLine,
} from "./confirmation";
import { sendEmail, type EmailResult } from "./send";

const NIC_BCC = ["nic@midnitesystems.com"];

/** The number a cancelled client should call to rebook. */
export function salonPhone(locationId?: string): string {
  return locationId === "toluca" ? "(818) 601-2852" : "(661) 812-6999";
}

/**
 * Valencia runs on our booker, so a cancelled client can rebook themselves.
 * Toluca is GlossGenius — never send those clients here.
 */
export function rebookUrl(locationId?: string): string | null {
  if (locationId === "toluca") return null;
  return `${
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.skin360facebodyscalp.com"
  }/book`;
}

export function cancellationEmailHtml(rawArgs: {
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
  const phone = salonPhone(rawArgs.locationId);
  const book = rebookUrl(rawArgs.locationId);
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;background:#fdfbf6;color:#2b2723">
    <p style="text-align:center;letter-spacing:4px;font-size:11px;color:#a67c34">SKIN 360 · FACE BODY SCALP</p>
    <h1 style="text-align:center;font-weight:500">Your appointment has been cancelled</h1>
    <p style="text-align:center;font-size:14px;color:#837a6d">
      ${args.firstName ? `Hi ${args.firstName}, this` : "This"} appointment is no longer on the schedule.
    </p>
    <div style="margin:24px auto;padding:20px;border:1px solid #ece3d3;border-radius:16px;background:#fff;text-align:center">
      <p style="margin:0;font-size:16px;text-decoration:line-through;color:#837a6d">${args.serviceName}</p>
      ${args.addonNames
        .map(
          (n) =>
            `<p style="margin:4px 0 0;font-size:13px;color:#837a6d;text-decoration:line-through">+ ${n}</p>`
        )
        .join("")}
      <p style="margin:8px 0 0;font-size:14px;color:#837a6d">${when}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#837a6d">with ${args.staffName}</p>
    </div>
    ${
      book
        ? `<p style="text-align:center;margin:24px 0">
      <a href="${book}" style="display:inline-block;padding:12px 28px;border-radius:999px;background:#a67c34;color:#fff;text-decoration:none;font-size:14px">Book another time</a>
    </p>`
        : ""
    }
    <p style="text-align:center;font-size:13px;color:#837a6d">
      Questions, or want us to find you another time? Call ${escapeHtml(phone)} or just reply to this email.<br/><br/>
      ${escapeHtml(address)}
    </p>
  </div>`;
}

/** Best-effort client cancellation notice. Never throws. Skips with no email. */
export async function sendClientCancellationNotice(args: {
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
      subject: `Cancelled — ${args.serviceName}`,
      html: cancellationEmailHtml({
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
    console.error("cancellation email failed:", err);
    return { sent: false };
  }
}

/**
 * Carolina's copy — only when a girl cancelled. She already knows about the
 * ones she cancels herself, and this is the case she'd otherwise miss.
 */
export async function sendSalonCancellationNotice(args: {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  startAt: string;
  staffName: string;
  cancelledBy: string;
  locationId?: string;
}): Promise<EmailResult> {
  const to =
    process.env.EMAIL_SALON_NOTIFY ?? "skin360facebodyscalp@yahoo.com";
  const when = formatAppointmentWhen(args.startAt);
  const contact = [args.clientEmail, args.clientPhone].filter(
    (v): v is string => Boolean(v)
  );
  try {
    return await sendEmail({
      to,
      subject: `Cancelled by ${args.cancelledBy} — ${args.serviceName}`,
      html: `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;background:#fdfbf6;color:#2b2723">
    <p style="text-align:center;letter-spacing:4px;font-size:11px;color:#a67c34">SKIN 360</p>
    <h1 style="text-align:center;font-weight:500">Appointment cancelled</h1>
    <div style="margin:24px auto;padding:20px;border:1px solid #ece3d3;border-radius:16px;background:#fff">
      <p style="margin:0;font-size:16px">${escapeHtml(args.serviceName)}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#837a6d">${when}</p>
      <p style="margin:8px 0 0;font-size:14px;color:#837a6d">with ${escapeHtml(args.staffName)}</p>
      <p style="margin:16px 0 0;font-size:14px">${escapeHtml(args.clientName)}</p>
      ${contact.length ? `<p style="margin:4px 0 0;font-size:13px;color:#837a6d">${contact.map(escapeHtml).join("<br/>")}</p>` : ""}
    </div>
    <p style="text-align:center;font-size:13px;color:#837a6d">
      Cancelled by ${escapeHtml(args.cancelledBy)}. The slot is open again.
    </p>
  </div>`,
    });
  } catch (err) {
    console.error("salon cancellation notify failed:", err);
    return { sent: false };
  }
}
