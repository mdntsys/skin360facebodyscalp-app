// Structural validation of the replicated GoFormz templates — the DB seed is
// generated from FORM_SEEDS, so this is the gate that keeps every form
// renderable by the filler.
import { describe, expect, it } from "vitest";

import { FORM_SEEDS } from "./form-seeds";

const OPTION_TYPES = new Set(["radio", "checkboxes"]);
const DISPLAY_TYPES = new Set(["note", "statement"]);
const ALL_TYPES = new Set([
  "text", "date", "textarea", "radio", "checkboxes",
  "yesno", "yesno_detail", "note", "statement",
]);

describe("FORM_SEEDS", () => {
  it("replicates all of Carolina's forms (6 GoFormz templates -> 5 app forms)", () => {
    expect(FORM_SEEDS.map((t) => t.id)).toEqual([
      "form-facial",
      "form-body-sculpting",
      "form-headspa",
      "form-lymphatic",
      "form-photo-video-release",
    ]);
  });

  it.each(FORM_SEEDS.map((t) => [t.id, t] as const))(
    "%s is structurally sound",
    (_id, t) => {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.schema.sections.length).toBeGreaterThan(0);
      const keys = new Set<string>();
      for (const section of t.schema.sections) {
        expect(section.fields.length).toBeGreaterThan(0);
        for (const f of section.fields) {
          expect(ALL_TYPES.has(f.type), `${f.key}: unknown type ${f.type}`).toBe(true);
          expect(f.key.length).toBeGreaterThan(0);
          expect(keys.has(f.key), `duplicate key ${f.key}`).toBe(false);
          keys.add(f.key);
          if (OPTION_TYPES.has(f.type)) {
            expect(f.options && f.options.length > 1, `${f.key}: options missing`).toBe(true);
            expect(new Set(f.options).size, `${f.key}: duplicate options`).toBe(f.options!.length);
          }
          if (DISPLAY_TYPES.has(f.type)) {
            expect((f.text ?? "").length, `${f.key}: display text missing`).toBeGreaterThan(0);
          } else {
            expect((f.label ?? "").length, `${f.key}: label missing`).toBeGreaterThan(0);
          }
        }
      }
    }
  );

  it("every consent-bearing form ends with signable content", () => {
    for (const t of FORM_SEEDS) {
      const fields = t.schema.sections.flatMap((s) => s.fields);
      expect(
        fields.some((f) => f.type === "statement"),
        `${t.id} has no statement/consent text`
      ).toBe(true);
    }
  });
});
