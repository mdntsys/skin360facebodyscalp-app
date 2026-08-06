import { NextResponse } from "next/server";

import { bookingSurfaceEnabled } from "@/lib/square/booking-api";
import { purchaseGiftCard } from "@/lib/square/gift-cards";

export const dynamic = "force-dynamic";

interface PurchaseBody {
  sourceToken?: string;
  amountCents?: number;
  purchaser?: { name?: string; email?: string };
  recipient?: { name?: string; email?: string; message?: string };
}

export async function POST(request: Request) {
  if (!(await bookingSurfaceEnabled())) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  let body: PurchaseBody;
  try {
    body = (await request.json()) as PurchaseBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (
    !body.sourceToken ||
    !body.amountCents ||
    !body.purchaser?.name?.trim() ||
    !body.purchaser?.email?.trim()
  ) {
    return NextResponse.json(
      { error: "Please fill in every required field." },
      { status: 400 }
    );
  }

  try {
    const result = await purchaseGiftCard({
      sourceToken: body.sourceToken,
      amountCents: body.amountCents,
      purchaser: {
        name: body.purchaser.name.trim().slice(0, 100),
        email: body.purchaser.email.trim().slice(0, 200),
      },
      recipient: body.recipient
        ? {
            name: body.recipient.name?.trim().slice(0, 100),
            email: body.recipient.email?.trim().slice(0, 200),
            message: body.recipient.message?.trim().slice(0, 300),
          }
        : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    console.error("gift-cards/purchase failed:", err);
    return NextResponse.json({ error: message }, { status: 402 });
  }
}
