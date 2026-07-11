"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { Sparkles } from "lucide-react";

import {
  clients,
  locations,
  serviceById,
  services,
  staff,
  type Appointment,
  type LocationFilter,
  type LocationId,
  type Service,
  type ServiceCategory,
} from "@/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";

const TRIGGER_CLASSES =
  "h-11 w-full rounded-full border-line bg-ivory/50 px-4 text-sm font-light data-[size=default]:h-11 focus-visible:border-gold-300 focus-visible:ring-gold-200/50";

const LABEL_CLASSES = "text-xs tracking-wide uppercase text-muted-warm";

const SORTED_CLIENTS = [...clients].sort((a, b) =>
  `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
);

function groupServices(): { category: ServiceCategory; items: Service[] }[] {
  const groups: { category: ServiceCategory; items: Service[] }[] = [];
  for (const s of services) {
    const group = groups.find((g) => g.category === s.category);
    if (group) group.items.push(s);
    else groups.push({ category: s.category, items: [s] });
  }
  return groups;
}
const SERVICE_GROUPS = groupServices();

// 30-minute slots from 8:00 AM through 6:30 PM
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let mins = 8 * 60; mins <= 18 * 60 + 30; mins += 30) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = ((h + 11) % 12) + 1;
  TIME_SLOTS.push({
    value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    label: `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`,
  });
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultLocation,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocation: LocationFilter;
  onCreate: (appt: Appointment) => void;
}) {
  const [clientId, setClientId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [staffId, setStaffId] = React.useState("");
  const [locationId, setLocationId] = React.useState<LocationId>("toluca");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("10:00");
  const [note, setNote] = React.useState("");

  // Fresh form each time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setClientId("");
      setServiceId("");
      setStaffId("");
      setLocationId(defaultLocation === "all" ? "toluca" : defaultLocation);
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTime("10:00");
      setNote("");
    }
  }, [open, defaultLocation]);

  const staffOptions = staff.filter((s) => s.locations.includes(locationId));
  const service = serviceById.get(serviceId);
  const canSubmit = Boolean(clientId && serviceId && staffId && date && time);

  const handleLocationChange = (value: string) => {
    const next = value as LocationId;
    setLocationId(next);
    const chosen = staff.find((s) => s.id === staffId);
    if (chosen && !chosen.locations.includes(next)) setStaffId("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || !service) return;
    const start = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
    onCreate({
      id: `apt-local-${Date.now()}`,
      clientId,
      serviceId,
      staffId,
      locationId,
      startISO: start.toISOString(),
      durationMin: service.durationMin,
      price: service.price,
      status: "confirmed",
      note: note.trim() ? note.trim() : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl bg-white p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-line bg-ivory/70 px-6 pt-7 pb-5">
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            New Appointment
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            Book a service for a client — it appears on the calendar right
            away.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="appt-client" className={LABEL_CLASSES}>
              Client
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="appt-client" className={TRIGGER_CLASSES}>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent position="popper">
                {SORTED_CLIENTS.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-sm">
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appt-service" className={LABEL_CLASSES}>
              Service
            </Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger id="appt-service" className={TRIGGER_CLASSES}>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent position="popper">
                {SERVICE_GROUPS.map((group) => (
                  <SelectGroup key={group.category}>
                    <SelectLabel className="text-[11px] tracking-[0.14em] text-muted-warm uppercase">
                      {group.category}
                    </SelectLabel>
                    {group.items.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-sm">
                        <span className="flex items-center gap-2">
                          {s.name}
                          <span className="text-xs font-light text-muted-warm">
                            ${s.price} · {s.durationMin}min
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appt-date" className={LABEL_CLASSES}>
                Date
              </Label>
              <Input
                id="appt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-full border-line bg-ivory/50 px-4 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appt-time" className={LABEL_CLASSES}>
                Time
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger id="appt-time" className={TRIGGER_CLASSES}>
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-64">
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem
                      key={slot.value}
                      value={slot.value}
                      className="text-sm"
                    >
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appt-staff" className={LABEL_CLASSES}>
                Staff
              </Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger id="appt-staff" className={TRIGGER_CLASSES}>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {staffOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appt-location" className={LABEL_CLASSES}>
                Location
              </Label>
              <Select value={locationId} onValueChange={handleLocationChange}>
                <SelectTrigger id="appt-location" className={TRIGGER_CLASSES}>
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

          <div className="space-y-2">
            <Label htmlFor="appt-note" className={LABEL_CLASSES}>
              Note <span className="normal-case">(optional)</span>
            </Label>
            <Textarea
              id="appt-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the provider should know…"
              className="min-h-20 rounded-xl border-line bg-ivory/50 px-4 py-3 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <Sparkles data-icon="inline-start" strokeWidth={1.75} />
              Book Appointment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
