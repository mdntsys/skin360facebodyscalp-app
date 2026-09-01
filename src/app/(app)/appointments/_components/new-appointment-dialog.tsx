"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { AlertTriangle, Sparkles, UserPlus } from "lucide-react";
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
import {
  cadenceLabel,
  expandRepeatStarts,
  planRepeatOccurrences,
  seriesNoteLine,
  type RepeatUnit,
} from "@/lib/scheduling/recurrence";
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
import { Switch } from "@/components/ui/switch";
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

// 15-minute slots from 8:00 AM through 7:00 PM so Square-imported :15/:45 times are pickable.
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let mins = 8 * 60; mins <= 19 * 60; mins += 15) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = ((h + 11) % 12) + 1;
  TIME_SLOTS.push({
    value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    label: `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`,
  });
}

function parseISOSafe(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeSlotLabel(value: string): string {
  const existing = TIME_SLOTS.find((s) => s.value === value);
  if (existing) return existing.label;
  const [hs, ms] = value.split(":");
  const h = Number(hs);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${ms} ${h >= 12 ? "PM" : "AM"}`;
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultLocation,
  onCreate,
  appointment,
  onUpdate,
  lockedStaffId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocation: LocationFilter;
  onCreate: (
    appt: Appointment,
    series?: { booked: number; skipped: number }
  ) => void;
  appointment?: Appointment | null;
  onUpdate?: (appt: Appointment) => void;
  /** Staff logins book onto their own column only. */
  lockedStaffId?: string;
}) {
  const {
    clients,
    services,
    staff,
    locations,
    serviceById,
    createAppointment,
    createAppointments,
    updateAppointment,
    createClient,
    appointments,
    timeBlocks,
    availabilityRules,
    availabilityOverrides,
    rooms,
  } = useData();
  const editing = Boolean(appointment);
  const lockedStaff = lockedStaffId
    ? staff.find((s) => s.id === lockedStaffId)
    : undefined;

  const [clientId, setClientId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [staffId, setStaffId] = React.useState("");
  const [locationId, setLocationId] = React.useState<LocationId>("toluca");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("10:00");
  const [roomId, setRoomId] = React.useState(NO_ROOM);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [addingClient, setAddingClient] = React.useState(false);
  const [newFirst, setNewFirst] = React.useState("");
  const [newLast, setNewLast] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [savingClient, setSavingClient] = React.useState(false);
  const [repeating, setRepeating] = React.useState(false);
  const [repeatEvery, setRepeatEvery] = React.useState("1");
  const [repeatUnit, setRepeatUnit] = React.useState<RepeatUnit>("week");
  const [repeatUntil, setRepeatUntil] = React.useState("");
  // True once the front desk picks a room by hand — auto-suggestion then backs off.
  const roomTouchedRef = React.useRef(false);

  const locationChoices = lockedStaff
    ? locations.filter((l) => lockedStaff.locations.includes(l.id))
    : locations;

  function defaultLocationId(): LocationId {
    const preferred =
      defaultLocation === "all" ? undefined : defaultLocation;
    if (preferred && locationChoices.some((l) => l.id === preferred)) {
      return preferred;
    }
    return locationChoices[0]?.id ?? "valencia";
  }

  // Fresh form each time the dialog opens — prefill when editing.
  React.useEffect(() => {
    if (!open) return;
    if (appointment) {
      const start = new Date(appointment.startISO);
      setClientId(appointment.clientId);
      setServiceId(appointment.serviceId);
      setStaffId(appointment.staffId);
      setLocationId(appointment.locationId);
      setDate(format(start, "yyyy-MM-dd"));
      setTime(format(start, "HH:mm"));
      setRoomId(appointment.roomId ?? NO_ROOM);
      roomTouchedRef.current = true;
      setNote(appointment.note ?? "");
      setRepeating(false);
      setRepeatEvery("1");
      setRepeatUnit("week");
      setRepeatUntil("");
    } else {
      setClientId("");
      setServiceId("");
      setStaffId(lockedStaffId ?? "");
      setLocationId(defaultLocationId());
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTime("10:00");
      setRoomId(NO_ROOM);
      roomTouchedRef.current = false;
      setNote("");
      setRepeating(false);
      setRepeatEvery("1");
      setRepeatUnit("week");
      setRepeatUntil("");
    }
    setAddingClient(false);
    setNewFirst("");
    setNewLast("");
    setNewPhone("");
    setNewEmail("");
    setSubmitting(false);
    // defaultLocationId reads locationChoices from locked staff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultLocation, appointment, lockedStaffId]);

  const sortedClients = React.useMemo(
    () =>
      [...clients].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        )
      ),
    [clients]
  );
  const scopedServices = React.useMemo(() => {
    const active = services.filter((s) => s.active !== false);
    if (!lockedStaff || lockedStaff.serviceIds.length === 0) return active;
    return active.filter((s) => lockedStaff.serviceIds.includes(s.id));
  }, [services, lockedStaff]);
  const serviceGroups = React.useMemo(
    () => groupServices(scopedServices),
    [scopedServices]
  );

  const staffOptions = staff.filter(
    (s) =>
      (!lockedStaffId || s.id === lockedStaffId) &&
      s.locations.includes(locationId) &&
      (!serviceId ||
        s.serviceIds.length === 0 ||
        s.serviceIds.includes(serviceId))
  );
  const service = serviceById.get(serviceId);
  const performerId = lockedStaffId ?? staffId;
  const canSubmit = Boolean(
    clientId && serviceId && performerId && date && time && !addingClient
  );

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

  const durationMin =
    editing && appointment && appointment.serviceId === serviceId
      ? appointment.durationMin
      : (service?.durationMin ?? 0);
  const price =
    editing && appointment && appointment.serviceId === serviceId
      ? appointment.price
      : (service?.price ?? 0);

  const draft = React.useMemo<DraftAppointment | null>(() => {
    if (!service || !performerId || !startISO) return null;
    return {
      locationId,
      serviceId,
      staffId: performerId,
      startISO,
      durationMin,
      excludeAppointmentId: appointment?.id,
    };
  }, [
    service,
    performerId,
    startISO,
    locationId,
    serviceId,
    durationMin,
    appointment?.id,
  ]);

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

  const repeatEveryN = Math.max(
    1,
    Math.min(12, Math.floor(Number(repeatEvery) || 1))
  );

  const repeatPlan = React.useMemo(() => {
    if (editing || !repeating || !repeatUntil || !startISO || !draft) return null;
    const first = parseISOSafe(startISO);
    if (!first) return null;
    const rule = {
      every: repeatEveryN,
      unit: repeatUnit,
      untilDate: repeatUntil,
    };
    const { starts, truncated } = expandRepeatStarts(first, rule);
    const { keep, skipped } = planRepeatOccurrences({
      ctx: schedulingCtx,
      draft,
      starts,
      preferredRoomId: chosenRoomId,
    });
    return { starts, truncated, keep, skipped, rule };
  }, [
    editing,
    repeating,
    repeatEveryN,
    repeatUnit,
    repeatUntil,
    startISO,
    draft,
    schedulingCtx,
    chosenRoomId,
  ]);

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

  const handleSaveNewClient = async () => {
    const first = newFirst.trim();
    const last = newLast.trim();
    if (!first || !last || savingClient) return;
    setSavingClient(true);
    try {
      const created = await createClient({
        firstName: first,
        lastName: last,
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
        homeLocation: locationId,
        tags: [],
      });
      setClientId(created.id);
      setAddingClient(false);
      setNewFirst("");
      setNewLast("");
      setNewPhone("");
      setNewEmail("");
      toast.success(`${first} ${last} added.`);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn't add the client. Please try again."
      );
    } finally {
      setSavingClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || !service || submitting) return;
    if (repeating && !editing) {
      if (!repeatUntil) {
        toast.error("Pick an end date for the repeats.");
        return;
      }
      if (repeatUntil < date) {
        toast.error("The end date has to be on or after the first visit.");
        return;
      }
    }
    const start = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
    setSubmitting(true);
    const userNote = note.trim() ? note.trim() : undefined;
    const payload = {
      clientId,
      serviceId,
      staffId: performerId,
      locationId,
      startISO: start.toISOString(),
      durationMin,
      price,
      note: userNote,
      roomId: chosenRoomId ?? null,
    };
    try {
      if (appointment) {
        const updated = await updateAppointment(appointment.id, payload);
        onUpdate?.(updated);
      } else if (repeatPlan && repeatPlan.keep.length > 1 && repeatPlan.rule) {
        const tag = seriesNoteLine(repeatPlan.rule);
        const seriesNote = userNote ? `${userNote}\n\n${tag}` : tag;
        const inputs = repeatPlan.keep.map((occ) => ({
          ...payload,
          startISO: occ.startISO,
          roomId: occ.roomId ?? null,
          note: seriesNote,
        }));
        const created = await createAppointments(inputs);
        if (created[0]) {
          onCreate(created[0], {
            booked: created.length,
            skipped: repeatPlan.skipped.length,
          });
        }
      } else {
        const created = await createAppointment(payload);
        onCreate(created);
      }
      onOpenChange(false);
    } catch {
      toast.error(
        appointment
          ? "Couldn't update the appointment. Please try again."
          : "Couldn't book the appointment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl bg-white p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-line bg-ivory/70 px-6 pt-7 pb-5">
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            {editing ? "Edit Appointment" : "New Appointment"}
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            {editing
              ? "Change the time, service, or who it's with — it updates on the calendar right away."
              : lockedStaffId
                ? "Book a client onto your schedule. They get a confirmation email if there's an email on file."
                : "Book a service for a client — it appears on the calendar right away and they get a confirmation email."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="appt-client" className={LABEL_CLASSES}>
                Client
              </Label>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-normal text-gold-700 hover:text-gold-800"
                onClick={() => setAddingClient((v) => !v)}
              >
                <UserPlus className="size-3.5" strokeWidth={1.75} />
                {addingClient ? "Pick existing" : "New client"}
              </button>
            </div>
            {addingClient ? (
              <div className="space-y-3 rounded-2xl border border-line bg-ivory/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={newFirst}
                    onChange={(e) => setNewFirst(e.target.value)}
                    placeholder="First name"
                    className="h-11 rounded-full border-line bg-white px-4 text-sm"
                  />
                  <Input
                    value={newLast}
                    onChange={(e) => setNewLast(e.target.value)}
                    placeholder="Last name"
                    className="h-11 rounded-full border-line bg-white px-4 text-sm"
                  />
                </div>
                <Input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Phone"
                  className="h-11 rounded-full border-line bg-white px-4 text-sm"
                />
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email (optional — for the confirmation)"
                  className="h-11 rounded-full border-line bg-white px-4 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!newFirst.trim() || !newLast.trim() || savingClient}
                  onClick={() => void handleSaveNewClient()}
                >
                  {savingClient ? "Saving…" : "Save client"}
                </Button>
              </div>
            ) : (
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
            )}
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
                  {TIME_SLOTS.some((s) => s.value === time)
                    ? null
                    : time && (
                        <SelectItem value={time} className="text-sm">
                          {timeSlotLabel(time)}
                        </SelectItem>
                      )}
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

          {!editing && (
            <div className="space-y-3 rounded-2xl border border-line bg-ivory/40 px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs tracking-wide uppercase text-muted-warm">
                    Repeats
                  </p>
                  <p className="text-sm font-light text-ink">
                    {repeating
                      ? cadenceLabel(repeatEveryN, repeatUnit)
                      : "Does not repeat"}
                  </p>
                </div>
                <Switch
                  checked={repeating}
                  onCheckedChange={setRepeating}
                  aria-label="Repeat this appointment"
                />
              </div>
              {repeating && (
                <div className="space-y-3 border-t border-line/70 pt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="appt-repeat-every" className={LABEL_CLASSES}>
                        Repeats every
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="appt-repeat-every"
                          type="number"
                          min={1}
                          max={12}
                          value={repeatEvery}
                          onChange={(e) => setRepeatEvery(e.target.value)}
                          className="h-11 w-20 rounded-full border-line bg-white px-4 text-sm font-light focus-visible:border-gold-300"
                        />
                        <Select
                          value={repeatUnit}
                          onValueChange={(v) => setRepeatUnit(v as RepeatUnit)}
                        >
                          <SelectTrigger className={TRIGGER_CLASSES}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appt-repeat-until" className={LABEL_CLASSES}>
                        End date
                      </Label>
                      <Input
                        id="appt-repeat-until"
                        type="date"
                        min={date || undefined}
                        value={repeatUntil}
                        onChange={(e) => setRepeatUntil(e.target.value)}
                        className="h-11 rounded-full border-line bg-white px-4 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50"
                      />
                    </div>
                  </div>
                  {repeatPlan && repeatPlan.keep.length > 0 && (
                    <p className="text-xs font-light text-muted-warm">
                      {repeatPlan.keep.length === 1
                        ? "Just the first visit lands on the calendar — later dates do not fit."
                        : `${repeatPlan.keep.length} visits, ${cadenceLabel(repeatEveryN, repeatUnit)} through ${format(parse(repeatUntil, "yyyy-MM-dd", new Date()), "MMM d")}.`}
                      {repeatPlan.skipped.length > 0
                        ? ` Skipping ${repeatPlan.skipped.length} that ${repeatPlan.skipped.length === 1 ? "is" : "are"} already taken or she is off.`
                        : ""}
                      {repeatPlan.truncated
                        ? " Stopped at 52 visits — book another series if you need to go longer."
                        : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {!lockedStaffId && (
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
            )}
            <div
              className={
                lockedStaffId ? "space-y-2 sm:col-span-2" : "space-y-2"
              }
            >
              <Label htmlFor="appt-location" className={LABEL_CLASSES}>
                Location
              </Label>
              {locationChoices.length <= 1 ? (
                <p className="flex h-11 items-center px-1 text-sm text-ink">
                  {locationChoices[0]?.shortName ?? "Valencia"}
                </p>
              ) : (
                <Select value={locationId} onValueChange={handleLocationChange}>
                  <SelectTrigger id="appt-location" className={TRIGGER_CLASSES}>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {locationChoices.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.shortName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                  {lockedStaffId && c.kind === "staff-busy"
                    ? "You already have something booked at this time."
                    : c.message}
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
              {submitting
                ? editing
                  ? "Saving…"
                  : "Booking…"
                : editing
                  ? "Save Changes"
                  : repeatPlan && repeatPlan.keep.length > 1
                    ? `Book ${repeatPlan.keep.length} Appointments`
                    : "Book Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
