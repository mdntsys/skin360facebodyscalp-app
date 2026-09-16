import { NextResponse } from "next/server";

import { staffFirstName } from "@/lib/email/confirmation";
import { sendAppointmentSms } from "@/lib/sms/notify";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (secret) return header === `Bearer ${secret}`;
  return process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ sent: 0, reason: "no-admin" });
  }

  const laYmd = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  const todayLa = laYmd(new Date().toISOString());
  const [y, m, d] = todayLa.split("-").map(Number);
  const tomorrowLa = new Date(Date.UTC(y, m - 1, d + 1))
    .toISOString()
    .slice(0, 10);
  const windowStart = new Date().toISOString();
  const windowEnd = new Date(Date.now() + 40 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("appointments")
    .select(
      "id, start_at, location_id, service_id, staff_id, client_id, sms_reminder_sent_at"
    )
    .gte("start_at", windowStart)
    .lt("start_at", windowEnd)
    .in("status", ["confirmed", "checked-in"])
    .is("sms_reminder_sent_at", null)
    .limit(200);
  if (error) {
    console.error("sms-reminders query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  for (const appt of rows ?? []) {
    if (laYmd(appt.start_at) !== tomorrowLa) {
      skipped += 1;
      continue;
    }
    const [{ data: client }, { data: service }, { data: staff }] =
      await Promise.all([
        supabase
          .from("clients")
          .select("first_name, phone, sms_opt_in")
          .eq("id", appt.client_id)
          .single(),
        supabase.from("services").select("name").eq("id", appt.service_id).single(),
        supabase.from("staff").select("name").eq("id", appt.staff_id).single(),
      ]);
    if (!client?.sms_opt_in || !service) {
      skipped += 1;
      continue;
    }
    const result = await sendAppointmentSms({
      kind: "reminder",
      phone: client.phone,
      optedIn: true,
      firstName: client.first_name ?? "",
      serviceName: service.name,
      startAt: appt.start_at,
      staffName: staffFirstName(staff?.name),
      locationId: appt.location_id,
    });
    if (!result.sent) {
      skipped += 1;
      continue;
    }
    await supabase
      .from("appointments")
      .update({ sms_reminder_sent_at: new Date().toISOString() })
      .eq("id", appt.id);
    sent += 1;
  }

  return NextResponse.json({ sent, skipped, scanned: (rows ?? []).length });
}
