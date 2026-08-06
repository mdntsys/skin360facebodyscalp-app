#!/usr/bin/env node
/**
 * Square sandbox spike — proves the white-label loop end to end before we
 * build the real integration:
 *
 *   1. locations                     (sanity: token works, find location)
 *   2. catalog upsert                (create a bookable APPOINTMENTS_SERVICE)
 *   3. team member create            (the "girl" the booking is with)
 *   4. availability search           (what the website would show)
 *   5. booking create → cancel       (what "Book Now" would do)
 *   6. payment → gift card create → activate → redeem
 *
 * Reads SQUARE_SANDBOX_ACCESS_TOKEN from the environment or .env.local.
 * Sandbox only — never point this at production.
 *
 * Run: node scripts/square-sandbox-spike.mjs
 */

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const BASE = "https://connect.squareupsandbox.com";

function loadToken() {
  if (process.env.SQUARE_SANDBOX_ACCESS_TOKEN)
    return process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = env
      .split("\n")
      .find((l) => l.startsWith("SQUARE_SANDBOX_ACCESS_TOKEN="));
    if (line) return line.split("=").slice(1).join("=").trim();
  } catch {
    /* fall through */
  }
  console.error(
    "Missing SQUARE_SANDBOX_ACCESS_TOKEN (env var or .env.local line)."
  );
  process.exit(1);
}

const TOKEN = loadToken();
const results = [];

async function api(step, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  const ok = res.ok;
  results.push({ step, ok, status: res.status });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`\n[${tag}] ${step} (${method} ${path} → ${res.status})`);
  if (!ok) console.log(JSON.stringify(json.errors ?? json, null, 2));
  return { ok, json };
}

const day = 24 * 60 * 60 * 1000;
const in2days = new Date(Date.now() + 2 * day);
const in9days = new Date(Date.now() + 9 * day);

// ── 1. Locations ────────────────────────────────────────────────────────────
const loc = await api("List locations", "GET", "/v2/locations");
if (!loc.ok) process.exit(1);
const locationId = loc.json.locations?.[0]?.id;
console.log(`   location: ${locationId} (${loc.json.locations?.[0]?.name})`);

// ── 2. Team member (reuse "Spike Tester" if present — the sandbox dashboard
//      made the first one bookable with Mon–Fri 9–5 hours) ────────────────────
const search = await api("Find team member", "POST", "/v2/team-members/search", {
  query: { filter: { status: "ACTIVE" } },
});
let teamMemberId = search.json.team_members?.find(
  (t) => t.given_name === "Spike" && t.family_name === "Tester"
)?.id;
if (!teamMemberId) {
  const tm = await api("Create team member", "POST", "/v2/team-members", {
    idempotency_key: randomUUID(),
    team_member: {
      given_name: "Spike",
      family_name: "Tester",
      assigned_locations: {
        assignment_type: "ALL_CURRENT_AND_FUTURE_LOCATIONS",
      },
    },
  });
  teamMemberId = tm.json.team_member?.id;
}
console.log(`   team member: ${teamMemberId}`);

// ── 3. Bookable service performed by that team member ───────────────────────
const found = await api(
  "Find existing service",
  "POST",
  "/v2/catalog/search-catalog-items",
  { text_filter: "Spike Facial", product_types: ["APPOINTMENTS_SERVICE"] }
);
let serviceVariationId, serviceVariationVersion;
const existing = found.json.items?.[0];
if (existing) {
  // Re-upsert with the team member attached (availability search only matches
  // services whose variation lists the team member in team_member_ids).
  const v = existing.item_data.variations[0];
  v.item_variation_data.team_member_ids = [teamMemberId];
  const upd = await api("Assign service to team member", "POST", "/v2/catalog/object", {
    idempotency_key: randomUUID(),
    object: existing,
  });
  const uv = upd.json.catalog_object?.item_data?.variations?.[0];
  serviceVariationId = uv?.id ?? v.id;
  serviceVariationVersion = uv?.version ?? v.version;
} else {
  const catalog = await api("Create bookable service", "POST", "/v2/catalog/object", {
    idempotency_key: randomUUID(),
    object: {
      type: "ITEM",
      id: "#spike-service",
      item_data: {
        name: "Spike Facial",
        product_type: "APPOINTMENTS_SERVICE",
        variations: [
          {
            type: "ITEM_VARIATION",
            id: "#spike-service-60",
            item_variation_data: {
              name: "60 min",
              pricing_type: "FIXED_PRICING",
              price_money: { amount: 10000, currency: "USD" },
              service_duration: 60 * 60 * 1000,
              available_for_booking: true,
              team_member_ids: [teamMemberId],
            },
          },
        ],
      },
    },
  });
  const variation = catalog.json.catalog_object?.item_data?.variations?.[0];
  serviceVariationId = variation?.id;
  serviceVariationVersion = variation?.version;
}

