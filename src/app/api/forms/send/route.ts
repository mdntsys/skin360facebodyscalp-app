import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { formRequestEmailHtml } from "@/lib/forms/public-form";

export const dynamic = "force-dynamic";

interface SendBody {
  clientId?: string;
  templateId?: string;
  /** "email" sends the link to the client; "link" just returns it to copy. */
  deliver?: "email" | "link";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { clientId, templateId } = body;
  const deliver = body.deliver === "email" ? "email" : "link";
  if (!clientId || !templateId) {
    return NextResponse.json(
      { error: "Missing client or form" },
      { status: 400 }
    );
  }

  // RLS applies: these queries run as the signed-in app user.
  const [{ data: client }, { data: template }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, email")
      .eq("id", clientId)
      .single(),
    supabase
      .from("form_templates")
      .select("id, name")
      .eq("id", templateId)
      .eq("active", true)
      .single(),
  ]);
  if (!client || !template) {
    return NextResponse.json(
      { error: "Unknown client or form" },
      { status: 404 }
    );
  }
  if (deliver === "email" && !client.email) {
    return NextResponse.json(
      { error: "This client has no email on file — copy the link instead." },
      { status: 400 }
    );
  }

  const { data: row, error } = await supabase
    .from("form_requests")
    .insert({ template_id: templateId, client_id: clientId })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Never derive an emailed link's origin from request headers in production —
  // a spoofed Host would put a phishing domain in a real client email.
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_ENV === "production"
      ? "https://app.skin360facebodyscalp.com"
      : new URL(request.url).origin);
  const link = `${origin}/f/${row.id}`;

  let emailed = false;
  if (deliver === "email") {
    const result = await sendEmail({
      to: client.email,
      subject: `Your ${template.name} — Skin 360`,
      html: formRequestEmailHtml({
        firstName: client.first_name ?? "",
        formName: template.name,
        link,
      }),
    });
    emailed = result.sent;
    if (!emailed) {
      return NextResponse.json(
        {
          error:
            "The email couldn't be sent right now — the link still works, copy it instead.",
          request: row,
          link,
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ request: row, link, emailed });
}
