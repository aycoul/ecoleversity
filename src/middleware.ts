import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { canAccess, pageForPath, type AdminScope } from "@/lib/admin/scopes";

const intlMiddleware = createMiddleware(routing);

// Role-scoped dashboard paths — middleware redirects if role doesn't match.
// Order matters: more-specific first.
const ROLE_GATES: Array<{ prefix: string; role: string; fallback: string }> = [
  { prefix: "/dashboard/admin", role: "admin", fallback: "/dashboard/parent" },
  { prefix: "/dashboard/school", role: "school_admin", fallback: "/dashboard/parent" },
  { prefix: "/dashboard/teacher", role: "teacher", fallback: "/dashboard/parent" },
];

function stripLocale(pathname: string): string {
  // /en/dashboard/... -> /dashboard/...
  const match = pathname.match(/^\/[a-z]{2}(\/.*)?$/);
  return match ? (match[1] ?? "/") : pathname;
}

function getLocale(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  return match ? match[1] : "fr";
}

export async function middleware(request: NextRequest) {
  // 1. Refresh Supabase session on every request (same as before)
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Mode + role gating — only for protected surfaces
  const pathname = request.nextUrl.pathname;
  const localeStripped = stripLocale(pathname);
  const locale = getLocale(pathname);

  const isKidRoute = localeStripped.startsWith("/k/");
  const isDashboardRoute = localeStripped.startsWith("/dashboard/");
  const needsAuth = isKidRoute || isDashboardRoute;

  if (needsAuth && !user) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && needsAuth) {
    // Fetch profile role + admin_scope — shared across all gate checks below
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, admin_scope")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role ?? "parent";
    const adminScope = (profile?.admin_scope as AdminScope | null) ?? null;

    // Role gates for /dashboard/{admin,school,teacher}
    if (isDashboardRoute) {
      for (const gate of ROLE_GATES) {
        if (localeStripped.startsWith(gate.prefix) && role !== gate.role) {
          const fallbackUrl = new URL(
            `/${locale}${gate.fallback}`,
            request.url
          );
          return NextResponse.redirect(fallbackUrl);
        }
      }

      // Admin scope gate — within /dashboard/admin/*, each sub-admin only
      // sees the pages their scope grants. Out-of-scope → redirect to the
      // Overview hub (which every scope can access).
      if (role === "admin" && localeStripped.startsWith("/dashboard/admin")) {
        const page = pageForPath(localeStripped);
        if (page && !canAccess(adminScope, page)) {
          return NextResponse.redirect(
            new URL(`/${locale}/dashboard/admin`, request.url)
          );
        }
      }
    }

    // Kid route gate — verify the learner belongs to this parent
    if (isKidRoute && role === "parent") {
      const match = localeStripped.match(/^\/k\/([^/]+)/);
      const learnerId = match?.[1];
      if (learnerId) {
        const { data: learner } = await supabase
          .from("learner_profiles")
          .select("id")
          .eq("id", learnerId)
          .eq("parent_id", user.id)
          .maybeSingle();
        if (!learner) {
          // Doesn't own this learner (tampering) — back to parent dashboard
          return NextResponse.redirect(
            new URL(`/${locale}/dashboard/parent/overview`, request.url)
          );
        }
      }
    } else if (isKidRoute && role !== "parent") {
      // Non-parents cannot access kid routes at all
      return NextResponse.redirect(
        new URL(`/${locale}/dashboard/${role === "teacher" ? "teacher" : role === "admin" ? "admin" : "parent"}/overview`, request.url)
      );
    }
  }

  // 3. Apply i18n routing last so locale-stripping decisions stick
  const intlResponse = intlMiddleware(request);

  // Merge cookies from supabase session refresh into intl response
  response.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
