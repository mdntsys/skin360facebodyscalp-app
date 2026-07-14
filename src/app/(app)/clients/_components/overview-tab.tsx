"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Cake,
  CalendarPlus,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { useData, type Client } from "@/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OverviewTab({ client }: { client: Client }) {
  const { appointments, locationById, serviceById, staffById } = useData();
  const now = new Date();
  const upcoming = appointments
    .filter(
      (a) =>
        a.clientId === client.id &&
        new Date(a.startISO) > now &&
        a.status !== "cancelled" &&
        a.status !== "no-show"
    )
    .sort(
      (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
    );
  const home = locationById.get(client.homeLocation);

  const contactRows: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Phone, label: "Phone", value: client.phone || "—" },
    { icon: Mail, label: "Email", value: client.email || "—" },
    ...(client.birthday
      ? [{ icon: Cake, label: "Birthday", value: client.birthday }]
      : []),
    { icon: MapPin, label: "Home Location", value: home?.name ?? "—" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {/* Contact */}
        <Card className="border-line bg-white shadow-xs">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-medium">
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contactRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center gap-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-50">
                    <Icon
                      className="size-4 text-gold-600"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-normal tracking-[0.14em] text-muted-warm uppercase">
                      {row.label}
                    </p>
                    <p className="truncate text-sm text-ink">{row.value}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Skin Profile */}
        <Card className="border-line bg-white shadow-xs">
          <CardHeader className="flex-row items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold-50">
              <Sparkles className="size-4 text-gold-600" strokeWidth={1.75} />
            </div>
            <CardTitle className="font-heading text-xl font-medium">
              Skin Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.skinNotes ? (
              <blockquote className="font-heading text-xl leading-relaxed font-medium text-ink-soft italic">
                “{client.skinNotes}”
              </blockquote>
            ) : (
              <p className="text-sm font-light text-muted-warm">
                No skin notes on file yet — add observations after the next
                visit.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming */}
      <Card className="self-start border-line bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-medium">
            Upcoming
          </CardTitle>
          <p className="text-xs font-light text-muted-warm">
            Next visits on the books
          </p>
        </CardHeader>
        <CardContent className="space-y-1">
          {upcoming.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <p className="text-sm font-light text-muted-warm">
                Nothing on the books — time to invite {client.firstName} back
                in.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/appointments?new=1">
                  <CalendarPlus data-icon="inline-start" strokeWidth={1.75} />
                  Book a visit
                </Link>
              </Button>
            </div>
          )}
          {upcoming.map((a) => {
            const start = new Date(a.startISO);
            const service = serviceById.get(a.serviceId);
            const esthetician = staffById.get(a.staffId);
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-cream/70"
              >
                <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-gold-50 py-1.5">
                  <span className="text-[10px] font-normal tracking-wide text-gold-700 uppercase">
                    {format(start, "EEE, MMM d")}
                  </span>
                  <span className="text-sm font-normal text-ink">
                    {format(start, "h:mm a")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{service?.name}</p>
                  <p className="truncate text-xs font-light text-muted-warm">
                    {esthetician?.name} ·{" "}
                    {locationById.get(a.locationId)?.shortName}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
