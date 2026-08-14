// Anon-safe surface for the send-ahead form flow: the fill page reads via
// public_form_request (first name + template only), submits via
// public_submit_form (single-use, guarded in SQL). Mirrors the public
// booking layer's shape.

import { createClient } from "@supabase/supabase-js";

import type { FormTemplate } from "../../data/types";

/** Thrown for anything the filler should see as a friendly message. */
export class FormLinkError extends Error {}

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export type PublicFormRequest =
  | { status: "pending"; firstName: string; template: Pick<FormTemplate, "id" | "name" | "category" | "schema"> }
  | { status: "completed" }
  | { status: "invalid" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPublicFormRequest(
  token: string
): Promise<PublicFormRequest> {
  if (!UUID_RE.test(token)) return { status: "invalid" };
  const { data, error } = await supabase().rpc("public_form_request", {
    p_token: token,
  });
  if (error) throw new Error(`public_form_request failed: ${error.message}`);
  if (!data) return { status: "invalid" };
  return data as PublicFormRequest;
}

export async function submitPublicForm(args: {
  token: string;
  data: Record<string, unknown>;
  signatureDataUrl: string;
}): Promise<void> {
  if (!UUID_RE.test(args.token)) {
    throw new FormLinkError("This form link is no longer valid.");
  }
  const { error } = await supabase().rpc("public_submit_form", {
    p_token: args.token,
    p_data: args.data,
    p_signature: args.signatureDataUrl,
  });
  if (error) {
    if (error.message.includes("FORM_EXPIRED")) {
      throw new FormLinkError(
        "This form link is no longer valid — it may have already been submitted."
      );
    }
    if (error.message.includes("FORM_INVALID")) {
      throw new FormLinkError("Please sign the form before submitting.");
    }
    throw new Error(`public_submit_form failed: ${error.message}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formRequestEmailHtml(args: {
  firstName: string;
  formName: string;
  link: string;
}): string {
  const firstName = escapeHtml(args.firstName);
  const formName = escapeHtml(args.formName);
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;background:#fdfbf6;color:#2b2723">
    <p style="text-align:center;letter-spacing:4px;font-size:11px;color:#a67c34">SKIN 360 · FACE BODY SCALP</p>
    <h1 style="text-align:center;font-weight:500">A quick form before your visit${firstName ? `, ${firstName}` : ""}</h1>
    <p style="text-align:center;font-size:14px;color:#4b443c">
      To save you time at the salon, please fill out your
      <strong>${formName}</strong> ahead of your appointment —
      it only takes a few minutes and you can sign right on your phone.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${args.link}"
         style="display:inline-block;background-color:#a67c34;background:linear-gradient(120deg,#a67c34,#cca857);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:15px">
        Fill Out My Form
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#837a6d">
      If the button doesn't work, copy this link:<br/>
      <a href="${args.link}" style="color:#a67c34;word-break:break-all">${args.link}</a>
    </p>
    <p style="text-align:center;font-size:12px;color:#837a6d">
      Skin 360, 24510 Town Center Dr Suite 170, Valencia CA<br/>
      Questions? Just reply to this email or call us.
    </p>
  </div>`;
}
