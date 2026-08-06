import { NextResponse } from "next/server";

import {
  bookingSurfaceEnabled,
  createPublicBooking,
} from "@/lib/square/booking-api";
import { SquareApiError } from "@/lib/square/client";

export const dynamic = "force-dynamic";

interface CreateBody {
  serviceVariationId?: string;
  serviceVariationVersion?: number;
  teamMemberId?: string;
  startAt?: string;
  note?: string;
  customer?: {
    givenName?: string;
    familyName?: string;
    email?: string;
    phone?: string;
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

  try {
    const result = await createPublicBooking({
      serviceVariationId,
      serviceVariationVersion: body.serviceVariationVersion,
      teamMemberId,
      startAt,
      note: body.note?.slice(0, 500),
      customer: {
        givenName: customer.givenName.trim().slice(0, 100),
        familyName: customer.familyName?.trim().slice(0, 100) ?? "",
        email: customer.email.trim().slice(0, 200),
        phone: customer.phone?.trim().slice(0, 30),
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SquareApiError) {
      console.error("booking/create Square error:", err.message);
      return NextResponse.json(
        { error: "That time is no longer available. Please pick another." },
        { status: 409 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    console.error("booking/create failed:", err);
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
