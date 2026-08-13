"use client";

// Check out one visit: who was seen, which girl actually did the work
// (dropdown — Carolina's ask), what was charged + tip, and which tender took
// the money. If the client holds an active package for the treatment, the
// visit can burn a session instead of charging.

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  formatCurrency,
  useData,
  type Appointment,
  type LocationId,
  type PaymentMethod,
} from "@/data";
import { useLocationFilter } from "@/components/shell/location-context";
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

const TRIGGER_CLASSES =
  "h-11 w-full rounded-full border-line bg-ivory/50 px-4 text-sm font-light data-[size=default]:h-11 focus-visible:border-gold-300 focus-visible:ring-gold-200/50";
const LABEL_CLASSES = "text-xs tracking-wide uppercase text-muted-warm";
const INPUT_CLASSES =
  "h-11 rounded-full border-line bg-ivory/50 px-4 text-sm font-light focus-visible:border-gold-300 focus-visible:ring-gold-200/50";

const METHODS: PaymentMethod[] = [
  "GoDaddy Terminal",
  "Square Terminal",
  "Cash",
  "Gift Card",
  "None",
];

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Close out this appointment; null = walk-in quick sale. */
  appointment: Appointment | null;
  /** The close-out day being worked ("yyyy-MM-dd") — money is stamped to it. */
  day: string;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  appointment,
  day,
}: CheckoutDialogProps) {
  const {
    clients,
    services,
    staff,
    clientPackages,
    serviceById,
    clientName,
    recordCheckout,
  } = useData();
  const { location: locationFilter } = useLocationFilter();

  // Hold the last real appointment so the content doesn't flip to the
  // walk-in variant during the close animation.
  const lastApptRef = React.useRef<Appointment | null>(null);
  if (appointment) lastApptRef.current = appointment;
  const current = appointment ?? lastApptRef.current;
  const walkIn = !current;

  const [clientId, setClientId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [staffId, setStaffId] = React.useState("");
  const [locationId, setLocationId] = React.useState<LocationId>("valencia");
  const [amount, setAmount] = React.useState("");
  const [tip, setTip] = React.useState("0");
  const [method, setMethod] = React.useState<PaymentMethod>("GoDaddy Terminal");
  const [usePackage, setUsePackage] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Fresh form each time the dialog opens, prefilled from the appointment.
  React.useEffect(() => {
    if (!open) return;
    setClientId(appointment?.clientId ?? "");
    setServiceId(appointment?.serviceId ?? "");
    setStaffId(appointment?.staffId ?? "");
    setLocationId(
      appointment?.locationId ??
        (locationFilter === "toluca" ? "toluca" : "valencia")
    );
    setAmount(appointment ? String(appointment.price) : "");
    setTip("0");
    setMethod("GoDaddy Terminal");
    setUsePackage(false);
    setSubmitting(false);
  }, [open, appointment, locationFilter]);

  const sortedClients = React.useMemo(
    () =>
      [...clients].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        )
      ),
    [clients]
  );

  const activeServices = React.useMemo(
    () => services.filter((s) => s.active !== false),
    [services]
  );
  const serviceCategories = React.useMemo(
    () => [...new Set(activeServices.map((s) => s.category))],
    [activeServices]
  );

  // Which girl did the work — reality wins, so no capability filter here.
  const staffOptions = staff.filter((s) => s.locations.includes(locationId));

  const packageCandidate = React.useMemo(() => {
    if (!clientId || !serviceId) return undefined;
    return clientPackages.find(
      (cp) =>
        cp.clientId === clientId &&
        cp.serviceId === serviceId &&
        cp.sessionsUsed < cp.sessionsTotal
    );
  }, [clientPackages, clientId, serviceId]);

  const amountNum = usePackage ? 0 : Math.max(0, Number(amount) || 0);
  const tipNum = Math.max(0, Number(tip) || 0);
  const total = Math.round((amountNum + tipNum) * 100) / 100;
  // "None" is only for visits where no money moved (package session, no tip).
  const methodMismatch = total > 0 && method === "None";
  const canSubmit =
    Boolean(clientId && serviceId && staffId) && !methodMismatch && !submitting;

  function handleServiceChange(id: string) {
    setServiceId(id);
    setUsePackage(false);
    if (walkIn) {
      const svc = serviceById.get(id);
      setAmount(svc ? String(svc.price) : "");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    // Money is stamped to the day being closed out: the visit's own time for
    // appointments, right now for today's walk-ins, midday for backfills.
    const dateISO = current
      ? current.startISO
      : day === format(new Date(), "yyyy-MM-dd")
        ? new Date().toISOString()
        : new Date(`${day}T12:00:00`).toISOString();
    try {
      await recordCheckout({
        clientId,
        staffId,
        serviceId,
        locationId,
        subtotal: amountNum,
        tip: tipNum,
        // The tender only matters when money moved.
        method: total === 0 ? "None" : method,
        dateISO,
        appointmentId: current?.id,
        clientPackageId: usePackage ? packageCandidate?.id : undefined,
      });
      toast.success(
        `${clientName(clientId)} checked out — ${formatCurrency(total, { cents: true })}`
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't record the checkout."
      );
      setSubmitting(false);
    }
  }

  const service = serviceById.get(serviceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl bg-white p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-line bg-ivory/70 px-6 pt-7 pb-5">
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            {walkIn ? "Quick Sale" : "Check Out"}
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            {walkIn
              ? "Record a walk-in or phone booking that isn't on the calendar."
              : `${clientName(current?.clientId)} · ${service?.name ?? "Service"}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          {walkIn && (
            <>
              <div className="space-y-2">
                <Label htmlFor="co-location" className={LABEL_CLASSES}>
                  Location
                </Label>
                <Select
                  value={locationId}
                  onValueChange={(v) => {
                    setLocationId(v as LocationId);
                    setStaffId("");
                  }}
                >
                  <SelectTrigger id="co-location" className={TRIGGER_CLASSES}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="valencia" className="text-sm">
                      Valencia
                    </SelectItem>
                    <SelectItem value="toluca" className="text-sm">
                      Toluca Lake
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-client" className={LABEL_CLASSES}>
                  Client
                </Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger id="co-client" className={TRIGGER_CLASSES}>
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
                <Label htmlFor="co-service" className={LABEL_CLASSES}>
                  Treatment
                </Label>
                <Select value={serviceId} onValueChange={handleServiceChange}>
                  <SelectTrigger id="co-service" className={TRIGGER_CLASSES}>
                    <SelectValue placeholder="Select a treatment" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {serviceCategories.map((category) => (
                      <SelectGroup key={category}>
                        <SelectLabel>{category}</SelectLabel>
                        {activeServices
                          .filter((s) => s.category === category)
                          .map((s) => (
                            <SelectItem
                              key={s.id}
                              value={s.id}
                              className="text-sm"
                            >
                              {s.name} · ${s.price}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="co-staff" className={LABEL_CLASSES}>
              Performed by
            </Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger id="co-staff" className={TRIGGER_CLASSES}>
                <SelectValue placeholder="Who did the work?" />
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

          {packageCandidate && (
            <div className="flex items-center justify-between rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3">
              <div>
                <p className="text-sm text-ink">Use package session</p>
                <p className="text-xs font-light text-muted-warm">
                  {packageCandidate.sessionsTotal - packageCandidate.sessionsUsed}{" "}
                  of {packageCandidate.sessionsTotal} sessions left — treatment
                  is covered, no charge.
                </p>
              </div>
              <Switch checked={usePackage} onCheckedChange={setUsePackage} />
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="co-amount" className={LABEL_CLASSES}>
                Amount
              </Label>
              <Input
                id="co-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={usePackage ? "0" : amount}
                disabled={usePackage}
                onChange={(e) => setAmount(e.target.value)}
                className={INPUT_CLASSES}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-tip" className={LABEL_CLASSES}>
                Tip
              </Label>
              <Input
                id="co-tip"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                className={INPUT_CLASSES}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="co-method" className={LABEL_CLASSES}>
              Paid with
            </Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
            >
              <SelectTrigger id="co-method" className={TRIGGER_CLASSES}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="text-sm">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {methodMismatch && (
              <p className="text-xs text-destructive">
                Money changed hands — pick the machine (or cash) that took it.
              </p>
            )}
          </div>

          <div className="flex items-baseline justify-between rounded-2xl bg-cream px-4 py-3">
            <span className={LABEL_CLASSES}>Total</span>
            <span className="font-heading text-2xl text-ink">
              {formatCurrency(total, { cents: true })}
            </span>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Recording…" : "Record Checkout"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
