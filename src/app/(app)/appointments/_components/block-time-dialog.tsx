"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { CalendarOff } from "lucide-react";
import { toast } from "sonner";

import { useData, type LocationFilter, type LocationId } from "@/data";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TRIGGER_CLASSES =
  "h-11 w-full rounded-full border-line bg-ivory/50 px-4 text-sm font-light data-[size=default]:h-11 focus-visible:border-gold-300 focus-visible:ring-gold-200/50";

const LABEL_CLASSES = "text-xs tracking-wide uppercase text-muted-warm";

type BlockScope = "location" | "staff" | "room";

const SCOPES: { id: BlockScope; label: string }[] = [
  { id: "location", label: "Entire location" },
  { id: "staff", label: "Staff member" },
  { id: "room", label: "Room" },
];

// 15-minute steps from 8:00 AM through 7:00 PM
const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let mins = 8 * 60; mins <= 19 * 60; mins += 15) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = ((h + 11) % 12) + 1;
  TIME_OPTIONS.push({
    value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    label: `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`,
  });
}
// The last slot can't start a block — there's nothing after it to end on.
const START_OPTIONS = TIME_OPTIONS.slice(0, -1);

export function BlockTimeDialog({
  open,
  onOpenChange,
  defaultLocation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocation: LocationFilter;
}) {
  const { locations, staff, rooms, addTimeBlock } = useData();

  const [scope, setScope] = React.useState<BlockScope>("location");
  const [locationId, setLocationId] = React.useState<LocationId>("toluca");
  const [staffId, setStaffId] = React.useState("");
  const [roomId, setRoomId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("12:00");
  const [endTime, setEndTime] = React.useState("13:00");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Fresh form each time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setScope("location");
      setLocationId(defaultLocation === "all" ? "toluca" : defaultLocation);
      setStaffId("");
      setRoomId("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setStartTime("12:00");
      setEndTime("13:00");
      setReason("");
      setSubmitting(false);
    }
  }, [open, defaultLocation]);

  const staffOptions = staff.filter((s) => s.locations.includes(locationId));
  const roomOptions = rooms
    .filter((r) => r.locationId === locationId)
    .sort((a, b) => a.sort - b.sort);

  const endOptions = TIME_OPTIONS.filter((t) => t.value > startTime);

  const scopeChosen =
    scope === "location" ||
    (scope === "staff" ? Boolean(staffId) : Boolean(roomId));
  const canSubmit = Boolean(
    date && reason.trim() && endTime > startTime && scopeChosen
  );

  const handleLocationChange = (value: string) => {
    const next = value as LocationId;
    setLocationId(next);
    const chosenStaff = staff.find((s) => s.id === staffId);
    if (chosenStaff && !chosenStaff.locations.includes(next)) setStaffId("");
    const chosenRoom = rooms.find((r) => r.id === roomId);
    if (chosenRoom && chosenRoom.locationId !== next) setRoomId("");
  };

  const handleStartChange = (value: string) => {
    setStartTime(value);
    if (endTime <= value) {
      const next = TIME_OPTIONS.find((t) => t.value > value);
      if (next) setEndTime(next.value);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    const start = parse(`${date} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
    const end = parse(`${date} ${endTime}`, "yyyy-MM-dd HH:mm", new Date());
    setSubmitting(true);
    try {
      await addTimeBlock({
        locationId,
        staffId: scope === "staff" ? staffId : undefined,
        roomId: scope === "room" ? roomId : undefined,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        reason: reason.trim(),
      });
      toast.success(
        `Time blocked · ${format(start, "EEE, MMM d")} · ${format(
          start,
          "h:mm a"
        )} – ${format(end, "h:mm a")}`
      );
      onOpenChange(false);
    } catch {
      toast.error("Couldn't block this time. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl bg-white p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-line bg-ivory/70 px-6 pt-7 pb-5">
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            Block Time
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            Reserve time on the calendar so nothing gets booked over it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <Label className={LABEL_CLASSES}>Applies to</Label>
            <div className="flex w-full items-center rounded-full border border-line bg-ivory/50 p-1">
              {SCOPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id)}
                  className={cn(
                    "h-9 flex-1 rounded-full px-2 text-xs tracking-wide transition-colors",
                    scope === s.id
                      ? "bg-white text-ink shadow-xs"
                      : "text-muted-warm hover:text-ink"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="block-location" className={LABEL_CLASSES}>
              Location
            </Label>
            <Select value={locationId} onValueChange={handleLocationChange}>
              <SelectTrigger id="block-location" className={TRIGGER_CLASSES}>
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

          {scope === "staff" && (
            <div className="space-y-2">
              <Label htmlFor="block-staff" className={LABEL_CLASSES}>
                Staff Member
              </Label>
              {staffOptions.length === 0 ? (
                <p className="rounded-xl bg-cream/80 px-4 py-3 text-sm font-light text-muted-warm">
                  No bookable staff at this location.
                </p>
              ) : (
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger id="block-staff" className={TRIGGER_CLASSES}>
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
              )}
            </div>
          )}

          {scope === "room" && (
            <div className="space-y-2">
              <Label htmlFor="block-room" className={LABEL_CLASSES}>
                Room
              </Label>
              {roomOptions.length === 0 ? (
                <p className="rounded-xl bg-cream/80 px-4 py-3 text-sm font-light text-muted-warm">
                  This location has no rooms to block.
                </p>
              ) : (
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger id="block-room" className={TRIGGER_CLASSES}>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {roomOptions.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-sm">
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="block-date" className={LABEL_CLASSES}>
              Date
            </Label>
            <Input
              id="block-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-full border-line bg-ivory/50 px-4 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="block-start" className={LABEL_CLASSES}>
                Start
              </Label>
              <Select value={startTime} onValueChange={handleStartChange}>
                <SelectTrigger id="block-start" className={TRIGGER_CLASSES}>
                  <SelectValue placeholder="Start time" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-64">
                  {START_OPTIONS.map((slot) => (
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
            <div className="space-y-2">
              <Label htmlFor="block-end" className={LABEL_CLASSES}>
                End
              </Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger id="block-end" className={TRIGGER_CLASSES}>
                  <SelectValue placeholder="End time" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-64">
                  {endOptions.map((slot) => (
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

          <div className="space-y-2">
            <Label htmlFor="block-reason" className={LABEL_CLASSES}>
              Reason
            </Label>
            <Input
              id="block-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Deep clean, maintenance, staff meeting…"
              className="h-11 rounded-full border-line bg-ivory/50 px-4 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50"
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
            <Button type="submit" disabled={!canSubmit || submitting}>
              <CalendarOff data-icon="inline-start" strokeWidth={1.75} />
              {submitting ? "Blocking…" : "Block Time"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
