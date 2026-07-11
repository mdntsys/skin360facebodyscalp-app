import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-full bg-gold-gradient font-heading text-lg text-white",
          className
        )}
      >
        S
      </div>
    );
  }
  return (
    <div className={cn("select-none", className)}>
      <div className="font-heading text-2xl leading-none tracking-wide text-ink">
        Skin <span className="text-gold-600">360</span>
      </div>
      <div className="mt-1 text-[0.6rem] font-normal tracking-[0.28em] text-muted-warm uppercase">
        Face · Body · Scalp
      </div>
    </div>
  );
}
