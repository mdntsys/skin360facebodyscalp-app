import { NextResponse } from "next/server";

import { sendSms } from "@/lib/sms/send";
import { toE164 } from "@/lib/sms/phone";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const to = toE164(new URL(request.url).searchParams.get("to"));
  if (!to) {
    return NextResponse.json({ error: "Need ?to=" }, { status: 400 });
  }
  const result = await sendSms({
    to,
    body: "Skin 360: test from Nico. If you got this, appointment texts are live. Reply STOP to opt out.",
  });
  return NextResponse.json({ to, ...result });
}
