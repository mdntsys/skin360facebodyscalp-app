"use client";

// Sell a series to a client: 10 x the SAME treatment (Carolina's rule —
// prices differ per treatment, so the series price comes from the treatment),
// paid up front. Checkout burns one session per visit.

import * as React from "react";
import { toast } from "sonner";

import {
  formatCurrency,
  useData,
  type LocationId,
  type PaymentMethod,
  type ServicePackage,
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

const TRIGGER_CLASSES =
  "h-11 w-full rounded-full border-line bg-ivory/50 px-4 text-sm font-light data-[size=default]:h-11 focus-visible:border-gold-300 focus-visible:ring-gold-200/50";
const LABEL_CLASSES = "text-xs tracking-wide uppercase text-muted-warm";

const METHODS: PaymentMethod[] = [
  "GoDaddy Terminal",
  "Square Terminal",
  "Cash",
  "Gift Card",
];

interface SellPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offering: ServicePackage | null;
}

export function SellPackageDialog({
  open,
  onOpenChange,
  offering,
}: SellPackageDialogProps) {
  const { clients, services, serviceById, clientName, sellPackage } = useData();
  const { location: locationFilter } = useLocationFilter();

  const [clientId, setClientId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [locationId, setLocationId] = React.useState<LocationId>("valencia");
  const [method, setMethod] = React.useState<PaymentMethod>("GoDaddy Terminal");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setClientId("");
    setServiceId("");
    setLocationId(locationFilter === "toluca" ? "toluca" : "valencia");
    setMethod("GoDaddy Terminal");
    setSubmitting(false);
  }, [open, locationFilter]);

  const sortedClients = React.useMemo(
    () =>
      [...clients].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        )
      ),
    [clients]
  );

  // Series are for real, priced treatments — no add-ons, no consult pricing.
  const eligibleServices = React.useMemo(
    () =>
      services.filter(
        (s) => s.active !== false && !(s.addonFor && s.addonFor.length) && s.price > 0
      ),
    [services]
  );
  const categories = React.useMemo(
    () => [...new Set(eligibleServices.map((s) => s.category))],
    [eligibleServices]
  );

  const service = serviceById.get(serviceId);
  const sessions = offering?.sessions ?? 0;
  const discountPct = offering?.discountPct ?? 0;
  const fullPrice = service ? sessions * service.price : 0;
  const price = Math.round(fullPrice * (1 - discountPct / 100) * 100) / 100;
  const canSubmit = Boolean(offering && clientId && serviceId) && !submitting;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!offering || !canSubmit) return;
    setSubmitting(true);
    try {
      await sellPackage({
        clientId,
        serviceId,
        packageId: offering.id,
        locationId,
        method,
      });
      toast.success(
        `${clientName(clientId)} — ${sessions}× ${service?.name} for ${formatCurrency(price, { cents: true })}`
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't record the package sale."
      );
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl bg-white p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-line bg-ivory/70 px-6 pt-7 pb-5">
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            Sell {offering?.name ?? "Package"}
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            {sessions} sessions of one treatment, {discountPct}% off, paid up
            front. Sessions get used up at checkout automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="sell-client" className={LABEL_CLASSES}>
              Client
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="sell-client" className={TRIGGER_CLASSES}>
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
            <Label htmlFor="sell-service" className={LABEL_CLASSES}>
              Treatment
            </Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger id="sell-service" className={TRIGGER_CLASSES}>
                <SelectValue placeholder="Which treatment is the series for?" />
              </SelectTrigger>
              <SelectContent position="popper">
                {categories.map((category) => (
                  <SelectGroup key={category}>
                    <SelectLabel>{category}</SelectLabel>
                    {eligibleServices
                      .filter((s) => s.category === category)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-sm">
                          {s.name} · ${s.price}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sell-location" className={LABEL_CLASSES}>
              Location
            </Label>
            <Select
              value={locationId}
              onValueChange={(v) => setLocationId(v as LocationId)}
            >
              <SelectTrigger id="sell-location" className={TRIGGER_CLASSES}>
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
            <Label htmlFor="sell-method" className={LABEL_CLASSES}>
              Paid with
            </Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
            >
              <SelectTrigger id="sell-method" className={TRIGGER_CLASSES}>
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
          </div>

          <div className="rounded-2xl bg-cream px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className={LABEL_CLASSES}>Price today</span>
              <span className="font-heading text-2xl text-ink">
                {service ? formatCurrency(price, { cents: true }) : "—"}
              </span>
            </div>
            {service && (
              <p className="mt-1 text-xs font-light text-muted-warm">
                {sessions} × {formatCurrency(service.price)} ={" "}
                {formatCurrency(fullPrice)} − {discountPct}% ={" "}
                {formatCurrency(price, { cents: true })}
              </p>
            )}
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
              {submitting ? "Recording…" : "Record Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
