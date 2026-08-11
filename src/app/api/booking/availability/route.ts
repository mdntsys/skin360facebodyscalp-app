import { NextResponse } from "next/server";
import { addDays, startOfDay } from "date-fns";

import {
  bookingSurfaceEnabled,
  getPublicBookingData,
  publicAvailability,
} from "@/lib/booking/public-api";

export const dynamic = "force-dynamic";

// One page of the picker; the UI walks pages up to the advance horizon.
const WINDOW_DAYS = 7;
// Carolina: "a whole month in advance please" — 5 weeks, comfortably a month.
// Stays under the occupancy RPC's 45-day cap even with the ±24h fetch pad.
const MAX_ADVANCE_DAYS = 35;

export async function GET(request: Request) {
  if (!(await bookingSurfaceEnabled())) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const serviceVariationId = params.get("service");
  const teamMemberId = params.get("staff") ?? undefined;
  const startParam = params.get("start");
  const addonIds = (params.get("addons") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!serviceVariationId || !startParam) {
    return NextResponse.json(
      { error: "Missing service or start" },
      { status: 400 }
    );
  }

  try {
    const { settings } = await getPublicBookingData();
    // Same-day stays phone/walk-in: online slots start at the next salon-local
    // day (process TZ is pinned to America/Los_Angeles by the booking module).
    const dayOne = addDays(startOfDay(new Date()), 1);
    const notice = new Date(
      Date.now() + settings.minNoticeHours * 60 * 60 * 1000
    );
    const earliest = notice > dayOne ? notice : dayOne;
    const horizon = addDays(startOfDay(new Date()), MAX_ADVANCE_DAYS + 1);

    const requested = new Date(startParam);
    const start = requested > earliest ? requested : earliest;
    if (start >= horizon) {
      return NextResponse.json({ slots: [], earliestISO: earliest.toISOString() });
    }
    const end = new Date(
      Math.min(
        start.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000,
        horizon.getTime()
      )
    );
    const slots = await publicAvailability({
      serviceVariationId,
      teamMemberId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      addonIds,
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
