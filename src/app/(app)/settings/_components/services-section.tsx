"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  formatCurrency,
  useData,
  type Service,
  type ServiceCategory,
} from "@/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Facials",
  "Advanced Treatments",
  "Face Add-Ons",
  "Body",
  "Scalp",
  "Nails",
  "Lash + Brow + Wax",
];

function clampBuffer(raw: string): number {
  const n = Math.round(Number(raw) || 0);
  return Math.min(60, Math.max(0, n));
}

function BufferInput({ service }: { service: Service }) {
  const { updateService } = useData();
  const [value, setValue] = React.useState(String(service.bufferMin));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setValue(String(service.bufferMin));
  }, [service.bufferMin]);

  async function commit() {
    const next = clampBuffer(value);
    setValue(String(next));
    if (next === service.bufferMin) return;
    setSaving(true);
    try {
      await updateService(service.id, { bufferMin: next });
      toast.success(`${service.name} buffer set to ${next} min.`);
    } catch (err) {
      setValue(String(service.bufferMin));
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={`buffer-${service.id}`} className="sr-only">
        Wind-down buffer for {service.name}
      </Label>
      <Input
        id={`buffer-${service.id}`}
        type="number"
        min={0}
        max={60}
        step={5}
        value={value}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-8 w-20 rounded-full border-line bg-ivory/50 px-3 text-center text-sm tabular-nums focus-visible:border-gold-300"
      />
      <span className="text-xs font-light whitespace-nowrap text-muted-warm">
        min buffer
      </span>
    </div>
  );
}

const fieldClass =
  "h-10 rounded-full border-line bg-ivory/50 px-4 text-sm focus-visible:border-gold-300";
const labelClass = "text-xs tracking-wide uppercase text-muted-warm";

export function AddServiceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createService } = useData();
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<ServiceCategory>("Body");
  const [price, setPrice] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setCategory("Body");
    setPrice("");
    setDuration("");
    setDescription("");
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const priceN = Number(price);
    const durationN = Math.round(Number(duration));
    if (!trimmed) {
      toast.error("Please enter a service name.");
      return;
    }
    if (!Number.isFinite(priceN) || priceN < 0) {
      toast.error("Please enter a price.");
      return;
    }
    if (!Number.isFinite(durationN) || durationN < 1) {
      toast.error("Please enter duration in minutes.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createService({
        name: trimmed,
        category,
        price: priceN,
        durationMin: durationN,
        description: description.trim(),
      });
      toast.success(`${created.name} is on the menu.`);
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
            Add service
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            Shows in New Appointment and online booking. Girls who already
            do this category will be able to perform it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="svc-name" className={labelClass}>
              Name
            </Label>
            <Input
              id="svc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
              placeholder="Bionexis Lite Pro"
            />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ServiceCategory)}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="svc-price" className={labelClass}>
                Price
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-muted-warm">
                  $
                </span>
                <Input
                  id="svc-price"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`${fieldClass} pl-8`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-duration" className={labelClass}>
                Minutes
              </Label>
              <Input
                id="svc-duration"
                type="number"
                min={1}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-desc" className={labelClass}>
              Description{" "}
              <span className="normal-case tracking-normal">(optional)</span>
            </Label>
            <Textarea
              id="svc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-2xl border-line bg-ivory/50 px-4 py-3 text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ServicesSection() {
  const { services } = useData();

  return (
    <Card className="max-w-3xl border-line bg-white shadow-xs">
      <CardContent className="p-6 sm:p-8">
        <p className="mb-6 text-xs font-light text-muted-warm">
          Wind-down buffer: room and provider stay reserved this long after
          the service.
        </p>
        {services.length === 0 && (
          <p className="py-8 text-center text-sm font-light text-muted-warm">
            No services on the menu yet.
          </p>
        )}
        <div className="space-y-8">
          {SERVICE_CATEGORIES.map((cat) => {
            const items = services.filter(
              (s) => s.category === cat && s.active !== false
            );
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="mb-2 flex items-center gap-4">
                  <h3 className="shrink-0 text-xl text-ink">{cat}</h3>
                  <div className="h-px flex-1 bg-gold-200/70" />
                </div>
                <div className="divide-y divide-line/70">
                  {items.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">{svc.name}</p>
                        <p className="text-xs font-light text-muted-warm">
                          {svc.durationMin} min
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-5">
                        <BufferInput service={svc} />
                        <span className="w-16 text-right font-heading text-lg text-ink tabular-nums">
                          {formatCurrency(svc.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
