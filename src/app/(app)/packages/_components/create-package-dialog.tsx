"use client";

import * as React from "react";
import { MoveRight } from "lucide-react";
import { toast } from "sonner";

import { formatCurrency, useData } from "@/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

export interface PackageFormValues {
  name: string;
  serviceId: string;
  sessions: number;
  discountPct: number;
  fullPrice: number;
  price: number;
}

const fieldClass =
  "h-10 rounded-full border-line bg-ivory/50 px-4 text-sm focus-visible:border-gold-300";
const labelClass = "text-xs tracking-wide uppercase text-muted-warm";

export function CreatePackageDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PackageFormValues) => Promise<void>;
}) {
  const { services, serviceById } = useData();
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [sessions, setSessions] = React.useState("10");
  const [discount, setDiscount] = React.useState("15");

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setServiceId("");
    setSessions("10");
    setDiscount("15");
  }, [open]);

  const service = serviceId ? serviceById.get(serviceId) : undefined;
  const sessionCount = Math.max(0, Math.round(Number(sessions) || 0));
  const discountPct = Math.min(100, Math.max(0, Number(discount) || 0));
  const fullPrice = service ? sessionCount * service.price : 0;
  const salePrice = fullPrice * (1 - discountPct / 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a package name.");
      return;
    }
    if (!service) {
      toast.error("Please choose a service.");
      return;
    }
    if (sessionCount < 1) {
      toast.error("Please enter at least one session.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        serviceId: service.id,
        sessions: sessionCount,
        discountPct,
        fullPrice,
        price: Math.round(salePrice * 100) / 100,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl bg-white p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            Create Package
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            Bundle a service into a discounted multi-session series.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="package-name" className={labelClass}>
              Package Name *
            </Label>
            <Input
              id="package-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Series of 10 Sessions"
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="package-service" className={labelClass}>
              Service
            </Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger
                id="package-service"
                className={`w-full ${fieldClass} data-[size=default]:h-10`}
              >
                <SelectValue placeholder="Choose a service" />
              </SelectTrigger>
              <SelectContent position="popper">
                {services.length === 0 && (
                  <div className="px-3 py-2 text-sm font-light text-muted-warm">
                    No services yet.
                  </div>
                )}
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {formatCurrency(s.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="package-sessions" className={labelClass}>
                Number of Sessions
              </Label>
              <Input
                id="package-sessions"
                type="number"
                min={1}
                value={sessions}
                onChange={(e) => setSessions(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-discount" className={labelClass}>
                Discount %
              </Label>
              <Input
                id="package-discount"
                type="number"
                min={0}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {service && sessionCount > 0 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-gold-100 bg-gold-50/60 px-4 py-3 text-sm text-ink-soft">
              <span>
                {sessionCount} × {formatCurrency(service.price)} ={" "}
                <span className="text-muted-warm line-through">
                  {formatCurrency(fullPrice, { cents: true })}
                </span>
              </span>
              <MoveRight
                className="size-4 text-gold-600"
                strokeWidth={1.75}
              />
              <span className="font-medium text-gold-700">
                {formatCurrency(salePrice, { cents: true })}
              </span>
              {discountPct > 0 && (
                <span className="text-xs font-light text-muted-warm">
                  ({discountPct}% off)
                </span>
              )}
            </div>
          )}

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create Package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
