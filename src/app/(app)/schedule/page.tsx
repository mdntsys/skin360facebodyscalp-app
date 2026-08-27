"use client";

// Schedule — the girls' page. A staff login lands here and nowhere else.
// They can book onto their own column (phone-ins). RLS still hides money,
// forms, and other girls' days off. The sees-all switch only widens the
// week view; this page renders whatever rows come back.

import * as React from "react";
import { addDays, addMinutes, format, isSameDay, isToday, startOfWeek } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

import {
  matchesLocation,
  useData,
  type Appointment,
} from "@/data";
import { useLocationFilter } from "@/components/shell/location-context";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AppointmentDrawer } from "../appointments/_components/appointment-drawer";
import { NewAppointmentDialog } from "../appointments/_components/new-appointment-dialog";

export default function SchedulePage() {
  const {
    appointments,
    serviceById,
    staffById,
    roomById,
    locationById,
    profile,
    appSettings,
    clientById,
    clientName,
  } = useData();
  const { location } = useLocationFilter();

  const isStaff = profile?.access === "staff";
  const seesAll = !isStaff || appSettings.staffSeesAllSchedules;
  const myStaffId = profile?.staffId ?? null;
  const canBook = Boolean(isStaff && myStaffId);

  const [anchor, setAnchor] = React.useState(() => new Date());
  const [bookOpen, setBookOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Appointment | null>(null);
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

  const handleBooked = React.useCallback(
    (appt: Appointment) => {
      const start = new Date(appt.startISO);
      setAnchor(start);
      const name = clientName(appt.clientId);
      const when = format(start, "EEE, MMM d 'at' h:mm a");
      const hasEmail = Boolean(clientById.get(appt.clientId)?.email?.trim());
      toast.success(
        hasEmail
          ? `Booked ${name} · ${when}. Confirmation emailed.`
          : `Booked ${name} · ${when}. No email on file — they didn't get a confirmation.`
      );
    },
    [clientName, clientById]
  );

  return (
    <>
      <PageHeader
        title={seesAll ? "Schedule" : "Your Schedule"}
        subtitle={
          canBook
            ? "Your week — book a client when they call"
            : seesAll
              ? "The week ahead for the whole team"
              : "Your appointments for the week ahead"
        }
        actions={
          <div className="flex items-center gap-1.5">
            {canBook && (
              <Button onClick={() => setBookOpen(true)}>
                <Plus data-icon="inline-start" strokeWidth={1.75} />
                Book
              </Button>
            )}
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
                        onOpen={() => setSelected(a)}
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

      <AppointmentDrawer
        appointment={selected}
        onClose={() => setSelected(null)}
        readOnly
      />

      {canBook && myStaffId && (
        <NewAppointmentDialog
          open={bookOpen}
          onOpenChange={setBookOpen}
          defaultLocation={location}
          lockedStaffId={myStaffId}
          onCreate={handleBooked}
        />
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
  onOpen,
}: {
  appointment: Appointment;
  showStaff: boolean;
  clientName: (id: string) => string;
  serviceName?: string;
  staffMember?: { name: string; color: string };
  roomName?: string;
  locationName?: string;
  onOpen: () => void;
}) {
  const start = new Date(a.startISO);
  const end = addMinutes(start, a.durationMin);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-cream/60 focus-visible:bg-cream/60 focus-visible:outline-none"
    >
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
        {a.note && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-light text-ink-soft italic">
            <StickyNote className="size-3 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{a.note}</span>
          </p>
        )}
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
    </button>
  );
}
