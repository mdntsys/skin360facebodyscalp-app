"use client";

import * as React from "react";
import { format, formatISO } from "date-fns";
import { Download, FileText, ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

import { intakeForms, type Client, type IntakeForm } from "@/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IntakeFormPreviewDialog } from "./intake-form-preview";

export function IntakeFormsTab({ client }: { client: Client }) {
  const [forms, setForms] = React.useState<IntakeForm[]>(() =>
    intakeForms
      .filter((f) => f.clientId === client.id)
      .sort(
        (a, b) =>
          new Date(b.uploadedISO).getTime() - new Date(a.uploadedISO).getTime()
      )
  );
  const [preview, setPreview] = React.useState<IntakeForm | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    setForms((prev) => [
      {
        id: `if-local-${Date.now()}`,
        clientId: client.id,
        name: file.name.replace(/\.[^.]+$/, ""),
        uploadedISO: formatISO(new Date(), { representation: "date" }),
        fileType: isPdf ? "PDF" : "JPG",
        sizeKB: Math.max(1, Math.round(file.size / 1024)),
      },
      ...prev,
    ]);
    toast.success("Intake form uploaded", { description: file.name });
    e.target.value = "";
  };

  return (
    <>
      <Card className="border-line bg-white shadow-xs">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-xl font-medium">
              Intake Forms
            </CardTitle>
            <p className="text-xs font-light text-muted-warm">
              Signed forms &amp; consents on file
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload data-icon="inline-start" strokeWidth={1.75} />
            Upload Intake Form
          </Button>
        </CardHeader>
        <CardContent>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFile}
          />
          {forms.length === 0 ? (
            <p className="py-10 text-center text-sm font-light text-muted-warm">
              No forms on file yet — upload {client.firstName}&apos;s intake to
              get started.
            </p>
          ) : (
            <div className="divide-y divide-line/70">
              {forms.map((f) => {
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
                        Uploaded {format(new Date(f.uploadedISO), "MMM d, yyyy")}{" "}
                        · {f.sizeKB.toLocaleString()} KB · {f.fileType}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreview(f)}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          toast.success("Download started", {
                            description: f.name,
                          })
                        }
                      >
                        <Download strokeWidth={1.75} />
                        <span className="sr-only">Download {f.name}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
