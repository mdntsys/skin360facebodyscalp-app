"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, format, isSameDay, isSameWeek, startOfWeek } from "date-fns";
import {
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import {
  formatCurrency,
  matchesLocation,
  useData,
  type Appointment,
  type AppointmentStatus,
} from "@/data";
import { useLocationFilter } from "@/components/shell/location-context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { AppointmentDrawer } from "./appointment-drawer";
import { BlockTimeDialog } from "./block-time-dialog";
import { DayView } from "./day-view";
import { ListView } from "./list-view";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { WeekView } from "./week-view";

type ViewMode = "day" | "week" | "list";

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "list", label: "List" },
];

export function AppointmentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { location } = useLocationFilter();
  const { appointments, clientName, updateAppointmentStatus } = useData();

  const [view, setView] = React.useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = React.useState(() => new Date());
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);

  // Open the booking dialog when arriving via /appointments?new=1
  React.useEffect(() => {
    if (searchParams.get("new") === "1") setNewOpen(true);
  }, [searchParams]);

  const handleNewOpenChange = React.useCallback(
    (open: boolean) => {
      setNewOpen(open);
      if (!open && searchParams.get("new") === "1") {
        router.replace("/appointments", { scroll: false });
      }
    },
    [router, searchParams]
  );

  const visible = React.useMemo(
    () => appointments.filter((a) => matchesLocation(a.locationId, location)),
    [appointments, location]
  );

  const viewWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  const scoped = React.useMemo(
    () =>
      visible.filter((a) =>
        view === "day"
          ? isSameDay(new Date(a.startISO), selectedDate)
          : isSameWeek(new Date(a.startISO), selectedDate, { weekStartsOn: 1 })
      ),
    [visible, view, selectedDate]
  );

  const booked = scoped.filter((a) => a.status !== "cancelled");
  const expectedRevenue = booked
    .filter((a) => a.status !== "no-show")
    .reduce((sum, a) => sum + a.price, 0);
  const completedCount = scoped.filter((a) => a.status === "completed").length;

  const navStep = view === "day" ? 1 : 7;
  const dateLabel =
    view === "day"
      ? format(selectedDate, "EEEE, MMMM d")
      : `${format(viewWeekStart, "MMM d")} – ${format(addDays(viewWeekStart, 6), "MMM d")}`;

  const selectedAppointment =
    appointments.find((a) => a.id === selectedId) ?? null;

  const updateStatus = React.useCallback(
    async (id: string, status: AppointmentStatus) => {
      const target = appointments.find((a) => a.id === id);
      const name = target ? clientName(target.clientId) : "Client";
      try {
        await updateAppointmentStatus(id, status);
      } catch {
        toast.error(`Couldn't update the appointment for ${name}. Please try again.`);
        return;
      }
      if (status === "checked-in") {
        toast.success(`${name} checked in`);
      } else if (status === "completed") {
        toast.success(`Appointment completed for ${name}`);
      } else if (status === "cancelled") {
        toast(`Appointment cancelled for ${name}`);
        setSelectedId(null);
      }
    },
    [appointments, clientName, updateAppointmentStatus]
  );

  const handleCreated = React.useCallback(
    (appt: Appointment) => {
      const start = new Date(appt.startISO);
      setSelectedDate(start);
      toast.success(
        `Appointment booked for ${clientName(appt.clientId)} · ${format(
          start,
          "EEE, MMM d 'at' h:mm a"
        )}`
      );
    },
    [clientName]
  );

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="The schedule across Toluca Lake & Valencia"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setBlockOpen(true)}>
              <CalendarOff data-icon="inline-start" strokeWidth={1.75} />
              Block Time
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus data-icon="inline-start" strokeWidth={1.75} />
              New Appointment
            </Button>
          </div>
        }
      />

      {/* View switcher + date navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-full border border-line bg-cream p-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                "h-10 min-w-16 rounded-full px-4 text-sm tracking-wide transition-colors",
                view === v.id
                  ? "bg-white text-ink shadow-xs"
                  : "text-muted-warm hover:text-ink"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous"
            onClick={() => setSelectedDate((d) => addDays(d, -navStep))}
          >
            <ChevronLeft strokeWidth={1.75} />
          </Button>
          <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next"
            onClick={() => setSelectedDate((d) => addDays(d, navStep))}
          >
            <ChevronRight strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      {/* Current period label + stats strip */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl text-ink sm:text-3xl">{dateLabel}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-light text-ink-soft shadow-xs">
            <CalendarDays className="size-3.5 text-gold-600" strokeWidth={1.75} />
            {booked.length} booked
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-light text-ink-soft shadow-xs">
            <DollarSign className="size-3.5 text-gold-600" strokeWidth={1.75} />
            {formatCurrency(expectedRevenue)} expected
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-light text-ink-soft shadow-xs">
            <CheckCircle2 className="size-3.5 text-emerald-600" strokeWidth={1.75} />
            {completedCount} completed
          </span>
        </div>
      </div>

      <div className="mt-4">
        {view === "day" && (
          <DayView
            date={selectedDate}
            appointments={scoped}
            locationFilter={location}
            onSelect={(a) => setSelectedId(a.id)}
          />
        )}
        {view === "week" && (
          <WeekView
            weekStart={viewWeekStart}
            appointments={scoped}
            locationFilter={location}
            onSelect={(a) => setSelectedId(a.id)}
          />
        )}
        {view === "list" && (
          <ListView appointments={scoped} onSelect={(a) => setSelectedId(a.id)} />
        )}
      </div>

      <AppointmentDrawer
        appointment={selectedAppointment}
        onClose={() => setSelectedId(null)}
        onUpdateStatus={updateStatus}
      />

      <NewAppointmentDialog
        open={newOpen}
        onOpenChange={handleNewOpenChange}
        defaultLocation={location}
        onCreate={handleCreated}
      />

      <BlockTimeDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        defaultLocation={location}
      />
    </>
  );
}
