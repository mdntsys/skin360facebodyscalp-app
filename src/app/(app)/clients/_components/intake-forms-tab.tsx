"use client";

import * as React from "react";
import { format } from "date-fns";
import { FileText, ImageIcon } from "lucide-react";

import { useData, type Client, type IntakeForm } from "@/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { IntakeFormPreviewDialog } from "./intake-form-preview";

export function IntakeFormsTab({ client }: { client: Client }) {
  const { intakeForms } = useData();
  const [preview, setPreview] = React.useState<IntakeForm | null>(null);

  const forms = intakeForms
    .filter((f) => f.clientId === client.id)
    .sort(
      (a, b) =>
        new Date(b.uploadedISO).getTime() - new Date(a.uploadedISO).getTime()
    );

  if (forms.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No intake forms on file"
        description={`Intake form uploads arrive with document storage in a later phase — ${client.firstName}'s signed forms and consents will live here.`}
      />
    );
  }

  return (
    <>
      <Card className="border-line bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-medium">
            Intake Forms
          </CardTitle>
          <p className="text-xs font-light text-muted-warm">
            Signed forms &amp; consents on file
          </p>
        </CardHeader>
        <CardContent>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setPreview(f)}
                  >
                    Preview
                  </Button>
                </div>
              );
            })}
          </div>
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
