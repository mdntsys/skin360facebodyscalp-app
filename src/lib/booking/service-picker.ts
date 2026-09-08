// New Appointment service list: search + a display-only Post-Cosmetic group.
// Rooms still use the DB category (Body for the consult) — do not write this back.

import type { Service } from "../../data/types";

export const FREE_CONSULTATION_ID = "svc-free-consultation";
export const POST_COSMETIC_HEADING = "Post-Cosmetic Surgery";

export type ServicePickerGroup = { heading: string; items: Service[] };

export function isPostCosmeticService(s: Pick<Service, "id" | "name">): boolean {
  if (s.id === FREE_CONSULTATION_ID) return true;
  const name = s.name.trim().toLowerCase();
  return name.startsWith("post-cosmetic") || name.startsWith("post cosmetic");
}

function orderPostCosmetic(items: Service[]): Service[] {
  const consult = items.filter((s) => s.id === FREE_CONSULTATION_ID);
  const rest = items.filter((s) => s.id !== FREE_CONSULTATION_ID);
  return [...consult, ...rest];
}

export function groupServicesForPicker(services: Service[]): ServicePickerGroup[] {
  const post: Service[] = [];
  const rest: Service[] = [];
  for (const s of services) {
    if (isPostCosmeticService(s)) post.push(s);
    else rest.push(s);
  }

  const groups: ServicePickerGroup[] = [];
  for (const s of rest) {
    const group = groups.find((g) => g.heading === s.category);
    if (group) group.items.push(s);
    else groups.push({ heading: s.category, items: [s] });
  }

  if (post.length === 0) return groups;
  const postGroup: ServicePickerGroup = {
    heading: POST_COSMETIC_HEADING,
    items: orderPostCosmetic(post),
  };
  const bodyIdx = groups.findIndex((g) => g.heading === "Body");
  if (bodyIdx === -1) groups.push(postGroup);
  else groups.splice(bodyIdx, 0, postGroup);
  return groups;
}

export function filterServiceGroups(
  groups: ServicePickerGroup[],
  query: string
): ServicePickerGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  const out: ServicePickerGroup[] = [];
  for (const g of groups) {
    if (g.heading.toLowerCase().includes(q)) {
      out.push(g);
      continue;
    }
    const items = g.items.filter((s) => s.name.toLowerCase().includes(q));
    if (items.length) out.push({ heading: g.heading, items });
  }
  return out;
}
