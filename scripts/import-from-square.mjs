#!/usr/bin/env node
/**
 * One-way import from Carolina's PRODUCTION Square into the app DB
 * (post-Square pivot: the app is now the booking authority).
 *
 *   1. Catalog: every APPOINTMENTS_SERVICE variation → app `services` rows
 *      (name-matched against existing rows; new ones inserted).
 *   2. Bookings: upcoming ACCEPTED/PENDING → `clients` + `appointments`,
 *      with rooms assigned by the same greedy rules the engine uses.
 *
 * READ-ONLY against Square. Emits SQL for review — applies nothing itself:
 *   scratchpad/square-catalog.sql
 *   scratchpad/square-appointments.sql
 *   scratchpad/square-variation-map.json
 *
 * Re-runnable at cutover: appointments upsert on square_booking_id, and a
 * trailing statement cancels future imported rows whose Square booking
 * disappeared (cancelled in Square since the last run).
 *
 * Run: node scripts/import-from-square.mjs [--out <dir>]
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://connect.squareup.com";
const OUT_DIR =
  process.argv.includes("--out")
    ? process.argv[process.argv.indexOf("--out") + 1]
    : "scratchpad";

function loadToken() {
  if (process.env.SQUARE_PROD_ACCESS_TOKEN)
    return process.env.SQUARE_PROD_ACCESS_TOKEN;
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = env
      .split("\n")
      .find((l) => l.startsWith("SQUARE_PROD_ACCESS_TOKEN="));
    if (line) return line.split("=").slice(1).join("=").trim();
  } catch {
    /* fall through */
  }
  console.error("Missing SQUARE_PROD_ACCESS_TOKEN (env var or .env.local).");
  process.exit(1);
}

const TOKEN = loadToken();

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`FAIL ${method} ${path} → ${res.status}`);
    console.error(JSON.stringify(json.errors ?? json, null, 2));
    process.exit(1);
  }
  return json;
}

// --- Fixed app-side reference data (mirrors the live Supabase config) --------

const ROOMS = [
  { id: "4c50446e-04d9-40f5-9b07-2e78d232e7cc", name: "Head Spa Room", capacity: 1, categories: ["Scalp"], sort: 1 },
  { id: "f2e429ec-b0f8-4cda-a070-925f0d98b93f", name: "Body Room", capacity: 1, categories: ["Body", "Lash + Brow + Wax"], sort: 2 },
  { id: "54edcf94-0592-4d3d-bd87-692f8c39ae24", name: "Facial/Body Room", capacity: 2, categories: ["Facials", "Advanced Treatments", "Body", "Face Add-Ons", "Lash + Brow + Wax"], sort: 3 },
  { id: "8caf0584-d7d3-4e01-b15e-c55a8e88b080", name: "Nails Room", capacity: 1, categories: ["Nails"], sort: 4 },
];

const STAFF_BY_SQUARE_ID = {
  TMOhLVJPHpnuC7p3: "staff-carolina",
  TMFiLZwpxFbM3c79: "staff-karen",
  TMFsZaMuRzzXcTZR: "staff-josseline",
  TMgkriRkbvlgvHTL: "staff-gloria",
  "TMeZqLp6HnRxtu_-": "staff-catalina",
  TMKXibsIKYwXph_b: "staff-dom",
  TM7EOW9IJ4UjL8Mw: "staff-cassie",
  "TMsgue0vL0-AwmZi": "staff-vero",
};

const CATEGORY_MAP = {
  FACE: "Facials",
  "FACE ADD-ON SERVICES": "Face Add-Ons",
  BODY: "Body",
  "POST-COSMETIC SUREGERY SERVICES": "Body",
  "POST-COSMETIC SURGERY SERVICES": "Body",
  "HEAD SPA (SCALP)": "Scalp",
  "HEADSPA ADD-ON SERVICES": "Scalp",
  "NAIL SERVICES": "Nails",
  "NAIL ADD-ON SERVICES": "Nails",
};
/** Her Square data uses unicode dashes (‑ – —) — normalize to ASCII. */
const asciiDashes = (s) => s.replace(/[‐-―−]/g, "-").replace(/‑/g, "-");

