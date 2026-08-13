"use client";

// Forms — Carolina's GoFormz templates, replicated in-app. Pick a form, pick
// the client, fill and sign on the desk computer or a tablet; the signed form
// lands on the client's profile. Deep link: /forms?client=<id> preselects.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, FileSignature } from "lucide-react";

import { useData, type Client, type FormTemplate } from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FormFiller } from "./_components/form-filler";

const TRIGGER_CLASSES =
  "h-11 w-full rounded-full border-line bg-ivory/50 px-4 text-sm font-light data-[size=default]:h-11 focus-visible:border-gold-300 focus-visible:ring-gold-200/50";
const LABEL_CLASSES = "text-xs tracking-wide uppercase text-muted-warm";

const CATEGORY_LABEL: Record<string, string> = {
  intake: "Intake & Consent",
  consent: "Consent",
  release: "Release",
};

function FormsPageInner() {
  const { formTemplates, formSubmissions, clients, clientName } = useData();
  const searchParams = useSearchParams();

  const [clientId, setClientId] = React.useState(
    () => searchParams.get("client") ?? ""
  );
  const [active, setActive] = React.useState<FormTemplate | null>(null);

  const templates = formTemplates.filter((t) => t.active);
  const sortedClients = React.useMemo(
    () =>
      [...clients].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        )
      ),
    [clients]
  );
  const client: Client | undefined = clients.find((c) => c.id === clientId);

  if (active && client) {
    return (
      <>
        <PageHeader
          title={active.name}
          subtitle={`${clientName(client.id)} — fill out together, then sign at the bottom`}
        />
        <div className="mt-6">
          <FormFiller
            template={active}
            client={client}
            onDone={() => setActive(null)}
            onCancel={() => setActive(null)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Forms"
        subtitle="Intake, consent, and release forms — filled and signed right here, saved to the client's profile"
      />

      <Card className="mt-6 border-line bg-white shadow-xs">
        <CardContent className="px-6 py-5">
          <div className="max-w-md space-y-2">
            <Label htmlFor="forms-client" className={LABEL_CLASSES}>
              Who is filling out a form?
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="forms-client" className={TRIGGER_CLASSES}>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent position="popper">
                {sortedClients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-sm">
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs font-light text-muted-warm">
              New client? Add them on the Clients page first, then come back
              here.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => {
          const signedCount = formSubmissions.filter(
            (s) => s.templateId === t.id
          ).length;
          const signedByClient =
            client &&
            formSubmissions.some(
              (s) => s.templateId === t.id && s.clientId === client.id
            );
          return (
            <Card
              key={t.id}
              className="flex flex-col border-line bg-white shadow-xs"
            >
              <CardContent className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl leading-snug text-ink">{t.name}</h3>
                  <span className="shrink-0 rounded-full border border-gold-200 bg-gold-50 px-2.5 py-0.5 text-[11px] font-normal text-gold-700">
                    {CATEGORY_LABEL[t.category] ?? t.category}
                  </span>
                </div>
                <p className="mt-2 text-sm font-light text-muted-warm">
                  {t.description}
                </p>
                <div className="mt-auto space-y-2 pt-4">
                  {signedByClient && (
                    <p className="text-xs text-emerald-700">
                      ✓ {client?.firstName} has already signed this one
                    </p>
                  )}
                  <Button
                    className="w-full"
                    disabled={!client}
                    onClick={() => setActive(t)}
                  >
                    <FileSignature data-icon="inline-start" strokeWidth={1.75} />
                    {client ? "Fill Out & Sign" : "Pick a client first"}
                  </Button>
                  {signedCount > 0 && (
                    <p className="text-center text-xs font-light text-muted-warm">
                      {signedCount} signed on file
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {templates.length === 0 && (
          <Card className="border-line bg-white shadow-xs sm:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-gold-50">
                <ClipboardList
                  className="size-5 text-gold-600"
                  strokeWidth={1.75}
                />
              </div>
              <h3 className="mt-4 text-2xl text-ink">No form templates yet</h3>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

export default function FormsPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full rounded-3xl" />}>
      <FormsPageInner />
    </React.Suspense>
  );
}
