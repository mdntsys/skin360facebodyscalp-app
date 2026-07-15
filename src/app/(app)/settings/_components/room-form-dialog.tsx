"use client";

import * as React from "react";
import { toast } from "sonner";

import type { Room, ServiceCategory } from "@/data";
import type { RoomInput } from "@/data/provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Facials",
  "Advanced Treatments",
  "Body",
  "Scalp",
  "Nails",
];

const fieldClass =
  "h-10 rounded-full border-line bg-ivory/50 px-4 text-sm focus-visible:border-gold-300";
const labelClass = "text-xs tracking-wide uppercase text-muted-warm";

export function RoomFormDialog({
  open,
  onOpenChange,
  locationName,
  room,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationName: string;
  /** null = add mode; a room = edit mode (prefilled) */
  room: Room | null;
  onSubmit: (values: Omit<RoomInput, "locationId" | "sort">) => Promise<void>;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [capacity, setCapacity] = React.useState("1");
  const [categories, setCategories] = React.useState<ServiceCategory[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setName(room?.name ?? "");
    setCapacity(String(room?.capacity ?? 1));
    setCategories(room?.categories ?? []);
  }, [open, room]);

  function toggleCategory(cat: ServiceCategory, checked: boolean) {
    setCategories((prev) =>
      checked
        ? SERVICE_CATEGORIES.filter((c) => prev.includes(c) || c === cat)
        : prev.filter((c) => c !== cat)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please give the room a name.");
      return;
    }
    if (categories.length === 0) {
      toast.error("Pick at least one service category for this room.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        capacity: Math.min(9, Math.max(1, Math.round(Number(capacity) || 1))),
        categories,
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
      <DialogContent className="rounded-3xl bg-white p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            {room ? "Edit Room" : "Add Room"}
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            {room
              ? `Update this treatment room at ${locationName}.`
              : `Add a treatment room at ${locationName}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name" className={labelClass}>
              Name *
            </Label>
            <Input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Facial/Body Room"
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-capacity" className={labelClass}>
              Capacity
            </Label>
            <Input
              id="room-capacity"
              type="number"
              min={1}
              max={9}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className={`${fieldClass} w-28`}
            />
            <p className="text-xs font-light text-muted-warm">
              How many appointments can run in this room at once.
            </p>
          </div>

          <div className="space-y-2">
            <p className={labelClass}>Service categories *</p>
            <div className="space-y-2.5 rounded-2xl border border-line/70 bg-ivory/50 p-4">
              {SERVICE_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex cursor-pointer items-center gap-3"
                >
                  <Checkbox
                    checked={categories.includes(cat)}
                    onCheckedChange={(checked) =>
                      toggleCategory(cat, checked === true)
                    }
                  />
                  <span className="text-sm text-ink-soft">{cat}</span>
                </label>
              ))}
            </div>
            <p className="text-xs font-light text-muted-warm">
              Only services in these categories can be booked into this room.
            </p>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : room ? "Save Changes" : "Add Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