function appCategory(squareCategoryName) {
  if (!squareCategoryName) return null;
  const upper = asciiDashes(squareCategoryName).toUpperCase().trim();
  if (upper.startsWith("LASH")) return "Lash + Brow + Wax";
  return CATEGORY_MAP[upper] ?? null;
}

/** "Classic Facial – $145 (55 Min)" -> "Classic Facial" (price/duration are fields). */
function cleanName(raw) {
  let s = asciiDashes(raw);
  const dollar = s.indexOf("$");
  if (dollar >= 0) s = s.slice(0, dollar);
  return s.replace(/[\s\-–—:]+$/g, "").replace(/\s+/g, " ").trim() || raw.trim();
}

// Existing app services, matched by normalized name.
const EXISTING_SERVICES = [
  ["svc-procell", "Procell Microchannel Therapy", "Advanced Treatments"],
  ["svc-zero-gravity", "Skin Zero Gravity Face Treatment", "Advanced Treatments"],
  ["svc-lymphatic", "Brazilian Lymphatic Drainage", "Body"],
  ["svc-lymphatic-cavitation", "Brazilian Lymphatic Drainage with Cavitation", "Body"],
  ["svc-post-op-body", "Post Cosmetic Surgery — Body", "Body"],
  ["svc-addon-24k-gold", "99.9% 24K Gold Therapy", "Face Add-Ons"],
  ["svc-addon-oxygen-dome", "Oxygen Dome LED + Infrared Infusion", "Face Add-Ons"],
  ["svc-classic-facial", "Classic Facial", "Facials"],
  ["svc-derma-glow", "Derma Glow Facial", "Facials"],
  ["svc-signature-facial", "Signature Customized Facial", "Facials"],
  ["svc-gel-manicure", "Gel Manicure", "Nails"],
  ["svc-japanese-scalp", "Japanese Signature Scalp Treatment", "Scalp"],
  ["svc-luxury-scalp", "Skin 360 Luxury Scalp Experience", "Scalp"],
];
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const EXISTING_BY_NORM = new Map(EXISTING_SERVICES.map(([id, name]) => [norm(name), id]));
// Square names that differ from the seeded app names but are the same service.
const ALIASES = {
  brazilianlymphaticdrainagecavitation: "svc-lymphatic-cavitation",
  postcosmeticsurgerybodyonly: "svc-post-op-body",
  gelmanicureorpedicure: "svc-gel-manicure",
  skin360luxuryscalpexperience: "svc-luxury-scalp",
};
for (const [k, v] of Object.entries(ALIASES)) EXISTING_BY_NORM.set(k, v);
const EXISTING_IDS = new Set(EXISTING_SERVICES.map(([id]) => id));

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qn = (s) => (s == null || s === "" ? "null" : q(s));

function slugId(name, taken) {
  let base = "svc-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  taken.add(id);
  return id;
}

// --- 1. Catalog --------------------------------------------------------------

async function fetchCatalog() {
  const items = [], categories = new Map();
  let cursor;
  do {
    const res = await api("GET", `/v2/catalog/list?types=ITEM,CATEGORY${cursor ? `&cursor=${cursor}` : ""}`);
    for (const obj of res.objects ?? []) {
      if (obj.type === "CATEGORY") categories.set(obj.id, obj.category_data?.name ?? "");
      if (obj.type === "ITEM") items.push(obj);
    }
    cursor = res.cursor;
  } while (cursor);
  return { items, categories };
}

const warnings = [];
const locs = await api("GET", "/v2/locations");
const locationId = (locs.locations ?? [])[0]?.id;
if (!locationId) {
  console.error("No Square location found");
  process.exit(1);
}
const { items, categories } = await fetchCatalog();

const variationMap = {}; // square variation id -> {serviceId, category, priceCents, durationMin}
const newServices = [];
const diffs = [];
const takenIds = new Set(EXISTING_IDS);

