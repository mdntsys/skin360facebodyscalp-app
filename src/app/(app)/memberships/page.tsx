"use client";

import * as React from "react";
import { format } from "date-fns";
import { Check, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import {
  clientById,
  formatCurrency,
  members,
  membershipPlans,
  planById,
  type MemberStatus,
  type MembershipPlan,
} from "@/data";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreatePlanDialog,
  type PlanFormValues,
} from "./_components/create-plan-dialog";

type StatusFilter = "all" | MemberStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "past-due", label: "Past due" },
];

// The most premium seeded plan gets the special treatment.
const premiumPlanId = membershipPlans.reduce((a, b) =>
  b.monthlyPrice > a.monthlyPrice ? b : a
).id;

function clientInitials(clientId: string): string {
  const client = clientById.get(clientId);
  return client
    ? `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`
    : "?";
}

export default function MembershipsPage() {
  const [plans, setPlans] = React.useState<MembershipPlan[]>(membershipPlans);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  const visibleMembers = members.filter(
    (m) => statusFilter === "all" || m.status === statusFilter
  );

  function handleCreate(values: PlanFormValues) {
    setPlans((prev) => [
      ...prev,
      {
        id: `plan-local-${Date.now()}`,
        name: values.name,
        monthlyPrice: values.monthlyPrice,
        billingCycle: values.billingCycle,
        perks: values.perks,
        activeMembers: 0,
      },
    ]);
    toast.success(`“${values.name}” membership created.`);
  }

  return (
    <>
      <PageHeader
        title="Memberships"
        subtitle={`${plans.length} plans · ${members.length} members`}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus data-icon="inline-start" strokeWidth={1.75} />
            Create Membership
          </Button>
        }
      />

      {/* Section 1 — Plans */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const isPremium = plan.id === premiumPlanId;
          return (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col border-line bg-white shadow-xs",
                isPremium && "ring-1 ring-gold-300"
              )}
            >
              <CardContent className="flex-1 p-6">
                {isPremium && (
                  <span className="mb-3 inline-flex items-center rounded-full border border-gold-200 bg-gold-50 px-3 py-0.5 text-[11px] tracking-wide text-gold-700 uppercase">
                    Most Premium
                  </span>
                )}
                <h3 className="text-2xl text-ink">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-heading text-4xl text-ink">
                    {formatCurrency(plan.monthlyPrice)}
                  </span>
                  <span className="text-sm font-light text-muted-warm">
                    /month
                  </span>
                </div>
                <p className="mt-1 text-xs font-light tracking-wide text-muted-warm uppercase">
                  Billed {plan.billingCycle.toLowerCase()}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-gold-600"
                        strokeWidth={1.75}
                      />
                      <span className="text-sm font-light text-ink-soft">
                        {perk}
                      </span>
                    </li>
                  ))}
                  {plan.perks.length === 0 && (
                    <li className="text-sm font-light text-muted-warm">
                      No perks added yet.
                    </li>
                  )}
                </ul>
              </CardContent>
              <CardFooter className="border-t border-line/70 px-6 py-4">
                <p className="flex items-center gap-2 text-xs font-light text-muted-warm">
                  <Users className="size-3.5 text-gold-600" strokeWidth={1.75} />
                  {plan.activeMembers} active{" "}
                  {plan.activeMembers === 1 ? "member" : "members"}
                </p>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Section 2 — Members */}
      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl text-ink">Members</h2>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "h-8 rounded-full border px-4 text-xs tracking-wide transition-colors",
                  statusFilter === f.value
                    ? "border-gold-300 bg-gold-50 text-gold-700"
                    : "border-line bg-white text-muted-warm hover:bg-cream"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop table */}
        <Card className="mt-4 hidden border-line bg-white shadow-xs md:block">
          <CardContent className="px-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-line hover:bg-transparent">
                    <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                      Member
                    </TableHead>
                    <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                      Plan
                    </TableHead>
                    <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                      Status
                    </TableHead>
                    <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                      Started
                    </TableHead>
                    <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                      Renews
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleMembers.length === 0 && (
                    <TableRow className="border-line hover:bg-transparent">
                      <TableCell
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm font-light text-muted-warm"
                      >
                        No members with this status.
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleMembers.map((m) => {
                    const client = clientById.get(m.clientId);
                    const plan = planById.get(m.planId);
                    return (
                      <TableRow key={m.id} className="border-line hover:bg-cream/50">
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-gold-50 text-xs text-gold-700">
                                {clientInitials(m.clientId)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-ink">
                              {client
                                ? `${client.firstName} ${client.lastName}`
                                : "Unknown client"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 text-sm text-ink-soft">
                          {plan?.name ?? "—"}
                        </TableCell>
                        <TableCell className="px-4">
                          <StatusBadge status={m.status} />
                        </TableCell>
                        <TableCell className="px-4 text-sm font-light text-muted-warm">
                          {format(new Date(m.startedISO), "MMM yyyy")}
                        </TableCell>
                        <TableCell className="px-4 text-sm font-light text-muted-warm">
                          {format(new Date(m.renewsISO), "MMM d")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Mobile stacked cards */}
        <div className="mt-4 space-y-3 md:hidden">
          {visibleMembers.length === 0 && (
            <Card className="border-line bg-white shadow-xs">
              <CardContent className="py-10 text-center text-sm font-light text-muted-warm">
                No members with this status.
              </CardContent>
            </Card>
          )}
          {visibleMembers.map((m) => {
            const client = clientById.get(m.clientId);
            const plan = planById.get(m.planId);
            return (
              <Card key={m.id} className="border-line bg-white shadow-xs">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gold-50 text-xs text-gold-700">
                          {clientInitials(m.clientId)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink">
                          {client
                            ? `${client.firstName} ${client.lastName}`
                            : "Unknown client"}
                        </p>
                        <p className="truncate text-xs font-light text-muted-warm">
                          {plan?.name ?? "—"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="mt-3 flex gap-6 border-t border-line/70 pt-3 text-xs">
                    <p className="font-light text-muted-warm">
                      Started{" "}
                      <span className="text-ink-soft">
                        {format(new Date(m.startedISO), "MMM yyyy")}
                      </span>
                    </p>
                    <p className="font-light text-muted-warm">
                      Renews{" "}
                      <span className="text-ink-soft">
                        {format(new Date(m.renewsISO), "MMM d")}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <CreatePlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
      />
    </>
  );
}
