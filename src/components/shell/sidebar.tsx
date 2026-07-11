"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { navItems } from "./nav";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.5rem]" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-line",
          collapsed ? "justify-center px-2 py-5" : "px-6 py-5"
        )}
      >
        <Link href="/dashboard" aria-label="Skin 360 dashboard">
          <Logo compact={collapsed} />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-gold-50 font-normal text-gold-700"
                  : "text-ink-soft hover:bg-cream hover:text-ink"
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 h-5 w-0.5 rounded-full bg-gold" />
              )}
              <item.icon
                className={cn(
                  "size-[18px] shrink-0",
                  active ? "text-gold-600" : "text-muted-warm group-hover:text-ink-soft"
                )}
                strokeWidth={1.75}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm text-muted-warm transition-colors hover:bg-cream hover:text-ink",
            collapsed && "justify-center px-0"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} />
          ) : (
            <>
              <PanelLeftClose className="size-[18px]" strokeWidth={1.75} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
