"use client";

import * as React from "react";
import { format } from "date-fns";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  clientById,
  clientPackages,
  formatCurrency,
  packageById,
  serviceById,
  servicePackages,
  type ServicePackage,
} from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CreatePackageDialog,
  type PackageFormValues,
} from "./_components/create-package-dialog";

function clientInitials(clientId: string): string {
  const client = clientById.get(clientId);
  return client
    ? `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`
    : "?";
}

export default function PackagesPage() {
  const [offerings, setOfferings] =
    React.useState<ServicePackage[]>(servicePackages);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  function handleCreate(values: PackageFormValues) {
    const service = serviceById.get(values.serviceId);
    setOfferings((prev) => [
      ...prev,
      {
        id: `pkg-local-${Date.now()}`,
        name: values.name,
        serviceIds: [values.serviceId],
        sessions: values.sessions,
        discountPct: values.discountPct,
        fullPrice: values.fullPrice,
        price: values.price,
        description: `${values.sessions} sessions of ${
          service?.name ?? "your chosen service"
        } — ${values.discountPct}% off the individual price.`,
      },
    ]);
    toast.success(`“${values.name}” package created.`);
  }

  return (
    <>
      <PageHeader
        title="Packages"
        subtitle={`${offerings.length} offerings · ${clientPackages.length} client packages`}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus data-icon="inline-start" strokeWidth={1.75} />
            Create Package
          </Button>
        }
      />

      {/* Section 1 — Package offerings */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {offerings.map((pkg) => (
          <Card
            key={pkg.id}
            className="flex flex-col border-line bg-white shadow-xs"
          >
            <CardContent className="flex flex-1 flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl leading-snug text-ink">{pkg.name}</h3>
                <span className="shrink-0 rounded-full border border-gold-200 bg-gold-50 px-2.5 py-0.5 text-[11px] font-normal text-gold-700">
                  {pkg.discountPct}% off
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs tracking-wide text-muted-warm uppercase">
                <Sparkles
                  className="size-3.5 text-gold-600"
                  strokeWidth={1.75}
                />
                {pkg.sessions} sessions
              </p>
              <p className="mt-3 text-sm font-light text-muted-warm">
                {pkg.description}
              </p>
              <div className="mt-auto border-t border-line/70 pt-4">
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-sm font-light text-muted-warm line-through">
                    {formatCurrency(pkg.fullPrice)}
                  </span>
                  <span className="font-heading text-3xl text-gold-700">
                    {formatCurrency(pkg.price)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-light text-muted-warm">
                  per session ≈ {formatCurrency(Math.round(pkg.price / pkg.sessions))}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section 2 — Client packages */}
      <div className="mt-10">
        <h2 className="text-2xl text-ink">Client Packages</h2>
        <p className="mt-1 text-sm font-light text-muted-warm">
          Purchased series and session progress
        </p>

        <Card className="mt-4 border-line bg-white shadow-xs">
          <CardContent className="px-6 py-2">
            <div className="divide-y divide-line/70">
              {clientPackages.map((cp) => {
                const client = clientById.get(cp.clientId);
                const pkg = packageById.get(cp.packageId);
                const total = pkg?.sessions ?? 0;
                const used = Math.min(cp.sessionsUsed, total);
                const remaining = Math.max(0, total - used);
                const pct = total > 0 ? (used / total) * 100 : 0;
                const completed = total > 0 && used >= total;
                return (
                  <div
                    key={cp.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-6"
                  >
                    <div className="flex shrink-0 items-center gap-3 sm:w-56">
                      <Avatar>
                        <AvatarFallback className="bg-gold-50 text-xs text-gold-700">
                          {clientInitials(cp.clientId)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink">
                          {client
                            ? `${client.firstName} ${client.lastName}`
                            : "Unknown client"}
                        </p>
                        <p className="text-xs font-light text-muted-warm">
                          Purchased{" "}
                          {format(new Date(cp.purchasedISO), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-soft">
                        {pkg?.name ?? "Unknown package"}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <Progress
                          value={pct}
                          className={
                            completed
                              ? "h-1.5 flex-1 [&_[data-slot=progress-indicator]]:bg-emerald-500"
                              : "h-1.5 flex-1"
                          }
                        />
                        <span className="shrink-0 text-xs font-light whitespace-nowrap text-muted-warm">
                          {used} of {total} used · {remaining} remaining
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      {completed ? (
                        <StatusBadge status="completed" />
                      ) : (
                        <StatusBadge
                          status="active"
                          className="border-gold-200 bg-gold-50 text-gold-700"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <CreatePackageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
      />
    </>
  );
}
