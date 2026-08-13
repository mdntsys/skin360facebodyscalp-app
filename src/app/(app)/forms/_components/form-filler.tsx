"use client";

// Renders one form template (sections -> fields) for a client to fill and
// sign at the desk or on a tablet. Answer shapes per field type are documented
// on FormSubmission in src/data/types.ts.

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  useData,
  type Client,
  type FormField,
  type FormTemplate,
} from "@/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "./signature-pad";

const INPUT_CLASSES =
  "h-11 rounded-full border-line bg-ivory/50 px-4 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50";
const TEXTAREA_CLASSES =
  "min-h-20 rounded-xl border-line bg-ivory/50 px-4 py-3 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50";
const LABEL_CLASSES = "text-xs tracking-wide uppercase text-muted-warm";

interface YesNoDetail {
  answer: "Yes" | "No" | "";
  detail: string;
}

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

  const set = (key: string, value: unknown) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

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

  function renderField(field: FormField) {
    const key = field.key;
    switch (field.type) {
      case "note":
        return (
          <p key={key} className="text-xs font-light text-muted-warm italic">
            {field.text}
          </p>
        );
      case "statement":
        return (
          <div
            key={key}
            className="rounded-2xl border border-line bg-ivory/50 px-5 py-4 text-sm font-light whitespace-pre-line text-ink-soft"
          >
            {field.text}
          </div>
        );
      case "text":
      case "date":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={`f-${key}`} className={LABEL_CLASSES}>
              {field.label}
            </Label>
            <Input
              id={`f-${key}`}
              type={field.type === "date" ? "date" : "text"}
              value={(answers[key] as string) ?? ""}
              onChange={(e) => set(key, e.target.value)}
              className={INPUT_CLASSES}
            />
          </div>
        );
      case "textarea":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={`f-${key}`} className={LABEL_CLASSES}>
              {field.label}
            </Label>
            <Textarea
              id={`f-${key}`}
              value={(answers[key] as string) ?? ""}
              onChange={(e) => set(key, e.target.value)}
              className={TEXTAREA_CLASSES}
            />
          </div>
        );
      case "radio":
        return (
          <div key={key} className="space-y-2">
            <Label className={LABEL_CLASSES}>{field.label}</Label>
            <RadioGroup
              value={(answers[key] as string) ?? ""}
              onValueChange={(v) => set(key, v)}
              className="flex flex-wrap gap-x-6 gap-y-2"
            >
              {(field.options ?? []).map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 text-sm font-light text-ink-soft"
                >
                  <RadioGroupItem value={opt} />
                  {opt}
                </label>
              ))}
            </RadioGroup>
          </div>
        );
      case "checkboxes": {
        const selected = (answers[key] as string[]) ?? [];
        return (
          <div key={key} className="space-y-2">
            <Label className={LABEL_CLASSES}>{field.label}</Label>
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {(field.options ?? []).map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 text-sm font-light text-ink-soft"
                >
                  <Checkbox
                    checked={selected.includes(opt)}
                    onCheckedChange={(checked) =>
                      set(
                        key,
                        checked
                          ? [...selected, opt]
                          : selected.filter((o) => o !== opt)
                      )
                    }
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        );
      }
      case "yesno":
        return (
          <div
            key={key}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
          >
            <Label className="max-w-xl text-sm font-light text-ink-soft">
              {field.label}
            </Label>
            <RadioGroup
              value={(answers[key] as string) ?? ""}
              onValueChange={(v) => set(key, v)}
              className="flex shrink-0 gap-6"
            >
              {["Yes", "No"].map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 text-sm font-light text-ink-soft"
                >
                  <RadioGroupItem value={opt} />
                  {opt}
                </label>
              ))}
            </RadioGroup>
          </div>
        );
      case "yesno_detail": {
        const v = (answers[key] as YesNoDetail) ?? { answer: "", detail: "" };
        return (
          <div key={key} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <Label className="max-w-xl text-sm font-light text-ink-soft">
                {field.label}
              </Label>
              <RadioGroup
                value={v.answer}
                onValueChange={(answer) => set(key, { ...v, answer })}
                className="flex shrink-0 gap-6"
              >
                {["Yes", "No"].map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-sm font-light text-ink-soft"
                  >
                    <RadioGroupItem value={opt} />
                    {opt}
                  </label>
                ))}
              </RadioGroup>
            </div>
            {v.answer === "Yes" && (
              <Input
                value={v.detail}
                onChange={(e) => set(key, { ...v, detail: e.target.value })}
                placeholder="Please provide details"
                className={INPUT_CLASSES}
              />
            )}
          </div>
        );
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {template.schema.sections.map((section, i) => (
        <Card key={i} className="border-line bg-white shadow-xs">
          <CardContent className="space-y-5 px-6 py-5">
            {section.title && (
              <div className="flex items-center gap-4">
                <h3 className="shrink-0 text-lg text-ink">{section.title}</h3>
                <div className="h-px flex-1 bg-line" />
              </div>
            )}
            {section.fields.map((field) =>
              field.half ? (
                <div key={field.key} className="sm:max-w-[calc(50%-0.625rem)]">
                  {renderField(field)}
                </div>
              ) : (
                renderField(field)
              )
            )}
          </CardContent>
        </Card>
      ))}

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
