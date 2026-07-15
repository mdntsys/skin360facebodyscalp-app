"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useData, type AvailabilityOverride } from "@/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import {
  FIELD_CLASSES,
  LABEL_CLASSES,
  TIME_OPTIONS,
  fmtTime,
} from "./shared";

type OverrideKind = "day-off" | "partial" | "extra";

const KIND_LABELS: Record<OverrideKind, string> = {
  "day-off": "Day off",
  partial: "Partial unavailability",
  extra: "Extra shift",
};

function overrideLabel(o: AvailabilityOverride): string {
  if (o.available) {
    return o.startTime && o.endTime
      ? `Extra shift ${fmtTime(o.startTime)}–${fmtTime(o.endTime)}`
      : "Extra shift";
  }
  if (o.startTime && o.endTime) {
    return `Unavailable ${fmtTime(o.startTime)}–${fmtTime(o.endTime)}`;
  }
  return "Day off";
}

export function TimeOff({ staffId }: { staffId: string }) {
  const {
    availabilityOverrides,
    addAvailabilityOverride,
    deleteAvailabilityOverride,
    staffById,
  } = useData();

  const [open, setOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const [date, setDate] = React.useState("");
  const [kind, setKind] = React.useState<OverrideKind>("day-off");
  const [startTime, setStartTime] = React.useState("10:00");
  const [endTime, setEndTime] = React.useState("14:00");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const firstName = staffById.get(staffId)?.name.split(" ")[0] ?? "this provider";

  const upcoming = availabilityOverrides.filter(
    (o) => o.staffId === staffId && o.dateISO >= todayStr
  );

  // Fresh form each time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setDate(todayStr);
      setKind("day-off");
      setStartTime("10:00");
      setEndTime("14:00");
      setNote("");
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const needsTimes = kind !== "day-off";
  const canSubmit = Boolean(
    date && (!needsTimes || (startTime && endTime && startTime < endTime))
  );

  const handleStartChange = (value: string) => {
    setStartTime(value);
    if (endTime <= value) {
      setEndTime(TIME_OPTIONS.find((o) => o.value > value)?.value ?? endTime);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || submitting || !staffId) return;
    setSubmitting(true);
    try {
      await addAvailabilityOverride({
        staffId,
        dateISO: date,
        available: kind === "extra",
        startTime: needsTimes ? startTime : undefined,
        endTime: needsTimes ? endTime : undefined,
        note: note.trim() ? note.trim() : undefined,
      });
      toast.success(
        kind === "extra"
          ? `Extra shift added for ${firstName}`
          : `Time off added for ${firstName}`
      );
      setOpen(false);
    } catch {
      toast.error("Couldn't save that change. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAvailabilityOverride(id);
      toast.success("Removed from the schedule");
    } catch {
      toast.error("Couldn't remove it. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="border-line bg-white shadow-xs">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="font-heading text-xl font-medium">
            Time Off &amp; Extra Shifts
          </CardTitle>
          <p className="text-xs font-light text-muted-warm">
            Upcoming one-day changes for {firstName}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" strokeWidth={1.75} />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 && (
          <p className="py-8 text-center text-sm font-light text-muted-warm">
            No time off scheduled.
          </p>
        )}
        <div className="divide-y divide-line/70">
          {upcoming.map((o) => (
            <div
              key={o.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm text-ink">
                    {format(parseISO(o.dateISO), "EEE, MMM d, yyyy")}
                  </p>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-[11px]",
                      o.available
                        ? "bg-gold-50 text-gold-700"
                        : "bg-cream text-ink-soft"
                    )}
                  >
                    {overrideLabel(o)}
                  </span>
                </div>
                {o.note && (
                  <p className="mt-1 truncate text-xs font-light text-muted-warm">
                    {o.note}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={deletingId === o.id}
                onClick={() => handleDelete(o.id)}
                aria-label={`Remove override on ${o.dateISO}`}
              >
                <Trash2 strokeWidth={1.75} />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl bg-white p-0 sm:max-w-md">
          <DialogHeader className="border-b border-line bg-ivory/70 px-6 pt-7 pb-5">
            <DialogTitle className="font-heading text-2xl font-medium text-ink">
              Time Off / Extra Shift
            </DialogTitle>
            <DialogDescription className="text-sm font-light text-muted-warm">
              One-day change to {firstName}&apos;s regular schedule.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="override-date" className={LABEL_CLASSES}>
                  Date
                </Label>
                <Input
                  id="override-date"
                  type="date"
                  min={todayStr}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={FIELD_CLASSES}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="override-kind" className={LABEL_CLASSES}>
                  Type
                </Label>
                <Select
                  value={kind}
                  onValueChange={(v) => setKind(v as OverrideKind)}
                >
                  <SelectTrigger id="override-kind" className={FIELD_CLASSES}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {(Object.keys(KIND_LABELS) as OverrideKind[]).map((k) => (
                      <SelectItem key={k} value={k} className="text-sm">
                        {KIND_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {needsTimes && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="override-start" className={LABEL_CLASSES}>
                    From
                  </Label>
                  <Select value={startTime} onValueChange={handleStartChange}>
                    <SelectTrigger
                      id="override-start"
                      className={FIELD_CLASSES}
                    >
                      <SelectValue placeholder="Start" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-64">
                      {TIME_OPTIONS.slice(0, -1).map((o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          className="text-sm"
                        >
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="override-end" className={LABEL_CLASSES}>
                    To
                  </Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger id="override-end" className={FIELD_CLASSES}>
                      <SelectValue placeholder="End" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-64">
                      {TIME_OPTIONS.filter((o) => o.value > startTime).map(
                        (o) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            className="text-sm"
                          >
                            {o.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="override-note" className={LABEL_CLASSES}>
                Note <span className="normal-case">(optional)</span>
              </Label>
              <Input
                id="override-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Family trip, conference…"
                className={FIELD_CLASSES}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Saving…" : "Add to schedule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
