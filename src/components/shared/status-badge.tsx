import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const tones: Record<string, string> = {
  // appointments
  confirmed: "bg-gold-50 text-gold-700 border-gold-200",
  "checked-in": "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-neutral-100 text-neutral-500 border-neutral-200",
  "no-show": "bg-red-50 text-red-700 border-red-200",
  // members
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  "past-due": "bg-red-50 text-red-700 border-red-200",
  // generic
  "low-stock": "bg-red-50 text-red-700 border-red-200",
  "in-stock": "bg-emerald-50 text-emerald-700 border-emerald-200",
  recurring: "bg-gold-50 text-gold-700 border-gold-200",
};

const labels: Record<string, string> = {
  "checked-in": "Checked in",
  "no-show": "No-show",
  "past-due": "Past due",
  "low-stock": "Low stock",
  "in-stock": "In stock",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const label =
    labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[11px] font-normal capitalize",
        tones[status] ?? "bg-cream text-ink-soft border-line",
        className
      )}
    >
      {label}
    </Badge>
  );
}
