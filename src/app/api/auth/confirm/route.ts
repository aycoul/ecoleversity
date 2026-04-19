import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Email-link confirmation endpoint (token_hash flow).
 *
 * Used by recovery / magic-link / email-change emails — any time the
 * Supabase email template contains a {{ .TokenHash }} placeholder.
 *
 * Unlike the OAuth callback (?code=), the token_hash flow works across
 * browsers/devices: no client-side PKCE state needed. The user can
 * request a reset on their phone and click the link on their laptop.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      `${origin}/fr/login?reset_error=missing_token`
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "recovery" | "email" | "magiclink" | "email_change",
  });

  if (error) {
    console.error("[auth/confirm] verifyOtp error:", error.message);
    return NextResponse.redirect(
      `${origin}/fr/login?reset_error=invalid_or_expired`
    );
  }

  // Same-origin relative guard — prevents open redirect
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return NextResponse.redirect(`${origin}/fr${safeNext}`);
}
