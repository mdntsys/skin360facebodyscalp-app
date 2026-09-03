import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  sendClientBookingConfirmation,
  staffFirstName,
} from "@/lib/email/confirmation";
import {
  sendClientCancellationNotice,
  sendSalonCancellationNotice,
} from "@/lib/email/cancellation";
import { sendStaffBookingNotice } from "@/lib/email/staff-notify";

export const dynamic = "force-dynamic";

interface NotifyBody {
  appointmentId?: string;
  /** "booked" is the confirmation. "cancelled" is the call-off notice. */
  kind?: "booked" | "cancelled";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: NotifyBody;
  try {
    body = (await request.json()) as NotifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const kind = body.kind === "cancelled" ? "cancelled" : "booked";
  const appointmentId = body.appointmentId?.trim().slice(0, 100);
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointment" }, { status: 400 });
  }

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .select("id, client_id, service_id, staff_id, location_id, start_at, status, note, addon_service_ids")
    .eq("id", appointmentId)
    .single();
  if (apptError || !appt) {
    return NextResponse.json({ error: "Unknown appointment" }, { status: 404 });
  }
  if (
    kind === "booked" &&
    (appt.status === "cancelled" || appt.status === "no-show")
  ) {
    return NextResponse.json({ sent: false, reason: "not-active" });
  }
  if (kind === "cancelled" && appt.status !== "cancelled") {
    return NextResponse.json({ sent: false, reason: "not-cancelled" });
  }

  const [{ data: client }, { data: service }, { data: staff }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("first_name, last_name, email, phone")
        .eq("id", appt.client_id)
        .single(),
      supabase.from("services").select("name").eq("id", appt.service_id).single(),
      supabase.from("staff").select("name").eq("id", appt.staff_id).single(),
    ]);
  if (!client || !service) {
    return NextResponse.json(
      { error: "Unknown client or service" },
      { status: 404 }
    );
  }

  const addonIds = Array.isArray(appt.addon_service_ids)
    ? (appt.addon_service_ids as string[]).filter(Boolean)
    : [];
  let addonNames: string[] = [];
  if (addonIds.length > 0) {
    const { data: extraRows } = await supabase
      .from("services")
      .select("id, name")
      .in("id", addonIds);
    const byId = new Map((extraRows ?? []).map((r) => [r.id, r.name]));
    addonNames = addonIds
      .map((id) => byId.get(id))
      .filter((n): n is string => Boolean(n));
  }

  const shared = {
    to: client.email ?? "",
    firstName: client.first_name ?? "",
    serviceName: service.name,
    addonNames,
    startAt: appt.start_at,
    staffName: staffFirstName(staff?.name),
    locationId: appt.location_id,
  };

  if (kind === "cancelled") {
    const result = await sendClientCancellationNotice(shared);

    // Carolina already knows about the ones she cancels herself. Copy her
    // only when a girl called it off from her own schedule.
    const { data: profile } = await supabase
      .from("profiles")
      .select("access, staff_id")
      .eq("id", user.id)
      .single();
    if (profile?.access === "staff") {
      const { data: canceller } = await supabase
        .from("staff")
        .select("name")
        .eq("id", profile.staff_id)
        .single();
      await sendSalonCancellationNotice({
        clientName:
          [client.first_name, client.last_name].filter(Boolean).join(" ") ||
          "A client",
        clientEmail: client.email ?? undefined,
        clientPhone: client.phone ?? undefined,
        serviceName: service.name,
        startAt: appt.start_at,
        staffName: staffFirstName(staff?.name),
        cancelledBy: canceller?.name ?? "a team member",
        locationId: appt.location_id,
      });
    }

    return NextResponse.json({
      sent: result.sent,
      reason: result.sent
        ? undefined
        : client.email?.includes("@")
          ? "send-failed"
          : "no-email",
    });
  }

  const result = await sendClientBookingConfirmation(shared);

  // Tell the girl too, unless she's the one who just booked it.
  const { data: booker } = await supabase
    .from("profiles")
    .select("staff_id")
    .eq("id", user.id)
    .single();
  if (booker?.staff_id !== appt.staff_id) {
    await sendStaffBookingNotice({
      staffId: appt.staff_id,
      staffName: staffFirstName(staff?.name),
      serviceName: service.name,
      addonNames,
      startAt: appt.start_at,
      clientName:
        [client.first_name, client.last_name].filter(Boolean).join(" ") ||
        "A client",
      clientEmail: client.email ?? undefined,
      clientPhone: client.phone ?? undefined,
      note: appt.note ?? undefined,
      locationId: appt.location_id,
      bookedVia: "salon",
    });
  }

  return NextResponse.json({
    sent: result.sent,
    reason: result.sent
      ? undefined
      : client.email?.includes("@")
        ? "send-failed"
        : "no-email",
  });
}
