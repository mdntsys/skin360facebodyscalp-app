import { NextResponse } from "next/server";

import {
  bookingSurfaceEnabled,
  listPublicServices,
} from "@/lib/booking/public-api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await bookingSurfaceEnabled())) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const data = await listPublicServices();
    return NextResponse.json(data);
  } catch (err) {
    console.error("booking/services failed:", err);
    return NextResponse.json(
      { error: "Could not load services" },
      { status: 502 }
    );
  }
}
