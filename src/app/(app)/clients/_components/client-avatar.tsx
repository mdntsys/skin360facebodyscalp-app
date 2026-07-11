import { cn } from "@/lib/utils";

export function ClientAvatar({
  firstName,
  lastName,
  className,
  initialsClassName,
}: {
  firstName: string;
  lastName: string;
  className?: string;
  initialsClassName?: string;
}) {
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-200/70 bg-gold-50",
        className
      )}
    >
      <span
        className={cn(
          "font-heading text-sm font-medium text-gold-700",
          initialsClassName
        )}
      >
        {initials}
      </span>
    </div>
  );
}