const matchedIds = new Set();
for (const item of items) {
  const d = item.item_data ?? {};
  if (d.product_type !== "APPOINTMENTS_SERVICE") continue;
  // Respect location visibility — Cleopatra was "deleted" by unchecking it
  // from every location, so it must not come back through the import.
  const presentHere = item.present_at_all_locations
    ? !(item.absent_at_location_ids ?? []).includes(locationId)
    : (item.present_at_location_ids ?? []).includes(locationId);
  if (!presentHere) {
    warnings.push(`Skipped hidden service (not at this location): ${cleanName(d.name ?? "?")}`);
    continue;
  }
  const catId = d.reporting_category?.id ?? d.categories?.[0]?.id ?? d.category_id;
  const squareCat = categories.get(catId) ?? "";
  const category = appCategory(squareCat);
  const variations = d.variations ?? [];
  for (const v of variations) {
    const vd = v.item_variation_data ?? {};
    const hasVariationName = vd.name && !/^(regular)?$/i.test(vd.name.trim());
    const vName = cleanName(hasVariationName ? `${d.name} — ${vd.name}` : d.name);
    const durationMin = vd.service_duration ? Math.round(vd.service_duration / 60000) : null;
    const priceCents = vd.price_money?.amount ?? null;
    const matched = EXISTING_BY_NORM.get(norm(vName)) ?? (variations.length === 1 ? EXISTING_BY_NORM.get(norm(cleanName(d.name))) : undefined);
    if (!category && !matched) {
      warnings.push(`SKIPPED service (unmapped Square category "${squareCat}"): ${vName}`);
      continue;
    }
    let serviceId = matched;
    if (!serviceId) {
      serviceId = slugId(vName, takenIds);
      const isAddon = category === "Face Add-Ons" || (squareCat || "").toUpperCase().includes("ADD-ON");
      newServices.push({
        id: serviceId,
        name: vName,
        category,
        price: priceCents != null ? (priceCents / 100).toFixed(2) : "0.00",
        durationMin: durationMin ?? 60,
        bufferMin: isAddon ? 0 : 15,
        description: (d.description_plaintext ?? d.description ?? "").trim(),
      });
      if (durationMin == null) warnings.push(`No duration on Square for "${vName}" — defaulted 60 min`);
      if (priceCents == null || priceCents === 0) warnings.push(`Variable/zero price on Square for "${vName}" — imported as $0`);
    } else {
      matchedIds.add(serviceId);
      // Square is the menu she maintains — its name/price/duration win.
      diffs.push({ serviceId, name: vName, squarePrice: priceCents != null ? (priceCents / 100).toFixed(2) : null, squareDuration: durationMin });
    }
    variationMap[v.id] = { serviceId, category: category ?? "unknown", priceCents, durationMin };
  }
}

let catalogSql = `-- Generated by scripts/import-from-square.mjs — Square catalog import.\n\n-- New services from her live Square menu.\n`;
for (const s of newServices) {
  catalogSql += `insert into services (id, name, category, price, duration_min, buffer_min, description, active)\n  values (${q(s.id)}, ${q(s.name)}, ${q(s.category)}, ${s.price}, ${s.durationMin}, ${s.bufferMin}, ${q(s.description)}, true)\n  on conflict (id) do nothing;\n`;
}
catalogSql += `\n-- Matched services: Square's live menu wins on name/price/duration.\n`;
for (const d of diffs) {
  const sets = [`name = ${q(d.name)}`];
  if (d.squarePrice != null) sets.push(`price = ${d.squarePrice}`);
  if (d.squareDuration != null) sets.push(`duration_min = ${d.squareDuration}`);
  catalogSql += `update services set ${sets.join(", ")} where id = ${q(d.serviceId)};\n`;
}
const stale = EXISTING_SERVICES.map(([id]) => id).filter((id) => !matchedIds.has(id));
if (stale.length) {
  catalogSql += `\n-- App services with no Square counterpart — hide from the menu.\nupdate services set active = false where id in (${stale.map(q).join(", ")});\n`;
}
catalogSql += `\n-- Re-scope the girls' capabilities now that the full menu exists.\nupdate staff set service_ids = (select coalesce(array_agg(id), '{}') from services where category = 'Body' and active)\n  where id in ('staff-karen', 'staff-catalina');\nupdate staff set service_ids = (select coalesce(array_agg(id), '{}') from services where category in ('Facials', 'Face Add-Ons') and active)\n  where id in ('staff-josseline', 'staff-gloria');\nupdate staff set service_ids = (select coalesce(array_agg(id), '{}') from services where category = 'Scalp' and active)\n  where id = 'staff-dom';\nupdate staff set service_ids = (select coalesce(array_agg(id), '{}') from services where category in ('Nails', 'Lash + Brow + Wax') and active)\n  where id = 'staff-cassie';\nupdate staff set service_ids = (select coalesce(array_agg(id), '{}') from services where category = 'Nails' and active and name ~* 'manicure|pedicure|mani' and name !~* 'full nail set|nail fill')\n  where id = 'staff-vero';\n`;

