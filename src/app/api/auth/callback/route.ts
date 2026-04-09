import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthRedirect } from "@/lib/auth-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/fr/login`);
  }

  const cookieStore = await cookies();

  // Read role from secure cookie (set by register form), not from URL query param
  const roleCookie = cookieStore.get("ev_register_role")?.value;
  const role = roleCookie === "parent" || roleCookie === "teacher" ? roleCookie : null;

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/fr/login`);
  }

  // If role was set during registration, update user metadata
  if (role) {
    await supabase.auth.updateUser({
      data: { role },
    });
  }

  // Clear the role cookie
  cookieStore.set("ev_register_role", "", { path: "/", maxAge: 0 });

  // Determine where to redirect based on user role/status
  const { path } = await getAuthRedirect(supabase);
  return NextResponse.redirect(`${origin}/fr${path}`);
}
