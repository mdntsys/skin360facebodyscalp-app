import { NextResponse } from "next/server";

import {
  bookingSurfaceEnabled,
  getBookingConfig,
  publicAvailability,
} from "@/lib/square/booking-api";

export const dynamic = "force-dynamic";

const MAX_WINDOW_DAYS = 8;

export async function GET(request: Request) {
  if (!(await bookingSurfaceEnabled())) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const serviceVariationId = params.get("service");
  const teamMemberId = params.get("staff") ?? undefined;
  const startParam = params.get("start");
  if (!serviceVariationId || !startParam) {
    return NextResponse.json(
      { error: "Missing service or start" },
      { status: 400 }
    );
  }

  try {
    const config = await getBookingConfig();
    const earliest = new Date(
      Date.now() + config.minNoticeHours * 60 * 60 * 1000
    );
    const requested = new Date(startParam);
    const start = requested > earliest ? requested : earliest;
    const end = new Date(
      Math.min(
        start.getTime() + MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        requested.getTime() + MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000
      )
    );
    const slots = await publicAvailability({
      serviceVariationId,
      teamMemberId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
    return NextResponse.json({ slots, earliestISO: earliest.toISOString() });
  } catch (err) {
    console.error("booking/availability failed:", err);
    return NextResponse.json(
      { error: "Could not load availability" },
      { status: 502 }
    );
  }
}
