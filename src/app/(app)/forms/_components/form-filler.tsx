"use client";

// In-salon fill-and-sign: renders one template for a picked client via the
// shared FormFields renderer, captures the signature, saves through the
// provider. The public send-ahead page reuses the same renderer at /f/[token].

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useData, type Client, type FormTemplate } from "@/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormFields } from "@/components/forms/form-fields";
import { SignaturePad } from "@/components/forms/signature-pad";

interface FormFillerProps {
  template: FormTemplate;
  client: Client;
  onDone: () => void;
  onCancel: () => void;
}

export function FormFiller({
  template,
  client,
  onDone,
  onCancel,
}: FormFillerProps) {
  const { submitForm, clientName } = useData();
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [signature, setSignature] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signature || submitting) return;
    setSubmitting(true);
    try {
      await submitForm({
        templateId: template.id,
        clientId: client.id,
        data: answers,
        signatureDataUrl: signature,
      });
      toast.success(`${template.name} signed for ${clientName(client.id)}.`);
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save the form."
      );
      setSubmitting(false);
    }
  }

  return (
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
          <p className="text-sm font-light text-ink-soft">
            {clientName(client.id)} · {format(new Date(), "MMMM d, yyyy")}
          </p>
          <SignaturePad onChange={setSignature} />
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!signature || submitting}>
              {submitting ? "Saving…" : "Save Signed Form"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
