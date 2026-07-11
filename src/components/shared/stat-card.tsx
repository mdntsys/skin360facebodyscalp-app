import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  hintTone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  hintTone?: "positive" | "negative" | "neutral";
  className?: string;
}) {
  return (
    <Card className={cn("border-line bg-white shadow-xs", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-normal tracking-[0.14em] text-muted-warm uppercase">
            {label}
          </p>
          <p className="mt-2 font-heading text-3xl leading-none text-ink">
            {value}
          </p>
          {hint && (
            <p
              className={cn(
                "mt-2 text-xs font-light",
                hintTone === "positive" && "text-emerald-700",
                hintTone === "negative" && "text-destructive",
                hintTone === "neutral" && "text-muted-warm"
              )}
            >
              {hint}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-50">
            <Icon className="size-[18px] text-gold-600" strokeWidth={1.75} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
