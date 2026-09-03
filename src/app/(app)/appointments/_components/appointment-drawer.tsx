"use client";

import * as React from "react";
import { format } from "date-fns";
import { Check, HandCoins, LogIn, Pencil, Phone, X } from "lucide-react";

import {
  appointmentServiceLabel,
  formatCurrency,
  useData,
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
  onEdit,
  onCheckout,
  checkedOut = false,
  mode = "full",
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: AppointmentStatus) => void;
  onEdit?: (appt: Appointment) => void;
  /** Staff close-out from their schedule. */
  onCheckout?: (appt: Appointment) => void;
  checkedOut?: boolean;
  /**
   * "full" is Carolina's calendar. "cancel-only" is a girl opening her own
   * schedule: read the note, and cancel if the client called her directly.
   */
  mode?: "full" | "cancel-only";
}) {
  const { clientById, serviceById, staffById, locationById, roomById } =
    useData();
  const updateStatus = onUpdateStatus;
  const [confirmingCancel, setConfirmingCancel] = React.useState(false);

  // Drop back out of "are you sure" when the sheet closes or moves on.
  React.useEffect(() => {
    if (!appointment) setConfirmingCancel(false);
  }, [appointment?.id, appointment]);

  // Keep the last appointment rendered during the close animation.
  const lastRef = React.useRef<Appointment | null>(null);
  if (appointment) lastRef.current = appointment;
  const appt = appointment ?? lastRef.current;

  if (!appt) return null;

  const client = clientById.get(appt.clientId);
  const staffMember = staffById.get(appt.staffId);
  const room = appt.roomId ? roomById.get(appt.roomId) : undefined;
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
            <DetailRow label="Service">
              {appointmentServiceLabel(appt, serviceById)}
            </DetailRow>
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
            {room && <DetailRow label="Room">{room.name}</DetailRow>}
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
        {mode === "cancel-only" &&
          (appt.status === "confirmed" || appt.status === "checked-in") &&
          (onCheckout || updateStatus) && (
            <div className="space-y-2 border-t border-line bg-ivory/50 px-6 py-5">
              {onCheckout && !checkedOut && !confirmingCancel && (
                <Button
                  className="w-full"
                  onClick={() => onCheckout(appt)}
                >
                  <HandCoins data-icon="inline-start" strokeWidth={1.75} />
                  Check Out
                </Button>
              )}
              {onCheckout && checkedOut && !confirmingCancel && (
                <p className="text-center text-sm font-light text-emerald-700">
                  Already checked out
                </p>
              )}
              {updateStatus &&
                (confirmingCancel ? (
                  <>
                    <p className="pb-1 text-center text-sm font-light text-muted-warm">
                      Cancel this one? It comes off your schedule, and we&apos;ll
                      email the client if we have their address.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => updateStatus(appt.id, "cancelled")}
                    >
                      <X data-icon="inline-start" strokeWidth={1.75} />
                      Yes, cancel it
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setConfirmingCancel(false)}
                    >
                      Keep it
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setConfirmingCancel(true)}
                  >
                    <X data-icon="inline-start" strokeWidth={1.75} />
                    Cancel Appointment
                  </Button>
                ))}
            </div>
          )}

        {updateStatus && mode === "full" && (
          <div className="space-y-2 border-t border-line bg-ivory/50 px-6 py-5">
            {appt.status === "confirmed" && (
              <>
                <Button
                  className="w-full"
                  onClick={() => updateStatus(appt.id, "checked-in")}
                >
                  <LogIn data-icon="inline-start" strokeWidth={1.75} />
                  Check In
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => updateStatus(appt.id, "completed")}
                >
                  <Check data-icon="inline-start" strokeWidth={1.75} />
                  Mark Completed
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => updateStatus(appt.id, "cancelled")}
                >
                  <X data-icon="inline-start" strokeWidth={1.75} />
                  Cancel Appointment
                </Button>
              </>
            )}
            {appt.status === "checked-in" && (
              <Button
                className="w-full"
                onClick={() => updateStatus(appt.id, "completed")}
              >
                <Check data-icon="inline-start" strokeWidth={1.75} />
                Mark Completed
              </Button>
            )}
            {(appt.status === "confirmed" || appt.status === "checked-in") &&
              onEdit && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onEdit(appt)}
                >
                  <Pencil data-icon="inline-start" strokeWidth={1.75} />
                  Edit Appointment
                </Button>
              )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
