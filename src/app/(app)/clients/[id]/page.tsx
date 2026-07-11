"use client";

import * as React from "react";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarPlus,
  Clock,
  DollarSign,
  Heart,
  Mail,
  PencilLine,
  Phone,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { clientById, formatCurrency } from "@/data";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AppointmentsTab } from "../_components/appointments-tab";
import { ClientAvatar } from "../_components/client-avatar";
import { EmptyState } from "../_components/empty-state";
import { IntakeFormsTab } from "../_components/intake-forms-tab";
import { MembershipsTab } from "../_components/memberships-tab";
import { NotesTab } from "../_components/notes-tab";
import { OverviewTab } from "../_components/overview-tab";
import { PaymentsTab } from "../_components/payments-tab";
import { TagBadge } from "../_components/tag-badge";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "appointments", label: "Appointments" },
  { value: "intake", label: "Intake Forms" },
  { value: "memberships", label: "Memberships & Packages" },
  { value: "payments", label: "Payments" },
  { value: "notes", label: "Notes" },
] as const;

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const client = clientById.get(id);

  if (!client) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <EmptyState
          icon={UserX}
          title="Client not found"
          description="This client may have been removed, or the link is out of date."
          action={
            <Button asChild variant="outline">
              <Link href="/clients">
                <ArrowLeft data-icon="inline-start" strokeWidth={1.75} />
                Back to Clients
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const lastVisit = client.lastVisitISO ? new Date(client.lastVisitISO) : null;

  return (
    <>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link href="/clients">
            <ArrowLeft data-icon="inline-start" strokeWidth={1.75} />
            Clients
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="flex items-center gap-4 sm:gap-5">
            <ClientAvatar
              firstName={client.firstName}
              lastName={client.lastName}
              className="size-16 sm:size-20"
              initialsClassName="text-2xl sm:text-3xl"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="text-3xl text-ink sm:text-4xl">
                  {client.firstName} {client.lastName}
                </h1>
                {client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {client.tags.map((t) => (
                      <TagBadge key={t} tag={t} />
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-light text-muted-warm">
                {client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone
                      className="size-3.5 text-gold-600"
                      strokeWidth={1.75}
                    />
                    {client.phone}
                  </span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail
                      className="size-3.5 text-gold-600"
                      strokeWidth={1.75}
                    />
                    {client.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/appointments?new=1">
                <CalendarPlus data-icon="inline-start" strokeWidth={1.75} />
                Book Appointment
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => toast("Profile editing is coming soon")}
            >
              <PencilLine data-icon="inline-start" strokeWidth={1.75} />
              Edit Profile
            </Button>
          </div>
        </div>
        <div className="gold-rule mt-5" />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total Spent"
          value={formatCurrency(client.totalSpent)}
          icon={DollarSign}
          hint="Lifetime value"
          hintTone="positive"
        />
        <StatCard
          label="Visits"
          value={client.visitCount}
          icon={CalendarCheck}
          hint={
            client.visitCount > 0
              ? "Completed appointments"
              : "First visit pending"
          }
        />
        <StatCard
          label="Client Since"
          value={format(new Date(client.joinedISO), "yyyy")}
          icon={Heart}
          hint={format(new Date(client.joinedISO), "MMMM yyyy")}
        />
        <StatCard
          label="Last Visit"
          value={lastVisit ? format(lastVisit, "MMM d") : "—"}
          icon={Clock}
          hint={
            lastVisit
              ? `${formatDistanceToNowStrict(lastVisit)} ago`
              : "No visits yet"
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mt-6 lg:mt-8">
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          <TabsList className="w-max justify-start gap-1 rounded-full border border-line bg-cream/70 p-1 group-data-horizontal/tabs:h-11">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="flex-none rounded-full px-4 text-xs font-normal tracking-wide text-ink-soft transition-colors data-active:bg-white data-active:text-gold-700 data-active:shadow-xs"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-3">
          <OverviewTab client={client} />
        </TabsContent>
        <TabsContent value="appointments" className="mt-3">
          <AppointmentsTab client={client} />
        </TabsContent>
        <TabsContent value="intake" className="mt-3">
          <IntakeFormsTab client={client} />
        </TabsContent>
        <TabsContent value="memberships" className="mt-3">
          <MembershipsTab client={client} />
        </TabsContent>
        <TabsContent value="payments" className="mt-3">
          <PaymentsTab client={client} />
        </TabsContent>
        <TabsContent value="notes" className="mt-3">
          <NotesTab client={client} />
        </TabsContent>
      </Tabs>
    </>
  );
}
