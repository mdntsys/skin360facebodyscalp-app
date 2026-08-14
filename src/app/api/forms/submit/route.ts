import { NextResponse } from "next/server";

import { FormLinkError, submitPublicForm } from "@/lib/forms/public-form";

export const dynamic = "force-dynamic";

interface SubmitBody {
  token?: string;
  data?: unknown;
  signatureDataUrl?: string;
}

export async function POST(request: Request) {
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { token, signatureDataUrl } = body;
  const data =
    body.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : {};
  // Only a real inline image is a signature — anything else (e.g. an external
  // URL that would beacon from the admin's browser) is rejected here and
  // again in SQL.
  const SIGNATURE_RE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;
  if (!token || !signatureDataUrl || !SIGNATURE_RE.test(signatureDataUrl)) {
    return NextResponse.json(
      { error: "Please sign the form before submitting." },
      { status: 400 }
    );
  }

  try {
    await submitPublicForm({ token, data, signatureDataUrl });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof FormLinkError) {
      return NextResponse.json({ error: err.message }, { status: 410 });
    }
    console.error("forms/submit failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
