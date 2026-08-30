import {
  escapeHtml,
  formatAppointmentWhen,
  salonAddressLine,
} from "./confirmation";
import { sendEmail, type EmailResult } from "./send";
import { createAdminClient } from "../supabase/admin";

export interface StaffNoticeArgs {
  staffId: string;
  staffName: string;
  serviceName: string;
  addonNames?: string[];
  startAt: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  note?: string;
  locationId?: string;
  /** "online" when a client booked themselves, "salon" when someone booked them in. */
  bookedVia: "online" | "salon";
}

export function staffNoticeHtml(raw: StaffNoticeArgs): string {
  const when = formatAppointmentWhen(raw.startAt);
  const addons = (raw.addonNames ?? []).map(escapeHtml);
  const contact = [raw.clientEmail, raw.clientPhone].filter(
    (v): v is string => Boolean(v?.trim())
  );
  const source =
    raw.bookedVia === "online"
      ? "Booked online just now."
      : "Booked for you at the salon.";
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;background:#fdfbf6;color:#2b2723">
    <p style="text-align:center;letter-spacing:4px;font-size:11px;color:#a67c34">SKIN 360</p>
    <h1 style="text-align:center;font-weight:500">New appointment${
      raw.staffName ? `, ${escapeHtml(raw.staffName)}` : ""
    }</h1>
    <div style="margin:24px auto;padding:20px;border:1px solid #ece3d3;border-radius:16px;background:#fff">
      <p style="margin:0;font-size:16px">${escapeHtml(raw.serviceName)}</p>
      ${addons
        .map(
          (n) =>
            `<p style="margin:4px 0 0;font-size:13px;color:#837a6d">+ ${n}</p>`
        )
        .join("")}
      <p style="margin:8px 0 0;font-size:14px">${when}</p>
      <p style="margin:16px 0 0;font-size:14px">${escapeHtml(raw.clientName)}</p>
      ${
        contact.length
          ? `<p style="margin:4px 0 0;font-size:13px;color:#837a6d">${contact
              .map(escapeHtml)
              .join("<br/>")}</p>`
          : ""
      }
      ${
        raw.note?.trim()
          ? `<p style="margin:12px 0 0;padding:10px 12px;border-radius:10px;background:#faf7f0;font-size:13px;font-style:italic;color:#5c554c">${escapeHtml(
              raw.note
            )}</p>`
          : ""
      }
    </div>
    <p style="text-align:center;font-size:13px;color:#837a6d">
      ${source} It's on your schedule in the app.<br/>
      ${escapeHtml(salonAddressLine(raw.locationId))}
    </p>
  </div>`;
}

/**
 * Tell a girl something landed on her column. Best-effort and silent:
 * off unless Carolina switched her on, skipped when she has no email, and
 * never allowed to break a booking that already succeeded.
 */
export async function sendStaffBookingNotice(
  args: StaffNoticeArgs
): Promise<EmailResult> {
  try {
    const admin = createAdminClient();
    if (!admin) {
      console.warn(
        "staff notify skipped: SUPABASE_SERVICE_ROLE_KEY is not configured"
      );
      return { sent: false };
    }
    const { data: staff } = await admin
      .from("staff")
      .select("email, notify_by_email")
      .eq("id", args.staffId)
      .single();
    const to = staff?.email?.trim() ?? "";
    if (!staff?.notify_by_email || !to.includes("@")) return { sent: false };

    return await sendEmail({
      to,
      subject: `New appointment — ${args.serviceName}, ${formatAppointmentWhen(
        args.startAt
      )}`,
      html: staffNoticeHtml(args),
    });
  } catch (err) {
    console.error("staff booking notice failed:", err);
    return { sent: false };
  }
}
