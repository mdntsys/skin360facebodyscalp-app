# Valencia go-live runbook

Last updated 2026-08-13. Everything is built; this is the ordered checklist to
take app.skin360facebodyscalp.com live as Valencia's booking system and retire
Square-as-software and GoFormz.

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
1. **Cassie's days** → seed `availability_rules` for staff-cassie (her rules
   were cleared on purpose; she's lash/brow/wax now). Blocks nothing except
   Cassie appearing online.
2. **Yes to the GoFormz history migration** (~100 completed signed forms).
3. Terminal ordered (hers to do; she'll text — no build dependency).

## Nic — one-time, before flip
1. **Vercel env vars** (app project → Settings → Environment Variables,
   Production scope), then redeploy:
   - `TZ` = `America/Los_Angeles`  ← engine correctness, not optional
   - `RESEND_API_KEY` = (value in `.env.local`)
   - `EMAIL_FROM` = `Skin 360 Face Body Scalp <hello@skin360facebodyscalp.com>`
   - (optional) `EMAIL_REPLY_TO` — defaults to her yahoo in code
   Alternative: run `vercel login` once and Claude can set these via CLI.
2. **GoFormz export** (once she says yes): GoFormz → Forms → filter All time →
   download each Completed form's PDF into one folder (~100). Then:
   ```
   node scripts/attach-goformz-pdfs.mjs --dir <folder> --dry-run   # review match table
   APP_LOGIN_EMAIL=... APP_LOGIN_PASSWORD=... \
     node scripts/attach-goformz-pdfs.mjs --dir <folder>           # attach for real
   ```
   (`pdftotext` required — already installed. Unmatched files get attached by
   hand via client profile → Upload Scan. The 19 GoFormz Drafts: confirm with
   Carolina they can be ignored.)

## Flip day — in this order
1. Seed Cassie's real days (needs her answer).
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
9. Cancel **GoFormz** — only after the history migration ran and Carolina has
   clicked through the new forms.

## Parked (post-flip, on request)
Gift-card page decision (Square-powered page works; her WooCommerce GC still
live), online package sales, card-on-file no-show protection, self-serve form
links + PDF export of submissions, therapist countersignature, Next 16 upgrade,
Square location rename to Valencia (cosmetic once Square is terminals-only).