// --- 2. Bookings -------------------------------------------------------------

async function fetchBookings() {
  // Square caps each query at 31 days — walk 30-day windows over 180 days.
  const out = [];
  const DAY = 24 * 3600 * 1000;
  for (let from = Date.now(); from < Date.now() + 180 * DAY; from += 30 * DAY) {
    const min = new Date(from).toISOString();
    const max = new Date(from + 30 * DAY).toISOString();
    let cursor;
    do {
      const params = new URLSearchParams({ location_id: locationId, start_at_min: min, start_at_max: max, limit: "100" });
      if (cursor) params.set("cursor", cursor);
      const res = await api("GET", `/v2/bookings?${params}`);
      out.push(...(res.bookings ?? []));
      cursor = res.cursor;
    } while (cursor);
  }
  const seen = new Set();
  return out.filter((b) => {
    if (seen.has(b.id) || !["ACCEPTED", "PENDING"].includes(b.status)) return false;
    seen.add(b.id);
    return true;
  });
}

const bookings = (await fetchBookings()).sort((a, b) => a.start_at.localeCompare(b.start_at));

// Customers referenced by those bookings.
const customerIds = [...new Set(bookings.map((b) => b.customer_id).filter(Boolean))];
const customers = new Map();
for (const id of customerIds) {
  const res = await api("GET", `/v2/customers/${id}`);
  customers.set(id, res.customer ?? {});
}

// Greedy chronological room assignment (same rules as the engine: category
// match, capacity, lowest sort first; occupancy = duration + buffer).
const roomOccupancy = new Map(ROOMS.map((r) => [r.id, []]));
function assignRoom(category, startMs, endMs) {
  const candidates = ROOMS.filter((r) => r.categories.includes(category)).sort((a, b) => a.sort - b.sort);
  for (const room of candidates) {
    const busy = roomOccupancy.get(room.id).filter(([s, e]) => s < endMs && startMs < e).length;
    if (busy < room.capacity) {
      roomOccupancy.get(room.id).push([startMs, endMs]);
      return room.id;
    }
  }
  return null;
}

const clientBlocks = [];
for (const id of customerIds) {
  const c = customers.get(id);
  const first = (c.given_name ?? "").trim() || "Square";
  const last = (c.family_name ?? "").trim();
  const email = (c.email_address ?? "").trim();
  const phone = (c.phone_number ?? "").trim();
  clientBlocks.push(
    `do $$ begin\n` +
    `  if not exists (select 1 from clients where square_customer_id = ${q(id)}) then\n` +
    `    if ${email ? "exists (select 1 from clients where lower(email) = lower(" + q(email) + "))" : "false"} then\n` +
    `      update clients set square_customer_id = ${q(id)} where lower(email) = lower(${q(email || "-")});\n` +
    `    else\n` +
    `      insert into clients (first_name, last_name, email, phone, home_location, square_customer_id)\n` +
    `        values (${q(first)}, ${q(last)}, ${q(email)}, ${q(phone)}, 'valencia', ${q(id)});\n` +
    `    end if;\n` +
    `  end if;\n` +
    `end $$;`
  );
}

