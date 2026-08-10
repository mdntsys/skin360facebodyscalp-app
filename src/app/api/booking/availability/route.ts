import { NextResponse } from "next/server";

import {
  bookingSurfaceEnabled,
  getPublicBookingData,
  publicAvailability,
} from "@/lib/booking/public-api";

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
    const { settings } = await getPublicBookingData();
    const earliest = new Date(
      Date.now() + settings.minNoticeHours * 60 * 60 * 1000
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
