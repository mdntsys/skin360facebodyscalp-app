"use client";

// Schedule — the girls' page. A staff login lands here and nowhere else:
// a read-only week of appointments, phone-first. RLS decides whether they
// see just their own column or every girl's (app_settings switch); this
// page just renders whatever rows come back and labels them.

import * as React from "react";
import { addDays, addMinutes, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

import { matchesLocation, useData, type Appointment } from "@/data";
import { useLocationFilter } from "@/components/shell/location-context";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
  const {
    appointments,
    clientName,
    serviceById,
    staffById,
    roomById,
    locationById,
    profile,
    appSettings,
  } = useData();
  const { location } = useLocationFilter();

  const isStaff = profile?.access === "staff";
  const seesAll = !isStaff || appSettings.staffSeesAllSchedules;
  const myStaffId = profile?.staffId ?? null;

  const [anchor, setAnchor] = React.useState(() => new Date());
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // RLS already limits what a staff login receives; the local filter just
  // keeps the UI honest if the sees-all switch flips mid-session.
  const visible = React.useMemo(
    () =>
      appointments
        .filter((a) => a.status !== "cancelled")
        .filter((a) => matchesLocation(a.locationId, location))
        .filter((a) => seesAll || !myStaffId || a.staffId === myStaffId)
        .sort((a, b) => a.startISO.localeCompare(b.startISO)),
    [appointments, location, seesAll, myStaffId]
  );

  const unlinked = isStaff && !myStaffId && !seesAll;

  const weekLabel = `${format(weekStart, "MMM d")} – ${format(
    addDays(weekStart, 6),
    "MMM d"
  )}`;

  return (
    <>
      <PageHeader
        title={seesAll ? "Schedule" : "Your Schedule"}
        subtitle={
          seesAll
            ? "The week ahead for the whole team"
            : "Your appointments for the week ahead"
        }
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous week"
              onClick={() => setAnchor((d) => addDays(d, -7))}
            >
              <ChevronLeft strokeWidth={1.75} />
            </Button>
            <Button variant="outline" onClick={() => setAnchor(new Date())}>
              This Week
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next week"
              onClick={() => setAnchor((d) => addDays(d, 7))}
            >
              <ChevronRight strokeWidth={1.75} />
            </Button>
          </div>
        }
      />

      <h2 className="mt-2 text-2xl text-ink sm:text-3xl">{weekLabel}</h2>

      {unlinked ? (
        <Card className="mt-5 border-line bg-white shadow-xs">
          <CardContent className="px-6 py-12 text-center">
            <p className="text-sm font-light text-muted-warm">
              This login isn&apos;t linked to the schedule yet — ask Carolina to
              finish setting it up.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-5 space-y-4">
          {days.map((day) => {
            const dayAppointments = visible.filter((a) =>
              isSameDay(new Date(a.startISO), day)
            );
            const today = isToday(day);
            return (
              <Card
                key={day.toISOString()}
                className={cn(
                  "gap-0 border-line bg-white py-0 shadow-xs",
                  today && "border-gold-300"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3",
                    today && "bg-gold-50/60"
                  )}
                >
                  <p className="text-sm text-ink">
                    {format(day, "EEEE")}{" "}
                    <span className="font-light text-muted-warm">
                      {format(day, "MMM d")}
                    </span>
                  </p>
                  {today ? (
                    <span className="rounded-full border border-gold-200 bg-white px-2.5 py-0.5 text-[11px] font-normal text-gold-700">
                      Today
                    </span>
                  ) : (
                    <span className="text-xs font-light text-muted-warm">
                      {dayAppointments.length > 0 &&
                        `${dayAppointments.length} booked`}
                    </span>
                  )}
                </div>
                {dayAppointments.length === 0 ? (
                  <p className="px-5 py-4 text-sm font-light text-muted-warm">
                    No appointments
                  </p>
                ) : (
                  <div className="divide-y divide-line/70">
                    {dayAppointments.map((a) => (
                      <ScheduleRow
                        key={a.id}
                        appointment={a}
                        showStaff={seesAll}
                        clientName={clientName}
                        serviceName={serviceById.get(a.serviceId)?.name}
                        staffMember={staffById.get(a.staffId)}
                        roomName={
                          a.roomId ? roomById.get(a.roomId)?.name : undefined
                        }
                        locationName={
                          locationById.get(a.locationId)?.shortName
                        }
                      />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CalendarDays
                className="size-5 text-muted-warm"
                strokeWidth={1.75}
              />
              <p className="text-sm font-light text-muted-warm">
                Nothing booked this week yet.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ScheduleRow({
  appointment: a,
  showStaff,
  clientName,
  serviceName,
  staffMember,
  roomName,
  locationName,
}: {
  appointment: Appointment;
  showStaff: boolean;
  clientName: (id: string) => string;
  serviceName?: string;
  staffMember?: { name: string; color: string };
  roomName?: string;
  locationName?: string;
}) {
  const start = new Date(a.startISO);
  const end = addMinutes(start, a.durationMin);
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="w-24 shrink-0 sm:w-32">
        <p className="text-sm text-ink tabular-nums">{format(start, "h:mm a")}</p>
        <p className="text-xs font-light text-muted-warm tabular-nums">
          until {format(end, "h:mm a")}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">{clientName(a.clientId)}</p>
        <p className="truncate text-xs font-light text-muted-warm">
          {[serviceName, `${a.durationMin} min`, roomName]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {showStaff && staffMember && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-light text-muted-warm">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: staffMember.color }}
            />
            {staffMember.name}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {a.status !== "confirmed" && <StatusBadge status={a.status} />}
        {locationName && (
          <span className="inline-flex items-center gap-1 text-[11px] font-light text-muted-warm">
            <MapPin className="size-3" strokeWidth={1.75} />
            {locationName}
          </span>
        )}
      </div>
    </div>
  );
}