// ── 4. Availability (what the website calendar would show) ──────────────────
const avail = await api(
  "Search availability",
  "POST",
  "/v2/bookings/availability/search",
  {
    query: {
      filter: {
        start_at_range: {
          start_at: in2days.toISOString(),
          end_at: in9days.toISOString(),
        },
        location_id: locationId,
        segment_filters: [
          {
            service_variation_id: serviceVariationId,
            team_member_id_filter: { any: [teamMemberId] },
          },
        ],
      },
    },
  }
);
const slots = avail.json.availabilities ?? [];
console.log(`   slots returned: ${slots.length}`);
if (avail.ok && slots.length === 0)
  console.log(
    "   NOTE: zero slots usually means the team member has no booking profile" +
      " yet — enable them for Appointments in the sandbox Seller Dashboard."
  );

// ── 5. Customer + booking create → cancel ───────────────────────────────────
const customer = await api("Create customer", "POST", "/v2/customers", {
  idempotency_key: randomUUID(),
  given_name: "Spike",
  family_name: "Customer",
  email_address: "spike-customer@example.com",
});
const customerId = customer.json.customer?.id;

const startAt = slots[0]?.start_at ?? in2days.toISOString();
const booking = await api("Create booking", "POST", "/v2/bookings", {
  idempotency_key: randomUUID(),
  booking: {
    location_id: locationId,
    start_at: startAt,
    customer_id: customerId,
    appointment_segments: [
      {
        team_member_id: teamMemberId,
        service_variation_id: serviceVariationId,
        service_variation_version: serviceVariationVersion,
      },
    ],
  },
});
if (booking.ok) {
  const b = booking.json.booking;
  console.log(`   booking ${b.id} at ${b.start_at} (status ${b.status})`);
  await api("Cancel booking", "POST", `/v2/bookings/${b.id}/cancel`, {
    idempotency_key: randomUUID(),
    booking_version: b.version,
  });
}

// ── 6. Gift card: payment → create → activate → redeem ──────────────────────
const payment = await api("Create sandbox payment ($50)", "POST", "/v2/payments", {
  idempotency_key: randomUUID(),
  source_id: "cnon:card-nonce-ok",
  amount_money: { amount: 5000, currency: "USD" },
  location_id: locationId,
});
const paymentId = payment.json.payment?.id;

const card = await api("Create digital gift card", "POST", "/v2/gift-cards", {
  idempotency_key: randomUUID(),
  location_id: locationId,
  gift_card: { type: "DIGITAL" },
});
const giftCardId = card.json.gift_card?.id;

if (giftCardId) {
  const activate = await api(
    "Activate gift card ($50)",
    "POST",
    "/v2/gift-cards/activities",
    {
      idempotency_key: randomUUID(),
      gift_card_activity: {
        type: "ACTIVATE",
        location_id: locationId,
        gift_card_id: giftCardId,
        activate_activity_details: {
          amount_money: { amount: 5000, currency: "USD" },
          buyer_payment_instrument_ids: paymentId ? [paymentId] : undefined,
        },
      },
    }
  );
  if (activate.ok) {
    const gan = activate.json.gift_card_activity?.gift_card_gan;
    console.log(`   GAN (the number the Terminal types/scans): ${gan}`);
    await api("Redeem $20 from gift card", "POST", "/v2/gift-cards/activities", {
      idempotency_key: randomUUID(),
      gift_card_activity: {
        type: "REDEEM",
        location_id: locationId,
        gift_card_id: giftCardId,
        redeem_activity_details: {
          amount_money: { amount: 2000, currency: "USD" },
        },
      },
    });
    const after = await api("Check balance", "GET", `/v2/gift-cards/${giftCardId}`);
    if (after.ok)
      console.log(
        `   balance after redeem: $${(after.json.gift_card.balance_money.amount / 100).toFixed(2)}`
      );
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log("\n──── SUMMARY ────");
for (const r of results)
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.step} (${r.status})`);
const failed = results.filter((r) => !r.ok).length;
console.log(
  failed === 0
    ? "\nAll steps passed — the white-label loop works in sandbox."
    : `\n${failed} step(s) failed — see output above.`
);
