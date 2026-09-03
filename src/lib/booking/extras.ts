// Extra services on one visit: official add-ons for the main's category,
// plus other mains in that same category (fill + pedi). Combined duration
// and price live on a single appointment row.

import type { Service } from "../../data/types";

export function isAddonService(s: Service): boolean {
  return Boolean(s.addonFor && s.addonFor.length > 0);
}

export function extraAttachesToMain(main: Service, extra: Service): boolean {
  if (extra.id === main.id) return false;
  if (extra.active === false) return false;
  if (isAddonService(extra)) return extra.addonFor!.includes(main.category);
  return extra.category === main.category;
}

export function extrasForMain(
  main: Service,
  services: Service[],
  performerServiceIds?: string[]
): Service[] {
  const canDo = (s: Service) =>
    !performerServiceIds ||
    performerServiceIds.length === 0 ||
    performerServiceIds.includes(s.id);
  return services
    .filter((s) => s.active !== false && extraAttachesToMain(main, s) && canDo(s))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function combinedDuration(main: Service, extras: Service[]): number {
  return main.durationMin + extras.reduce((sum, s) => sum + s.durationMin, 0);
}

export function combinedPrice(main: Service, extras: Service[]): number {
  return main.price + extras.reduce((sum, s) => sum + s.price, 0);
}

export function appointmentServiceLabel(
  a: { serviceId: string; addonServiceIds?: string[] },
  serviceById: Map<string, { name: string }>
): string {
  const main = serviceById.get(a.serviceId)?.name ?? a.serviceId;
  const extras = (a.addonServiceIds ?? [])
    .map((id) => serviceById.get(id)?.name)
    .filter((n): n is string => Boolean(n));
  return extras.length ? `${main} + ${extras.join(", ")}` : main;
}
