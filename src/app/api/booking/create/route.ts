import { NextResponse } from "next/server";

import {
  BookingError,
  bookingSurfaceEnabled,
  createPublicBooking,
} from "@/lib/booking/public-api";

export const dynamic = "force-dynamic";

interface CreateBody {
  serviceVariationId?: string;
  serviceVariationVersion?: number;
  teamMemberId?: string;
  startAt?: string;
  addonIds?: unknown;
  note?: string;
  customer?: {
    givenName?: string;
    familyName?: string;
    email?: string;
    phone?: string;
    smsOptIn?: boolean;
  };
}

export async function POST(request: Request) {
  if (!(await bookingSurfaceEnabled())) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { serviceVariationId, teamMemberId, startAt, customer } = body;
  if (
    !serviceVariationId ||
    !teamMemberId ||
    !startAt ||
    !customer?.givenName?.trim() ||
    !customer?.email?.trim()
  ) {
    return NextResponse.json(
      { error: "Please fill in every required field." },
      { status: 400 }
    );
  }

  const addonIds = Array.isArray(body.addonIds)
    ? body.addonIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.slice(0, 100))
        .slice(0, 8)
    : [];

  try {
    const result = await createPublicBooking({
      serviceVariationId,
      teamMemberId,
      startAt,
      addonIds,
      note: body.note?.slice(0, 500),
      customer: {
        givenName: customer.givenName.trim().slice(0, 100),
        familyName: customer.familyName?.trim().slice(0, 100) ?? "",
        email: customer.email.trim().slice(0, 200),
        phone: customer.phone?.trim().slice(0, 30),
        smsOptIn: customer.smsOptIn === true,
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("booking/create failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
