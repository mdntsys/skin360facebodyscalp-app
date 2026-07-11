"use client";

import * as React from "react";
import { format } from "date-fns";
import { Check, LogIn, Pencil, Phone, X } from "lucide-react";

import {
  clientById,
  formatCurrency,
  locationById,
  serviceById,
  staffById,
  type Appointment,
  type AppointmentStatus,
} from "@/data";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5">
      <span className="pt-0.5 text-[11px] font-normal tracking-[0.14em] text-muted-warm uppercase">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm text-ink">{children}</span>
    </div>
  );
}

export function AppointmentDrawer({
  appointment,
  onClose,
  onUpdateStatus,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
}) {
  // Keep the last appointment rendered during the close animation.
  const lastRef = React.useRef<Appointment | null>(null);
  if (appointment) lastRef.current = appointment;
  const appt = appointment ?? lastRef.current;

  if (!appt) return null;

  const client = clientById.get(appt.clientId);
  const service = serviceById.get(appt.serviceId);
  const staffMember = staffById.get(appt.staffId);
  const start = new Date(appt.startISO);
  const initials = client
    ? `${client.firstName[0]}${client.lastName[0]}`
    : "?";

  return (
    <Sheet
      open={!!appointment}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 border-l border-line bg-white p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        {/* Client header */}
        <div className="border-b border-line bg-ivory/70 px-6 pt-10 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-gold-200 bg-gold-50 font-heading text-xl text-gold-700">
              {initials}
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate font-heading text-2xl font-medium text-ink">
                {client
                  ? `${client.firstName} ${client.lastName}`
                  : "Unknown client"}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Appointment details
              </SheetDescription>
              {client && (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-light text-muted-warm">
                  <Phone className="size-3.5" strokeWidth={1.75} />
                  {client.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="divide-y divide-line/70">
            <DetailRow label="Service">{service?.name}</DetailRow>
            <DetailRow label="Date & Time">
              {format(start, "EEE, MMM d · h:mm a")}
            </DetailRow>
            <DetailRow label="Duration">{appt.durationMin} min</DetailRow>
            <DetailRow label="Price">{formatCurrency(appt.price)}</DetailRow>
            <DetailRow label="Staff">
              <span className="flex items-center justify-end gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: staffMember?.color }}
                />
                {staffMember?.name}
              </span>
            </DetailRow>
            <DetailRow label="Location">
              {locationById.get(appt.locationId)?.shortName}
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={appt.status} />
            </DetailRow>
            {appt.note && (
              <div className="py-3.5">
                <p className="text-[11px] font-normal tracking-[0.14em] text-muted-warm uppercase">
                  Note
                </p>
                <p className="mt-2 rounded-xl bg-cream/80 px-3.5 py-3 text-sm font-light text-ink-soft italic">
                  {appt.note}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 border-t border-line bg-ivory/50 px-6 py-5">
          {appt.status === "confirmed" && (
            <>
              <Button
                className="w-full"
                onClick={() => onUpdateStatus(appt.id, "checked-in")}
              >
                <LogIn data-icon="inline-start" strokeWidth={1.75} />
                Check In
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onUpdateStatus(appt.id, "completed")}
              >
                <Check data-icon="inline-start" strokeWidth={1.75} />
                Mark Completed
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => onUpdateStatus(appt.id, "cancelled")}
              >
                <X data-icon="inline-start" strokeWidth={1.75} />
                Cancel Appointment
              </Button>
            </>
          )}
          {appt.status === "checked-in" && (
            <Button
              className="w-full"
              onClick={() => onUpdateStatus(appt.id, "completed")}
            >
              <Check data-icon="inline-start" strokeWidth={1.75} />
              Mark Completed
            </Button>
          )}
          <Button variant="ghost" className="w-full" disabled>
            <Pencil data-icon="inline-start" strokeWidth={1.75} />
            Edit Appointment
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
