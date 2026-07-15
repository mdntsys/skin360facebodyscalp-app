"use client";

import * as React from "react";
import { CopyCheck, Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  useData,
  type AvailabilityRule,
  type LocationId,
  type NewAvailabilityRule,
} from "@/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { COMPACT_FIELD_CLASSES, TIME_OPTIONS, WEEKDAYS } from "./shared";

interface Range {
  key: string;
  locationId: LocationId;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

/** Index 0 = Sunday … 6 = Saturday, matching AvailabilityRule.weekday. */
type Week = Range[][];

const START_OPTIONS = TIME_OPTIONS.slice(0, -1);

function buildWeek(rules: AvailabilityRule[]): Week {
  const week: Week = Array.from({ length: 7 }, () => []);
  for (const r of rules) {
    if (r.weekday < 0 || r.weekday > 6) continue;
    week[r.weekday].push({
      key: r.id,
      locationId: r.locationId,
      startTime: r.startTime.slice(0, 5),
      endTime: r.endTime.slice(0, 5),
    });
  }
  for (const day of week) {
    day.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return week;
}

/** Key-independent fingerprint so dirty tracking survives reordering. */
function fingerprint(week: Week): string {
  return JSON.stringify(
    week.map((day) =>
      day.map((r) => `${r.locationId}|${r.startTime}|${r.endTime}`).sort()
    )
  );
}

// Sun–Fri 10:00–18:00, Sat 09:00–16:00, all at Valencia.
function storeHoursWeek(): Week {
  return Array.from({ length: 7 }, (_, weekday) => [
    weekday === 6
      ? {
          key: "store-6",
          locationId: "valencia" as LocationId,
          startTime: "09:00",
          endTime: "16:00",
        }
      : {
          key: `store-${weekday}`,
          locationId: "valencia" as LocationId,
          startTime: "10:00",
          endTime: "18:00",
        },
  ]);
}

let rangeCounter = 0;
function nextKey(): string {
  rangeCounter += 1;
  return `new-${rangeCounter}`;
}

export function WeeklySchedule({ staffId }: { staffId: string }) {
  const {
    availabilityRules,
    saveAvailabilityRules,
    locations,
    staffById,
    appSettings,
  } = useData();

  const baseline = React.useMemo(
    () => buildWeek(availabilityRules.filter((r) => r.staffId === staffId)),
    [availabilityRules, staffId]
  );

  const [week, setWeek] = React.useState<Week>(baseline);
  const [saving, setSaving] = React.useState(false);

  // Re-sync whenever the selected provider or their saved rules change.
  React.useEffect(() => {
    setWeek(baseline);
  }, [baseline]);

  const dirty = fingerprint(week) !== fingerprint(baseline);
  const firstName = staffById.get(staffId)?.name.split(" ")[0] ?? "this provider";

  const addRange = (weekday: number) => {
    setWeek((prev) =>
      prev.map((day, i) =>
        i === weekday
          ? [
              ...day,
              {
                key: nextKey(),
                locationId: "valencia" as LocationId,
                startTime: "10:00",
                endTime: "18:00",
              },
            ]
          : day
      )
    );
  };

  const removeRange = (weekday: number, key: string) => {
    setWeek((prev) =>
      prev.map((day, i) =>
        i === weekday ? day.filter((r) => r.key !== key) : day
      )
    );
  };

  const updateRange = (weekday: number, key: string, patch: Partial<Range>) => {
    setWeek((prev) =>
      prev.map((day, i) =>
        i === weekday
          ? day.map((r) => (r.key === key ? { ...r, ...patch } : r))
          : day
      )
    );
  };

  // Keep the range valid: bump the end forward if the new start passes it.
  const handleStartChange = (weekday: number, key: string, value: string) => {
    setWeek((prev) =>
      prev.map((day, i) =>
        i !== weekday
          ? day
          : day.map((r) => {
              if (r.key !== key) return r;
              const endTime =
                r.endTime > value
                  ? r.endTime
                  : (TIME_OPTIONS.find((o) => o.value > value)?.value ??
                    r.endTime);
              return { ...r, startTime: value, endTime };
            })
      )
    );
  };

  const handleSave = async () => {
    if (!dirty || saving || !staffId) return;
    const rules: NewAvailabilityRule[] = [];
    week.forEach((day, weekday) => {
      for (const r of day) {
        if (r.endTime <= r.startTime) continue;
        rules.push({
          locationId: r.locationId,
          weekday,
          startTime: r.startTime,
          endTime: r.endTime,
        });
      }
    });
    setSaving(true);
    try {
      await saveAvailabilityRules(staffId, rules);
      toast.success(`Weekly schedule saved for ${firstName}`);
    } catch {
      toast.error("Couldn't save the schedule. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-line bg-white shadow-xs">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="font-heading text-xl font-medium">
            Weekly Schedule
          </CardTitle>
          <p className="text-xs font-light text-muted-warm">
            {firstName}&apos;s recurring working hours
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeek(storeHoursWeek())}
          >
            <CopyCheck data-icon="inline-start" strokeWidth={1.75} />
            Copy store hours
          </Button>
          <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save schedule"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 rounded-2xl bg-cream/70 px-4 py-3 text-xs font-light text-muted-warm">
          Skin 360 runs on a contractor (1099) model — providers set their own
          hours. Schedule changes should be locked in at least{" "}
          {appSettings.minNoticeHours} hours ahead so bookings stay accurate.
        </p>

        <div className="divide-y divide-line/70">
          {week.map((ranges, weekday) => (
            <div
              key={weekday}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start"
            >
              <div className="w-24 shrink-0 pt-1.5 text-sm text-ink">
                {WEEKDAYS[weekday]}
              </div>
              <div className="flex-1 space-y-2">
                {ranges.length === 0 && (
                  <p className="pt-1.5 text-sm font-light text-muted-warm">
                    Not working
                  </p>
                )}
                {ranges.map((r) => (
                  <div
                    key={r.key}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <Select
                      value={r.locationId}
                      onValueChange={(v) =>
                        updateRange(weekday, r.key, {
                          locationId: v as LocationId,
                        })
                      }
                    >
                      <SelectTrigger
                        className={cn(COMPACT_FIELD_CLASSES, "w-32")}
                        aria-label="Location"
                      >
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {locations.map((l) => (
                          <SelectItem
                            key={l.id}
                            value={l.id}
                            className="text-sm"
                          >
                            {l.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={r.startTime}
                      onValueChange={(v) =>
                        handleStartChange(weekday, r.key, v)
                      }
                    >
                      <SelectTrigger
                        className={cn(COMPACT_FIELD_CLASSES, "w-28")}
                        aria-label="Start time"
                      >
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-64">
                        {START_OPTIONS.map((o) => (
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
                    <span className="text-xs font-light text-muted-warm">
                      to
                    </span>
                    <Select
                      value={r.endTime}
                      onValueChange={(v) =>
                        updateRange(weekday, r.key, { endTime: v })
                      }
                    >
                      <SelectTrigger
                        className={cn(COMPACT_FIELD_CLASSES, "w-28")}
                        aria-label="End time"
                      >
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-64">
                        {TIME_OPTIONS.filter(
                          (o) => o.value > r.startTime
                        ).map((o) => (
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
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRange(weekday, r.key)}
                      aria-label={`Remove hours on ${WEEKDAYS[weekday]}`}
                    >
                      <X strokeWidth={1.75} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => addRange(weekday)}
              >
                <Plus data-icon="inline-start" strokeWidth={1.75} />
                Add hours
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
