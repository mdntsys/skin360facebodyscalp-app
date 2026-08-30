import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client that bypasses RLS.
 *
 * The public booking path runs on the anon key, and `staff` is readable only
 * by signed-in app users — deliberately, so the girls' personal emails can't
 * be pulled from the browser. Looking up who to notify is the one thing that
 * path legitimately needs above its own privileges.
 *
 * Returns null when the key isn't set, so callers skip the notification
 * instead of failing a booking over it. Never import this from client code.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
