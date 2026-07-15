"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  useData,
  type Appointment,
  type LocationFilter,
  type LocationId,
  type Service,
  type ServiceCategory,
} from "@/data";
import {
  findRoom,
  getConflicts,
  type DraftAppointment,
  type SchedulingContext,
} from "@/lib/scheduling/engine";
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

/** Select sentinel — SelectItem values can't be empty strings. */
const NO_ROOM = "none";

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
  const {
    clients,
    services,
    staff,
    locations,
    serviceById,
    createAppointment,
    appointments,
    timeBlocks,
    availabilityRules,
    availabilityOverrides,
    rooms,
  } = useData();

  const [clientId, setClientId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [staffId, setStaffId] = React.useState("");
  const [locationId, setLocationId] = React.useState<LocationId>("toluca");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("10:00");
  const [roomId, setRoomId] = React.useState(NO_ROOM);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  // True once the front desk picks a room by hand — auto-suggestion then backs off.
  const roomTouchedRef = React.useRef(false);

  // Fresh form each time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setClientId("");
      setServiceId("");
      setStaffId("");
      setLocationId(defaultLocation === "all" ? "toluca" : defaultLocation);
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTime("10:00");
      setRoomId(NO_ROOM);
      roomTouchedRef.current = false;
      setNote("");
      setSubmitting(false);
    }
  }, [open, defaultLocation]);

  const sortedClients = React.useMemo(
    () =>
      [...clients].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        )
      ),
    [clients]
  );
  const serviceGroups = React.useMemo(() => groupServices(services), [services]);

  const staffOptions = staff.filter(
    (s) =>
      s.locations.includes(locationId) &&
      (!serviceId ||
        s.serviceIds.length === 0 ||
        s.serviceIds.includes(serviceId))
  );
  const service = serviceById.get(serviceId);
  const canSubmit = Boolean(clientId && serviceId && staffId && date && time);

  const schedulingCtx = React.useMemo<SchedulingContext>(
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

  const startISO = React.useMemo(() => {
    if (!date || !time) return null;
    const start = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
    return Number.isNaN(start.getTime()) ? null : start.toISOString();
  }, [date, time]);

  // Rooms at this location that can host the chosen service's category.
  const roomCandidates = React.useMemo(() => {
    if (!service) return [];
    return rooms
      .filter(
        (r) =>
          r.locationId === locationId && r.categories.includes(service.category)
      )
      .sort((a, b) => a.sort - b.sort);
  }, [rooms, locationId, service]);

  const draft = React.useMemo<DraftAppointment | null>(() => {
    if (!service || !staffId || !startISO) return null;
    return {
      locationId,
      serviceId,
      staffId,
      startISO,
      durationMin: service.durationMin,
    };
  }, [service, staffId, startISO, locationId, serviceId]);

  const suggestedRoomId = React.useMemo(
    () => (draft ? findRoom(schedulingCtx, draft) : null),
    [schedulingCtx, draft]
  );

  // Re-suggest whenever the inputs change, unless a manual choice still holds.
  React.useEffect(() => {
    if (!open) return;
    const manualStillValid =
      roomTouchedRef.current &&
      (roomId === NO_ROOM || roomCandidates.some((r) => r.id === roomId));
    if (manualStillValid) return;
    roomTouchedRef.current = false;
    setRoomId(suggestedRoomId ?? NO_ROOM);
  }, [open, suggestedRoomId, roomId, roomCandidates]);

  const chosenRoomId =
    roomId !== NO_ROOM && roomCandidates.some((r) => r.id === roomId)
      ? roomId
      : undefined;

  const conflicts = React.useMemo(() => {
    if (!draft) return [];
    return getConflicts(schedulingCtx, { ...draft, roomId: chosenRoomId });
  }, [schedulingCtx, draft, chosenRoomId]);

  const handleRoomChange = (value: string) => {
    roomTouchedRef.current = true;
    setRoomId(value);
  };

  const handleLocationChange = (value: string) => {
    const next = value as LocationId;
    setLocationId(next);
    const chosen = staff.find((s) => s.id === staffId);
    if (chosen && !chosen.locations.includes(next)) setStaffId("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || !service || submitting) return;
    const start = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
    setSubmitting(true);
    try {
      const created = await createAppointment({
        clientId,
        serviceId,
        staffId,
        locationId,
        startISO: start.toISOString(),
        durationMin: service.durationMin,
        price: service.price,
        note: note.trim() ? note.trim() : undefined,
        roomId: chosenRoomId ?? null,
      });
      onCreate(created);
      onOpenChange(false);
    } catch {
      toast.error("Couldn't book the appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
                {sortedClients.map((c) => (
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

          {service && roomCandidates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="appt-room" className={LABEL_CLASSES}>
                Room
              </Label>
              <Select value={roomId} onValueChange={handleRoomChange}>
                <SelectTrigger id="appt-room" className={TRIGGER_CLASSES}>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {roomCandidates.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-sm">
                      <span className="flex items-center gap-2">
                        {r.name}
                        {suggestedRoomId === r.id && (
                          <span className="text-xs font-light text-gold-600">
                            Suggested
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={NO_ROOM} className="text-sm">
                    <span className="font-light text-muted-warm">No room</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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

          {conflicts.length > 0 && (
            <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              {conflicts.map((c) => (
                <p
                  key={c.kind}
                  className="flex items-start gap-2 text-xs font-light text-amber-800"
                >
                  <AlertTriangle
                    className="mt-0.5 size-3.5 shrink-0"
                    strokeWidth={1.75}
                  />
                  {c.message}
                </p>
              ))}
              <p className="pl-[22px] text-[11px] font-light text-amber-700/80">
                You can still book — use your judgment for phone bookings and
                exceptions.
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              <Sparkles data-icon="inline-start" strokeWidth={1.75} />
              {submitting ? "Booking…" : "Book Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
