import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  sendClientBookingConfirmation,
  staffFirstName,
} from "@/lib/email/confirmation";

export const dynamic = "force-dynamic";

interface NotifyBody {
  appointmentId?: string;
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
  const appointmentId = body.appointmentId?.trim().slice(0, 100);
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointment" }, { status: 400 });
  }

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .select("id, client_id, service_id, staff_id, location_id, start_at, status")
    .eq("id", appointmentId)
    .single();
  if (apptError || !appt) {
    return NextResponse.json({ error: "Unknown appointment" }, { status: 404 });
  }
  if (appt.status === "cancelled" || appt.status === "no-show") {
    return NextResponse.json({ sent: false, reason: "not-active" });
  }

  const [{ data: client }, { data: service }, { data: staff }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("first_name, email")
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

  const result = await sendClientBookingConfirmation({
    to: client.email ?? "",
    firstName: client.first_name ?? "",
    serviceName: service.name,
    startAt: appt.start_at,
    staffName: staffFirstName(staff?.name),
    locationId: appt.location_id,
  });
  return NextResponse.json({
    sent: result.sent,
    reason: result.sent
      ? undefined
      : client.email?.includes("@")
        ? "send-failed"
        : "no-email",
  });
}