const apptRows = [];
const importedIds = [];
for (const b of bookings) {
  const segments = b.appointment_segments ?? [];
  if (!b.customer_id) {
    warnings.push(`SKIPPED booking ${b.id} (${b.start_at}) — no customer on it`);
    continue;
  }
  let offsetMin = 0;
  segments.forEach((seg, i) => {
    const staffId = STAFF_BY_SQUARE_ID[seg.team_member_id];
    const svc = variationMap[seg.service_variation_id];
    const durationMin = seg.duration_minutes ?? svc?.durationMin ?? 60;
    const startMs = new Date(b.start_at).getTime() + offsetMin * 60000;
    offsetMin += durationMin;
    if (!staffId) {
      warnings.push(`SKIPPED segment of booking ${b.id} — unknown team member ${seg.team_member_id}`);
      return;
    }
    if (!svc) {
      warnings.push(`SKIPPED segment of booking ${b.id} — unknown service variation ${seg.service_variation_id}`);
      return;
    }
    const sqId = i === 0 ? b.id : `${b.id}-${i}`;
    importedIds.push(sqId);
    const startISO = new Date(startMs).toISOString();
    const bufferMin = EXISTING_IDS.has(svc.serviceId) ? 15 : (newServices.find((n) => n.id === svc.serviceId)?.bufferMin ?? 15);
    const roomId = svc.category !== "unknown" ? assignRoom(svc.category, startMs, startMs + (durationMin + bufferMin) * 60000) : null;
    if (!roomId) warnings.push(`No room assigned for booking ${b.id} (${svc.serviceId} @ ${startISO})`);
    const price = svc.priceCents != null ? (svc.priceCents / 100).toFixed(2) : "0.00";
    const note = [b.customer_note?.trim(), b.seller_note?.trim() ? `Seller: ${b.seller_note.trim()}` : ""].filter(Boolean).join(" | ");
    apptRows.push(
      `insert into appointments (client_id, service_id, staff_id, location_id, start_at, duration_min, price, status, note, room_id, square_booking_id)\n` +
      `  select c.id, ${q(svc.serviceId)}, ${q(staffId)}, 'valencia', ${q(startISO)}, ${durationMin}, ${price}, 'confirmed', ${qn(note)}, ${roomId ? q(roomId) + "::uuid" : "null"}, ${q(sqId)}\n` +
      `  from clients c where c.square_customer_id = ${q(b.customer_id)}\n` +
      `  on conflict (square_booking_id) do update set start_at = excluded.start_at, duration_min = excluded.duration_min,\n` +
      `    status = excluded.status, staff_id = excluded.staff_id, service_id = excluded.service_id, room_id = excluded.room_id;`
    );
  });
}

let apptSql = `-- Generated by scripts/import-from-square.mjs — Square bookings import.\n\n`;
apptSql += clientBlocks.join("\n") + "\n\n";
apptSql += apptRows.join("\n") + "\n\n";
if (importedIds.length > 0) {
  apptSql += `-- Reconcile: cancel future imported rows whose Square booking disappeared.\n` +
    `update appointments set status = 'cancelled'\n` +
    `  where square_booking_id is not null and start_at > now()\n` +
    `    and square_booking_id not in (${importedIds.map(q).join(", ")});\n`;
}

// --- Write outputs -----------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "square-catalog.sql"), catalogSql);
writeFileSync(join(OUT_DIR, "square-appointments.sql"), apptSql);
writeFileSync(join(OUT_DIR, "square-variation-map.json"), JSON.stringify(variationMap, null, 2));

console.log(`Location: ${locationId}`);
console.log(`Catalog: ${Object.keys(variationMap).length} variations → ${newServices.length} new services, ${diffs.length} matched existing`);
for (const s of newServices) console.log(`  NEW ${s.category} | ${s.name} | $${s.price} | ${s.durationMin}min`);
for (const d of diffs) console.log(`  MATCHED ${d.serviceId} <- "${d.name}" (Square: $${d.squarePrice} / ${d.squareDuration}min)`);
console.log(`Bookings: ${bookings.length} upcoming → ${apptRows.length} appointment rows, ${customerIds.length} clients`);
if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
console.log(`\nSQL written to ${OUT_DIR}/square-catalog.sql and ${OUT_DIR}/square-appointments.sql — review, then apply catalog first.`);
