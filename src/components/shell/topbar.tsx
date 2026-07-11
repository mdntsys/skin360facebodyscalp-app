"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, MapPin, Menu, Search, User } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { navItems } from "./nav";
import { useLocationFilter } from "./location-context";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { LocationFilter } from "@/data";

export function Topbar() {
  const { location, setLocation } = useLocationFilter();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-ivory/90 px-4 backdrop-blur-sm sm:px-6">
      {/* Mobile nav drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button
            className="flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" strokeWidth={1.75} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-line bg-white p-0">
          <SheetHeader className="border-b border-line px-6 py-5">
            <SheetTitle>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <nav className="space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-4 py-3 text-[15px] transition-colors",
                    active
                      ? "bg-gold-50 text-gold-700"
                      : "text-ink-soft hover:bg-cream"
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-5",
                      active ? "text-gold-600" : "text-muted-warm"
                    )}
                    strokeWidth={1.75}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Location switcher */}
      <Select
        value={location}
        onValueChange={(v) => setLocation(v as LocationFilter)}
      >
        <SelectTrigger
          className="h-10 w-auto gap-2 rounded-full border-gold-200 bg-white pr-3 pl-4 text-sm shadow-none hover:border-gold-300"
          aria-label="Location"
        >
          <MapPin className="size-4 text-gold-600" strokeWidth={1.75} />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          <SelectItem value="toluca">Toluca Lake</SelectItem>
          <SelectItem value="valencia">Valencia</SelectItem>
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative ml-auto hidden w-full max-w-xs md:block">
        <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-warm" />
        <Input
          placeholder="Search clients, appointments…"
          className="h-10 rounded-full border-line bg-white pl-10 shadow-none placeholder:text-muted-warm/70 focus-visible:border-gold-300"
        />
      </div>

      {/* Staff menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="ml-auto rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gold-300 md:ml-0">
          <Avatar className="size-10 border border-gold-200">
            <AvatarFallback className="bg-gold-50 font-heading text-sm text-gold-700">
              CA
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="font-normal">Carolina</div>
            <div className="text-xs font-light text-muted-warm">
              Owner · Lead Esthetician
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <User className="size-4" /> My profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/login")}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
