"use client";

// Pure form renderer shared by the in-salon filler and the public
// send-ahead page: takes a template's sections, the answers so far, and an
// onChange — no data-layer hooks, so it works outside the admin shell.
// Answer shapes per field type are documented on FormSubmission in
// src/data/types.ts.

import * as React from "react";

import type { FormField, FormSection } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

const INPUT_CLASSES =
  "h-11 rounded-full border-line bg-ivory/50 px-4 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50";
const TEXTAREA_CLASSES =
  "min-h-20 rounded-xl border-line bg-ivory/50 px-4 py-3 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50";
const LABEL_CLASSES = "text-xs tracking-wide uppercase text-muted-warm";

interface YesNoDetail {
  answer: "Yes" | "No" | "";
  detail: string;
}

interface FormFieldsProps {
  sections: FormSection[];
  answers: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function FormFields({ sections, answers, onChange }: FormFieldsProps) {
  function renderField(field: FormField) {
    const key = field.key;
    const set = (value: unknown) => onChange(key, value);
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
              onChange={(e) => set(e.target.value)}
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
              onChange={(e) => set(e.target.value)}
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
              onValueChange={set}
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
              onValueChange={set}
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
                onValueChange={(answer) => set({ ...v, answer })}
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
                onChange={(e) => set({ ...v, detail: e.target.value })}
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
    <>
      {sections.map((section, i) => (
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
    </>
  );
}
