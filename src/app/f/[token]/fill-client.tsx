"use client";

// Client half of the public send-ahead page — shared FormFields renderer +
// signature pad, submitting through /api/forms/submit.

import * as React from "react";

import type { FormTemplate } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormFields } from "@/components/forms/form-fields";
import { SignaturePad } from "@/components/forms/signature-pad";

interface FillClientProps {
  token: string;
  firstName: string;
  template: Pick<FormTemplate, "id" | "name" | "category" | "schema">;
}

export function FillClient({ token, firstName, template }: FillClientProps) {
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [signature, setSignature] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signature || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          data: answers,
          signatureDataUrl: signature,
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Something went wrong.");
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-xs tracking-[0.3em] text-gold-600 uppercase">
          Skin 360 · Face Body Scalp
        </p>
        <h1 className="mt-6 font-heading text-3xl text-ink">
          Thank you{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="mt-4 text-sm font-light text-muted-warm">
          Your {template.name} is signed and on file. Nothing else to bring —
          we can&apos;t wait to see you.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-xs tracking-[0.3em] text-gold-600 uppercase">
          Skin 360 · Face Body Scalp
        </p>
        <h1 className="mt-4 font-heading text-3xl text-ink">
          {template.name}
        </h1>
        <p className="mt-2 text-sm font-light text-muted-warm">
          {firstName ? `Hi ${firstName} — ` : ""}please fill this out before
          your visit and sign at the bottom. It only takes a few minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormFields
          sections={template.schema.sections}
          answers={answers}
          onChange={(key, value) =>
            setAnswers((prev) => ({ ...prev, [key]: value }))
          }
        />

        <Card className="border-line bg-white shadow-xs">
          <CardContent className="space-y-4 px-6 py-5">
            <div className="flex items-center gap-4">
              <h3 className="shrink-0 text-lg text-ink">Signature</h3>
              <div className="h-px flex-1 bg-line" />
            </div>
            <SignaturePad onChange={setSignature} />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={!signature || submitting}
            >
              {submitting ? "Sending…" : "Submit Signed Form"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
