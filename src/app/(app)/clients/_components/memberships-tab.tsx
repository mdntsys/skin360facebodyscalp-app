"use client";

import { format } from "date-fns";
import { Check, Crown, Gem } from "lucide-react";

import { formatCurrency, useData, type Client } from "@/data";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "./empty-state";

export function MembershipsTab({ client }: { client: Client }) {
  const { clientPackages, members, packageById, planById } = useData();
  const membership = members.find((m) => m.clientId === client.id);
  const plan = membership ? planById.get(membership.planId) : undefined;
  const pkgs = clientPackages
    .filter((p) => p.clientId === client.id)
    .sort(
      (a, b) =>
        new Date(b.purchasedISO).getTime() - new Date(a.purchasedISO).getTime()
    );

  if (!(membership && plan) && pkgs.length === 0) {
    return (
      <EmptyState
        icon={Gem}
        title="No memberships or packages"
        description={`When ${client.firstName} joins a plan or purchases a series, it will live here.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {membership && plan && (
        <Card className="border-line bg-white shadow-xs">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-50">
                <Crown className="size-5 text-gold-600" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="font-heading text-2xl font-medium">
                  {plan.name}
                </CardTitle>
                <p className="text-sm font-light text-muted-warm">
                  <span className="font-normal text-ink">
                    {formatCurrency(plan.monthlyPrice)}
                  </span>{" "}
                  / month · {plan.billingCycle} billing
                </p>
              </div>
            </div>
            <StatusBadge status={membership.status} />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-cream/70 px-4 py-3">
                <p className="text-[10px] font-normal tracking-[0.14em] text-muted-warm uppercase">
                  Member Since
                </p>
                <p className="mt-0.5 text-sm text-ink">
                  {format(new Date(membership.startedISO), "MMMM d, yyyy")}
                </p>
              </div>
              <div className="rounded-2xl bg-cream/70 px-4 py-3">
                <p className="text-[10px] font-normal tracking-[0.14em] text-muted-warm uppercase">
                  Renews
                </p>
                <p className="mt-0.5 text-sm text-ink">
                  {format(new Date(membership.renewsISO), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <p className="text-[10px] font-normal tracking-[0.14em] text-muted-warm uppercase">
                Membership Perks
              </p>
              <ul className="mt-2.5 space-y-2">
                {plan.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2.5 text-sm font-light text-ink-soft"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-gold-600"
                      strokeWidth={1.75}
                    />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {pkgs.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {pkgs.map((cp) => {
            const pkg = packageById.get(cp.packageId);
            if (!pkg) return null;
            const remaining = Math.max(0, pkg.sessions - cp.sessionsUsed);
            const done = remaining === 0;
            const pct = Math.min(100, (cp.sessionsUsed / pkg.sessions) * 100);
            return (
              <Card key={cp.id} className="border-line bg-white shadow-xs">
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-heading text-lg font-medium">
                      {pkg.name}
                    </CardTitle>
                    <p className="text-xs font-light text-muted-warm">
                      Purchased{" "}
                      {format(new Date(cp.purchasedISO), "MMM d, yyyy")} ·{" "}
                      {formatCurrency(pkg.price, { cents: true })}
                    </p>
                  </div>
                  {done && (
                    <StatusBadge status="completed" className="shrink-0" />
                  )}
                </CardHeader>
                <CardContent>
                  <Progress
                    value={pct}
                    className="h-2 rounded-full bg-gold-100"
                  />
                  <p className="mt-2.5 text-xs font-light text-muted-warm">
                    <span className="font-normal text-ink">
                      {cp.sessionsUsed} of {pkg.sessions}
                    </span>{" "}
                    sessions used ·{" "}
                    {done ? "series complete" : `${remaining} remaining`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
