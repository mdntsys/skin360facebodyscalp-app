"use client";

import { format } from "date-fns";
import { Check } from "lucide-react";

import { locationById, type Client, type IntakeForm } from "@/data";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-9 mb-5 flex items-center gap-4">
      <h3 className="shrink-0 text-lg text-ink">{children}</h3>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-normal tracking-[0.16em] text-muted-warm uppercase">
        {label}
      </p>
      <p className="mt-1 border-b border-line pb-1.5 text-sm text-ink">
        {value}
      </p>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  detail,
}: {
  label: string;
  checked: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
          checked ? "border-gold-400 bg-gold-50" : "border-line bg-white"
        )}
      >
        {checked && (
          <Check className="size-3 text-gold-600" strokeWidth={2.25} />
        )}
      </span>
      <span className="text-sm font-light text-ink-soft">{label}</span>
      {detail && (
        <span className="ml-auto shrink-0 text-xs font-light text-muted-warm">
          {detail}
        </span>
      )}
    </div>
  );
}

export function IntakeFormPreviewDialog({
  form,
  client,
  onOpenChange,
}: {
  form: IntakeForm | null;
  client: Client;
  onOpenChange: (open: boolean) => void;
}) {
  const home = locationById.get(client.homeLocation);
  const skinHistory = [
    {
      label: "Sensitive or reactive skin",
      checked: client.tags.includes("Sensitive Skin"),
    },
    { label: "Currently using retinol or exfoliating acids", checked: true },
    {
      label: "Cosmetic procedure within the past 6 months",
      checked: client.tags.includes("Post-Op"),
    },
    { label: "Known allergies", checked: false, detail: "None noted" },
    { label: "Pregnant or nursing", checked: false },
    { label: "Prone to cold sores", checked: false },
  ];

  return (
    <Dialog open={!!form} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border border-line bg-white p-0 shadow-sm sm:max-w-2xl">
        <DialogTitle className="sr-only">
          {form?.name ?? "Intake form"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Preview of the signed intake form on file.
        </DialogDescription>
        {form && (
          <div className="max-h-[75vh] overflow-y-auto p-6 sm:p-10">
            {/* Letterhead */}
            <div className="text-center">
              <p className="font-heading text-3xl font-medium tracking-wide text-ink">
                Skin 360
              </p>
              <p className="mt-1 text-[10px] font-normal tracking-[0.32em] text-gold-600 uppercase">
                Face · Body · Scalp
              </p>
              <p className="mt-3 text-xs font-light text-muted-warm">
                {form.name}
              </p>
              <div className="gold-rule mt-5" />
            </div>

            {/* Personal Information */}
            <SectionHeading>Personal Information</SectionHeading>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Field
                label="Full Name"
                value={`${client.firstName} ${client.lastName}`}
              />
              <Field label="Date of Birth" value={client.birthday ?? "—"} />
              <Field label="Phone" value={client.phone || "—"} />
              <Field label="Email" value={client.email || "—"} />
              <Field label="Preferred Location" value={home?.name ?? "—"} />
              <Field label="Emergency Contact" value="On file" />
            </div>

            {/* Skin History */}
            <SectionHeading>Skin History</SectionHeading>
            <div className="divide-y divide-line/60">
              {skinHistory.map((row) => (
                <CheckRow key={row.label} {...row} />
              ))}
            </div>

            {/* Consent & Signature */}
            <SectionHeading>Consent &amp; Signature</SectionHeading>
            <p className="text-xs leading-relaxed font-light text-muted-warm">
              I confirm that the information provided above is accurate and
              complete, and I consent to receive esthetic treatments at Skin
              360. I understand that results vary by individual, and I agree to
              inform my esthetician of any changes to my health or skin history
              before each visit.
            </p>
            <div className="mt-9 grid gap-8 sm:grid-cols-[1.6fr_1fr]">
              <div>
                <p className="font-heading text-3xl font-medium text-ink italic">
                  {client.firstName} {client.lastName}
                </p>
                <div className="mt-1 border-t border-line pt-1.5">
                  <p className="text-[10px] tracking-[0.16em] text-muted-warm uppercase">
                    Client Signature
                  </p>
                </div>
              </div>
              <div className="self-end">
                <p className="pb-1 text-sm text-ink">
                  {format(new Date(form.uploadedISO), "MMMM d, yyyy")}
                </p>
                <div className="border-t border-line pt-1.5">
                  <p className="text-[10px] tracking-[0.16em] text-muted-warm uppercase">
                    Date
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-10 text-center text-[10px] font-light tracking-wide text-muted-warm">
              Skin 360 · Toluca Lake &amp; Valencia · (818) 555-0360
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
