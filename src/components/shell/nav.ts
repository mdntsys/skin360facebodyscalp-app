import {
  BarChart3,
  CalendarDays,
  Gem,
  Gift,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Appointments", href: "/appointments", icon: CalendarDays },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Memberships", href: "/memberships", icon: Gem },
  { label: "Packages", href: "/packages", icon: Gift },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];
