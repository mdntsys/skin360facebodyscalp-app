import type { ClientTag } from "@/data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const CLIENT_TAGS: ClientTag[] = [
  "VIP",
  "Member",
  "New",
  "Post-Op",
  "Sensitive Skin",
  "Series Client",
];

export function TagBadge({
  tag,
  className,
}: {
  tag: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border-gold-200 bg-gold-50 px-2 py-0.5 text-[10px] font-normal tracking-wide text-gold-700",
        className
      )}
    >
      {tag}
    </Badge>
  );
}
