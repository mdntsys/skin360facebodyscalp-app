"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

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

export interface PlanFormValues {
  name: string;
  monthlyPrice: number;
  billingCycle: "Monthly" | "Quarterly";
  perks: string[];
}

const fieldClass =
  "h-10 rounded-full border-line bg-ivory/50 px-4 text-sm focus-visible:border-gold-300";
const labelClass = "text-xs tracking-wide uppercase text-muted-warm";

export function CreatePlanDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PlanFormValues) => Promise<void>;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [cycle, setCycle] = React.useState<"Monthly" | "Quarterly">("Monthly");
  const [perks, setPerks] = React.useState<string[]>([]);
  const [perkDraft, setPerkDraft] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setPrice("");
    setCycle("Monthly");
    setPerks([]);
    setPerkDraft("");
  }, [open]);

  function addPerk() {
    const perk = perkDraft.trim();
    if (!perk) return;
    setPerks((prev) => [...prev, perk]);
    setPerkDraft("");
  }

  function removePerk(index: number) {
    setPerks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a plan name.");
      return;
    }
    const monthlyPrice = Number(price);
    if (!monthlyPrice || monthlyPrice <= 0) {
      toast.error("Please enter a monthly price.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        monthlyPrice,
        billingCycle: cycle,
        perks,
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
            Create Membership
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            Build a new recurring membership plan for your clients.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name" className={labelClass}>
              Plan Name *
            </Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Glow Society"
              className={fieldClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-price" className={labelClass}>
                Monthly Price *
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-muted-warm">
                  $
                </span>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="129"
                  className={`${fieldClass} pl-8`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-cycle" className={labelClass}>
                Billing Cycle
              </Label>
              <Select
                value={cycle}
                onValueChange={(v) => setCycle(v as "Monthly" | "Quarterly")}
              >
                <SelectTrigger
                  id="plan-cycle"
                  className={`w-full ${fieldClass} data-[size=default]:h-10`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-perk" className={labelClass}>
              Perks
            </Label>
            <div className="flex gap-2">
              <Input
                id="plan-perk"
                value={perkDraft}
                onChange={(e) => setPerkDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPerk();
                  }
                }}
                placeholder="e.g. One Classic Facial each month"
                className={fieldClass}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={addPerk}
                className="shrink-0"
              >
                <Plus data-icon="inline-start" strokeWidth={1.75} />
                Add perk
              </Button>
            </div>
            {perks.length > 0 && (
              <ul className="mt-1 space-y-1.5">
                {perks.map((perk, i) => (
                  <li
                    key={`${perk}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-full bg-gold-50/70 py-1.5 pr-1.5 pl-4 text-sm text-ink-soft"
                  >
                    <span className="min-w-0 truncate">{perk}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removePerk(i)}
                    >
                      <X strokeWidth={1.75} />
                      <span className="sr-only">Remove perk</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create Membership"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
