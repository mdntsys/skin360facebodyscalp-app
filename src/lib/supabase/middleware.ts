import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Customer-facing surface (booking, gift cards, send-ahead forms) — no
 *  session required. /api/forms/send stays behind auth on purpose. */
function isPublicBookingPath(path: string): boolean {
  return (
    path === "/book" ||
    path.startsWith("/book/") ||
    path === "/gift-cards" ||
    path.startsWith("/gift-cards/") ||
    path.startsWith("/f/") ||
    path.startsWith("/api/booking/") ||
    path.startsWith("/api/gift-cards/") ||
    path === "/api/forms/submit"
  );
}

export async function updateSession(request: NextRequest) {
  if (isPublicBookingPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and auth.getUser() —
  // it can cause hard-to-debug random logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && path !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
