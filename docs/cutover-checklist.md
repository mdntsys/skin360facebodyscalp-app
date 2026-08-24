# Valencia go-live runbook

Last updated 2026-08-24. **Valencia is LIVE.** Toluca stays on GlossGenius.

Went live 2026-08-24:
- Square calendar re-imported (14 upcoming bookings). Staff capability rewrite skipped on purpose (would have undone Cassie/Vero/Catalina).
- `online_booking_enabled = true`
- Website Valencia Book → `https://app.skin360facebodyscalp.com/book`
- Test booking (Classic Facial, Carolina, Tue 10am) created then deleted.
- Salon notify: yahoo inbox gets a copy of each online booking (app commit 2113772). Client still gets the confirmation. Girls are not emailed; they see their `/schedule` login.

## Already done (no action)
- Booking engine live in code: real schedules, capabilities, rooms, add-on flow,
  next-day notice, 5-week window, race-safe `public_create_booking`.
- Close-out + packages (`record_checkout` / `sell_client_package` RPCs).
- Forms: 5 in-app templates (from her 6 GoFormz ones), signature pad, Supabase
  Storage bucket `client-files`, upload-scan flow.
- Karen's every-other-Saturday overrides seeded through end of 2027.
- Confirmation/gift-card emails reply-to her real inbox
  (skin360facebodyscalp@yahoo.com) since hello@ has no mailbox.
- Marketing site copy no longer promises Square; flip-day URL documented in
  `Website/src/data/site.ts` next to Valencia's `bookingUrl`.

## Waiting on Carolina
1. **Catalina's day** — Carolina (2026-08-16) wants her on a different day,
   NOT Wednesdays (currently seeded Wed/Thu 10–2). Waiting on which day;
   Carolina can also change it herself on the Availability page. Catalina's
   login: waiting on her email.

## Answered 2026-08-16 (no action)
- **Schedule blocking stays Carolina-only for now** — "maybe in the future."
  Current build already matches (staff logins are read-only); the girls'
  self-serve days-off flow stays parked until she asks.
- **Passwords are fine** — girls may want changes later. No self-serve
  password change in the app; a change is a one-line admin reset when asked.
- **GoDaddy terminal being set up 2026-08-17** — the thing she said she'd
  text about. No build dependency; it's the Valencia payments hardware.

## Girls' logins — CREATED 2026-08-16, all five verified working

Carolina answered 2026-08-16: girls see **only their own schedule** (the
`staff_sees_all_schedules` switch stays OFF — she sees everything as admin).

| Girl | Email | staff_id |
|---|---|---|
| Cassie | cassiedhughes@icloud.com | staff-cassie |
| Dominique | dominique5805@att.net | staff-dom |
| Veronica | veronicaalvarez12@gmail.com | staff-vero |
| Karen | kaparedes@yahoo.com | staff-karen |
| Josseline | jbmejia47@gmail.com (corrected 2026-08-16; artisanofskin.com login deleted) | staff-josseline |

Every login was tested against live auth + data API (own appointments only,
zero money/forms rows, writes rejected). Temp passwords are with Nic
(`~/Downloads/skin360-staff-logins.txt`) to hand to Carolina. Catalina and
anyone new later: Supabase → Auth → Add user, then
`insert into profiles (id, first_name, last_name, role, access, staff_id)
values ('<uuid>', 'Name', '', 'Role', 'staff', 'staff-<id>');`

**Cassie's days seeded 2026-08-16** per Carolina ("cannot work Mondays and
Fridays"): Tue/Wed/Thu 10–6 + Sat 9–4, Valencia — the standard girl pattern
minus Mon/Fri. If her hours differ, Carolina can fix them on the
Availability page herself.

Staff logins see the read-only `/schedule` page and nothing else — RLS locks
money, clients, and forms to admin logins, and every table write is
admin-only, so a girl's login is view-only even against the raw API.
Carolina's and Nic's existing logins are `access = 'admin'` — unchanged.

**GoFormz history migration: NOT NEEDED** (Carolina 2026-08-14 — the ~100
completed forms are Toluca clients she already has saved). She can cancel
GoFormz as soon as she's clicked through the new forms. The
`attach-goformz-pdfs.mjs` script stays in the repo unused, just in case.

## Nic — one-time, before flip
1. **Vercel env vars** (app project → Settings → Environment Variables,
   Production scope), then redeploy:
   - `TZ` = `America/Los_Angeles`  ← engine correctness, not optional
   - `RESEND_API_KEY` = (value in `.env.local`)
   - `EMAIL_FROM` = `Skin 360 Face Body Scalp <hello@skin360facebodyscalp.com>`
     (code now defaults to this even if the env var is missing)
   - (optional) `EMAIL_REPLY_TO` — defaults to her yahoo in code
   - (optional) `NEXT_PUBLIC_APP_URL` = `https://app.skin360facebodyscalp.com`
     — emailed form links; code falls back to this exact domain in production
   Alternative: run `vercel login` once and Claude can set these via CLI.
2. ~~GoFormz export~~ — cancelled by Carolina 2026-08-14: the completed forms
   are Toluca clients she already has saved; nothing to migrate.

## Flip day — in this order
1. ~~Seed Cassie's real days~~ — done 2026-08-16 (Tue/Wed/Thu 10–6, Sat 9–4).
2. Re-run the Square import so the calendar is current (idempotent, reconciles
   cancellations):
   ```
   node scripts/import-from-square.mjs --out /tmp/square-cutover
   ```
   then apply the two emitted SQL files to Supabase.
3. Confirm Vercel env vars are set; deploy latest main.
4. Flip the master switch: `update app_settings set online_booking_enabled = true;`
5. Smoke test on production: /book loads services → pick a real slot → book a
   test client → confirmation email arrives (check reply-to) → delete the test
   appointment + payment-free test client.
6. Website repoint: in `Website/src/data/site.ts` set Valencia
   `bookingUrl: "https://app.skin360facebodyscalp.com/book"`, push.
7. Tell Carolina: from now on, nothing new goes into the Square calendar —
   book by phone straight into the app; online bookings land there themselves.
8. After a clean day or two: drop the Square plan to **Free** (the Sep 1
   Premium→Plus downgrade is already scheduled; Free comes after the final
   import is verified). Terminals/processing unaffected.
9. Cancel **GoFormz** — whenever Carolina has clicked through the new forms
   (no migration needed; see above).

## Parked (post-flip, on request)
Gift-card page decision (Square-powered page works; her WooCommerce GC still
live), online package sales, card-on-file no-show protection, self-serve form
links + PDF export of submissions, therapist countersignature, Next 16 upgrade,
Square location rename to Valencia (cosmetic once Square is terminals-only).
