"use client";

// Everything on file for this client: digitally signed forms (from /forms)
// and uploaded scans/photos of paper forms (Supabase Storage).

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  FileSignature,
  FileText,
  ImageIcon,
  Plus,
  Upload,
} from "lucide-react";

import {
  useData,
  type Client,
  type FormSubmission,
  type IntakeForm,
} from "@/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubmissionDialog } from "../../forms/_components/submission-dialog";
import { IntakeFormPreviewDialog } from "./intake-form-preview";

export function IntakeFormsTab({ client }: { client: Client }) {
  const { intakeForms, formSubmissions, formTemplates, uploadIntakeFile, intakeFileUrl } =
    useData();
  const [preview, setPreview] = React.useState<IntakeForm | null>(null);
  const [viewing, setViewing] = React.useState<FormSubmission | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const submissions = formSubmissions.filter((s) => s.clientId === client.id);
  const files = intakeForms
    .filter((f) => f.clientId === client.id)
    .sort(
      (a, b) =>
        new Date(b.uploadedISO).getTime() - new Date(a.uploadedISO).getTime()
    );

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await uploadIntakeFile(client.id, file);
      toast.success(`${file.name} saved to ${client.firstName}'s file.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't upload the file."
      );
    } finally {
      setUploading(false);
    }
  }

  async function openFile(f: IntakeForm) {
    if (!f.filePath) {
      setPreview(f);
      return;
    }
    try {
      const url = await intakeFileUrl(f.filePath);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't open the file."
      );
    }
  }

  return (
    <>
      <Card className="border-line bg-white shadow-xs">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-xl font-medium">
              Intake Forms
            </CardTitle>
            <p className="mt-1 text-xs font-light text-muted-warm">
              Signed forms &amp; consents on file
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/forms?client=${client.id}`}>
                <Plus data-icon="inline-start" strokeWidth={1.75} />
                New Form
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload data-icon="inline-start" strokeWidth={1.75} />
              {uploading ? "Uploading…" : "Upload Scan"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic,image/*,application/pdf"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 && files.length === 0 ? (
            <p className="py-8 text-center text-sm font-light text-muted-warm">
              Nothing on file yet — fill out a form together on the Forms page,
              or upload a photo of a signed paper form.
            </p>
          ) : (
            <div className="divide-y divide-line/70">
              {submissions.map((s) => {
                const template = formTemplates.find(
                  (t) => t.id === s.templateId
                );
                return (
                  <div key={s.id} className="flex items-center gap-3.5 py-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-50">
                      <FileSignature
                        className="size-[18px] text-gold-600"
                        strokeWidth={1.75}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">
                        {template?.name ?? "Signed form"}
                      </p>
                      <p className="text-xs font-light text-muted-warm">
                        Signed digitally ·{" "}
                        {format(new Date(s.signedISO), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setViewing(s)}
                    >
                      View
                    </Button>
                  </div>
                );
              })}
              {files.map((f) => {
                const Icon = f.fileType === "PDF" ? FileText : ImageIcon;
                return (
                  <div key={f.id} className="flex items-center gap-3.5 py-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-50">
                      <Icon
                        className="size-[18px] text-gold-600"
                        strokeWidth={1.75}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{f.name}</p>
                      <p className="text-xs font-light text-muted-warm">
                        Uploaded{" "}
                        {format(new Date(f.uploadedISO), "MMM d, yyyy")} ·{" "}
                        {f.sizeKB.toLocaleString()} KB · {f.fileType}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => openFile(f)}
                    >
                      {f.filePath ? "Open" : "Preview"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SubmissionDialog
        submission={viewing}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      />
      <IntakeFormPreviewDialog
        form={preview}
        client={client}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />
    </>
  );
}
