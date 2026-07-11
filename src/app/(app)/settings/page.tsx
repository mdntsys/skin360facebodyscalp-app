"use client";

import { MapPin, Pencil, Phone, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  formatCurrency,
  locations,
  services,
  staff,
  type ServiceCategory,
} from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BUSINESS_FIELDS: { label: string; value: string }[] = [
  { label: "Business name", value: "Skin 360 Face Body Scalp" },
  { label: "Owner", value: "Carolina" },
  { label: "Email", value: "hello@skin360facebodyscalp.com" },
  { label: "Phone", value: "(818) 555-0360" },
  { label: "Instagram", value: "@skin360facebodyscalp" },
  { label: "Website", value: "skin360facebodyscalp.com" },
  { label: "Timezone", value: "Pacific (Los Angeles)" },
];

const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Facials",
  "Advanced Treatments",
  "Body",
  "Scalp",
  "Nails",
];

const locationShortName = new Map(locations.map((l) => [l.id, l.shortName]));

const tabTriggerClass =
  "rounded-full px-4 py-1.5 text-sm font-normal text-muted-warm data-active:text-ink data-active:shadow-xs";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Business profile, locations, team, and service menu"
      />

      <Tabs defaultValue="business">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto! w-max rounded-full bg-cream p-1">
            <TabsTrigger value="business" className={tabTriggerClass}>
              Business
            </TabsTrigger>
            <TabsTrigger value="locations" className={tabTriggerClass}>
              Locations
            </TabsTrigger>
            <TabsTrigger value="staff" className={tabTriggerClass}>
              Staff
            </TabsTrigger>
            <TabsTrigger value="services" className={tabTriggerClass}>
              Services
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ---------- Business ---------- */}
        <TabsContent value="business" className="mt-4">
          <Card className="max-w-3xl border-line bg-white shadow-xs">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col items-center gap-1 border-b border-line pb-6 text-center">
                <div className="mb-3 flex size-14 items-center justify-center rounded-full border border-gold-200 bg-white shadow-sm">
                  <span className="font-heading text-xl text-gold-600">S</span>
                </div>
                <h2 className="text-3xl text-ink">Skin 360</h2>
                <p className="text-xs font-light tracking-[0.3em] text-gold-700 uppercase">
                  Face · Body · Scalp
                </p>
              </div>

              <dl className="divide-y divide-line/70">
                {BUSINESS_FIELDS.map((f) => (
                  <div
                    key={f.label}
                    className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <dt className="text-xs font-normal tracking-[0.14em] text-muted-warm uppercase">
                      {f.label}
                    </dt>
                    <dd className="text-sm text-ink">{f.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  className="opacity-80"
                  onClick={() =>
                    toast("Editing arrives with the full release")
                  }
                >
                  <Pencil data-icon="inline-start" strokeWidth={1.75} />
                  Edit business info
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Locations ---------- */}
        <TabsContent value="locations" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {locations.map((loc) => (
              <Card key={loc.id} className="border-line bg-white shadow-xs">
                <CardHeader className="flex-row items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-50">
                    <MapPin
                      className="size-[18px] text-gold-600"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-xl font-medium">
                      {loc.name}
                    </CardTitle>
                    <p className="text-xs font-light text-muted-warm">
                      {loc.address} · {loc.city}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="flex items-center gap-2 text-sm text-ink-soft">
                    <Phone
                      className="size-4 text-gold-600"
                      strokeWidth={1.75}
                    />
                    {loc.phone}
                  </p>
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-normal tracking-[0.14em] text-muted-warm uppercase">
                      Hours
                    </p>
                    <div className="divide-y divide-line/70 rounded-xl border border-line/70 bg-ivory/50 px-4">
                      {loc.hours.map((h) => (
                        <div
                          key={h.days}
                          className="flex items-center justify-between gap-4 py-2.5"
                        >
                          <span className="text-sm text-ink-soft">
                            {h.days}
                          </span>
                          {h.open === "Closed" ? (
                            <span className="text-sm font-light text-muted-warm">
                              Closed
                            </span>
                          ) : (
                            <span className="text-sm text-ink tabular-nums">
                              {h.open} – {h.close}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---------- Staff ---------- */}
        <TabsContent value="staff" className="mt-4">
          <Card className="max-w-3xl border-line bg-white shadow-xs">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-heading text-xl font-medium">
                Team
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast("Staff invitations arrive with the full release")
                }
              >
                <UserPlus data-icon="inline-start" strokeWidth={1.75} />
                Invite staff
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-line/70">
                {staff.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4"
                  >
                    <Avatar className="size-11">
                      <AvatarFallback
                        className="text-xs font-medium"
                        style={{
                          backgroundColor: `${s.color}1f`,
                          color: s.color,
                        }}
                      >
                        {s.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-ink">{s.name}</p>
                        {s.locations.map((id) => (
                          <Badge
                            key={id}
                            variant="outline"
                            className="rounded-full border-gold-200 bg-gold-50 px-2.5 py-0.5 text-[11px] font-normal text-gold-700"
                          >
                            {locationShortName.get(id)}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs font-light text-muted-warm">
                        {s.role}
                      </p>
                    </div>
                    <div className="w-full text-xs font-light text-muted-warm sm:w-auto sm:text-right">
                      <p>{s.email}</p>
                      <p>{s.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Services ---------- */}
        <TabsContent value="services" className="mt-4">
          <Card className="max-w-3xl border-line bg-white shadow-xs">
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-8">
                {SERVICE_CATEGORIES.map((cat) => {
                  const items = services.filter((s) => s.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="mb-2 flex items-center gap-4">
                        <h3 className="shrink-0 text-xl text-ink">{cat}</h3>
                        <div className="h-px flex-1 bg-gold-200/70" />
                      </div>
                      <div className="divide-y divide-line/70">
                        {items.map((svc) => (
                          <div
                            key={svc.id}
                            className="flex items-baseline justify-between gap-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-ink">{svc.name}</p>
                              <p className="text-xs font-light text-muted-warm">
                                {svc.durationMin} min
                              </p>
                            </div>
                            <span className="shrink-0 font-heading text-lg text-ink tabular-nums">
                              {formatCurrency(svc.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
