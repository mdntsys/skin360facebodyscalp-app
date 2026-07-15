"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  formatCurrency,
  useData,
  type Service,
  type ServiceCategory,
} from "@/data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Facials",
  "Advanced Treatments",
  "Body",
  "Scalp",
  "Nails",
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
            const items = services.filter((s) => s.category === cat);
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
