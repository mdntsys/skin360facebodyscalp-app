"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";

import {
  availableSlots,
  type SchedulingContext,
} from "@/lib/scheduling/engine";
import {
  useData,
  type LocationId,
  type Service,
  type ServiceCategory,
} from "@/data";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { FIELD_CLASSES, LABEL_CLASSES } from "./shared";

function groupServices(
  services: Service[]
): { category: ServiceCategory; items: Service[] }[] {
  const groups: { category: ServiceCategory; items: Service[] }[] = [];
  for (const s of services) {
    const group = groups.find((g) => g.category === s.category);
    if (group) group.items.push(s);
    else groups.push({ category: s.category, items: [s] });
  }
  return groups;
}

export function BookingPreview() {
  const {
    services,
    staff,
    appointments,
    timeBlocks,
    availabilityRules,
    availabilityOverrides,
    rooms,
    serviceById,
    staffById,
    locations,
    locationById,
    appSettings,
  } = useData();

  const [serviceIdState, setServiceIdState] = React.useState("");
  const [locationId, setLocationId] = React.useState<LocationId>("valencia");
  const [date, setDate] = React.useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );

  const serviceId = serviceIdState || services[0]?.id || "";
  const service = serviceById.get(serviceId);
  const serviceGroups = React.useMemo(
    () => groupServices(services),
    [services]
  );

  const ctx = React.useMemo<SchedulingContext>(
    () => ({
      appointments,
      timeBlocks,
      availabilityRules,
      availabilityOverrides,
      rooms,
      serviceById,
      staff,
    }),
    [
      appointments,
      timeBlocks,
      availabilityRules,
      availabilityOverrides,
      rooms,
      serviceById,
      staff,
    ]
  );

  const day = React.useMemo(() => {
    if (!date) return null;
    const parsed = parse(date, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : null;
  }, [date]);

  const slots = React.useMemo(() => {
    if (!serviceId || !day) return [];
    return availableSlots(ctx, { serviceId, locationId, date: day, stepMin: 15 });
  }, [ctx, serviceId, locationId, day]);

  // Multiple staff can share a start time — dedupe and collect who's free.
  const chips = React.useMemo(() => {
    const map = new Map<string, { startISO: string; staffIds: string[] }>();
    for (const s of slots) {
      const entry = map.get(s.startISO);
      if (entry) {
        if (!entry.staffIds.includes(s.staffId)) entry.staffIds.push(s.staffId);
      } else {
        map.set(s.startISO, { startISO: s.startISO, staffIds: [s.staffId] });
      }
    }
    return [...map.values()];
  }, [slots]);

  const showStaffOnChips = staff.length > 1;
  const location = locationById.get(locationId);

  const emptyMessage = React.useMemo(() => {
    if (services.length === 0) return "Add a service to preview open times.";
    if (!service) return "Choose a service to preview open times.";
    if (!day) return "Pick a date to preview open times.";

    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (date < todayStr) return "That date is in the past — pick an upcoming day.";

    const locationRooms = rooms.filter((r) => r.locationId === locationId);
    if (
      locationRooms.length > 0 &&
      !locationRooms.some((r) => r.categories.includes(service.category))
    ) {
      return `No room at ${location?.shortName ?? "this location"} supports ${service.category} services.`;
    }

    const weekday = day.getDay();
    const capableStaff = staff.filter(
      (s) => s.serviceIds.length === 0 || s.serviceIds.includes(service.id)
    );
    const hasSchedule = capableStaff.some(
      (s) =>
        availabilityRules.some(
          (r) =>
            r.staffId === s.id &&
            r.locationId === locationId &&
            r.weekday === weekday
        ) ||
        availabilityOverrides.some(
          (o) => o.staffId === s.id && o.dateISO === date && o.available
        )
    );
    if (!hasSchedule) {
      return "No provider has working hours set for this day — add a weekly schedule above.";
    }
    return "Fully booked — every open slot this day is taken or blocked.";
  }, [
    services.length,
    service,
    day,
    date,
    rooms,
    locationId,
    location,
    staff,
    availabilityRules,
    availabilityOverrides,
  ]);

  return (
    <Card className="border-line bg-white shadow-xs">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="font-heading text-xl font-medium">
            Booking Preview
          </CardTitle>
          <p className="text-xs font-light text-muted-warm">
            {appSettings.onlineBookingEnabled
              ? "These are the exact slots the website is offering right now."
              : "These are the exact slots the website will offer once online booking is switched on."}
            {location?.bookingMode === "call-only" && (
              <> {location.shortName} is call-only — clients book these by phone.</>
            )}
          </p>
        </div>
        {appSettings.onlineBookingEnabled ? (
          <Badge
            variant="outline"
            className="rounded-full border-gold-200 bg-gold-50 px-3 font-normal text-gold-700"
          >
            Online booking on
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="rounded-full border-line bg-cream px-3 font-normal text-ink-soft"
          >
            Online booking off — internal preview only
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="preview-service" className={LABEL_CLASSES}>
              Service
            </Label>
            <Select value={serviceId} onValueChange={setServiceIdState}>
              <SelectTrigger id="preview-service" className={FIELD_CLASSES}>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent position="popper">
                {serviceGroups.map((group) => (
                  <SelectGroup key={group.category}>
                    <SelectLabel className="text-[11px] tracking-[0.14em] text-muted-warm uppercase">
                      {group.category}
                    </SelectLabel>
                    {group.items.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-sm">
                        <span className="flex items-center gap-2">
                          {s.name}
                          <span className="text-xs font-light text-muted-warm">
                            {s.durationMin}min
                            {s.bufferMin > 0 && ` +${s.bufferMin} buffer`}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preview-date" className={LABEL_CLASSES}>
              Date
            </Label>
            <Input
              id="preview-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={FIELD_CLASSES}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preview-location" className={LABEL_CLASSES}>
              Location
            </Label>
            <Select
              value={locationId}
              onValueChange={(v) => setLocationId(v as LocationId)}
            >
              <SelectTrigger id="preview-location" className={FIELD_CLASSES}>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent position="popper">
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-sm">
                    {l.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {chips.length > 0 ? (
          <>
            <p className="mb-3 text-xs font-light text-muted-warm">
              {chips.length} open {chips.length === 1 ? "time" : "times"}
              {day && <> · {format(day, "EEEE, MMMM d")}</>}
              {service && <> · {service.name}</>}
            </p>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <div
                  key={c.startISO}
                  className="flex items-center gap-2 rounded-full border border-gold-200 bg-gold-50 px-4 py-1.5"
                >
                  <span className="text-sm text-gold-700">
                    {format(new Date(c.startISO), "h:mm a")}
                  </span>
                  {showStaffOnChips && (
                    <span className="text-[10px] font-light tracking-wide text-gold-600 uppercase">
                      {c.staffIds
                        .map((id) => staffById.get(id)?.name.split(" ")[0])
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-10 text-center text-sm font-light text-muted-warm">
            {emptyMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
