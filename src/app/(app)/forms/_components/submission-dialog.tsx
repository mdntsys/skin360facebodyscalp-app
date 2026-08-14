"use client";

// Read-only view of a signed form submission — the template schema drives the
// layout, the stored answers fill it in.

import * as React from "react";
import { format } from "date-fns";
import { Check } from "lucide-react";

import { useData, type FormField, type FormSubmission } from "@/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface YesNoDetail {
  answer?: string;
  detail?: string;
}

function AnswerLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1.5">
      <p className="text-[10px] font-normal tracking-[0.16em] text-muted-warm uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-ink">{value || "—"}</p>
    </div>
  );
}

function renderAnswer(field: FormField, raw: unknown) {
  switch (field.type) {
    case "note":
      return null;
    case "statement":
      return (
        <div
          key={field.key}
          className="my-2 rounded-2xl border border-line bg-ivory/50 px-4 py-3 text-xs font-light whitespace-pre-line text-muted-warm"
        >
          {field.text}
        </div>
      );
    case "checkboxes": {
      const selected = Array.isArray(raw) ? (raw as string[]) : [];
      return (
        <div key={field.key} className="py-1.5">
          <p className="text-[10px] font-normal tracking-[0.16em] text-muted-warm uppercase">
            {field.label}
          </p>
          {selected.length === 0 ? (
            <p className="mt-0.5 text-sm font-light text-muted-warm">
              None selected
            </p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {selected.map((opt) => (
                <span
                  key={opt}
                  className="inline-flex items-center gap-1 rounded-full border border-gold-200 bg-gold-50 px-2 py-0.5 text-xs text-gold-700"
                >
                  <Check className="size-3" strokeWidth={2} />
                  {opt}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }
    case "yesno_detail": {
      const v = (raw ?? {}) as YesNoDetail;
      const text = v.answer
        ? v.answer + (v.detail ? ` — ${v.detail}` : "")
        : "";
      return <AnswerLine key={field.key} label={field.label ?? ""} value={text} />;
    }
    default:
      return (
        <AnswerLine
          key={field.key}
          label={field.label ?? ""}
          value={typeof raw === "string" ? raw : ""}
        />
      );
  }
}

export function SubmissionDialog({
  submission,
  onOpenChange,
}: {
  submission: FormSubmission | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { formTemplates, clientName } = useData();
  // Keep content rendered during the close animation.
  const lastRef = React.useRef<FormSubmission | null>(null);
  if (submission) lastRef.current = submission;
  const current = submission ?? lastRef.current;
  const template = formTemplates.find((t) => t.id === current?.templateId);

  return (
    <Dialog open={submission !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl bg-white p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-line bg-ivory/70 px-6 pt-7 pb-5">
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            {template?.name ?? "Signed Form"}
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            {current ? clientName(current.clientId) : ""} · signed{" "}
            {current ? format(new Date(current.signedISO), "MMMM d, yyyy · h:mm a") : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5">
          {current && Object.keys(current.data).length === 0 && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No answers were filled in on this form — only the signature was
              captured. You may want to go over it with the client.
            </div>
          )}
          {template?.schema.sections.map((section, i) => (
            <div key={i} className="mb-5">
              {section.title && (
                <div className="mb-2 flex items-center gap-4">
                  <h3 className="shrink-0 text-base text-ink">
                    {section.title}
                  </h3>
                  <div className="h-px flex-1 bg-line" />
                </div>
              )}
              {section.fields.map((f) => renderAnswer(f, current?.data[f.key]))}
            </div>
          ))}
          {/* Answers whose fields were later removed from the template —
              never silently hide what a client wrote on a medical form. */}
          {(() => {
            if (!current || !template) return null;
            const known = new Set(
              template.schema.sections.flatMap((s) => s.fields.map((f) => f.key))
            );
            const orphaned = Object.entries(current.data).filter(
              ([k, v]) => !known.has(k) && v != null && v !== ""
            );
            if (orphaned.length === 0) return null;
            return (
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-4">
                  <h3 className="shrink-0 text-base text-ink">
                    Other answers (from an earlier version of this form)
                  </h3>
                  <div className="h-px flex-1 bg-line" />
                </div>
                {orphaned.map(([k, v]) => (
                  <AnswerLine
                    key={k}
                    label={k.replace(/_/g, " ")}
                    value={
                      typeof v === "string" ? v : JSON.stringify(v)
                    }
                  />
                ))}
              </div>
            );
          })()}
          {current?.signatureDataUrl?.startsWith("data:image/") && (
            <div className="mt-6 border-t border-line pt-4">
              <p className="text-[10px] font-normal tracking-[0.16em] text-muted-warm uppercase">
                Client signature
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.signatureDataUrl}
                alt="Client signature"
                className="mt-2 h-24 rounded-xl border border-line bg-white"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
