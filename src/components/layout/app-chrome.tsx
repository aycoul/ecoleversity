"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import type { UserRole } from "@/types/domain";

/**
 * Chrome gate: decides whether a route belongs to the public site (needs
 * the marketing Header + Footer) or to the app shell (sidebar-driven,
 * full-screen — Header/Footer would compete with the dashboard shell).
 *
 * App-shell routes are anything under /dashboard, /k, /session, /payment.
 * Everything else (public home, marketplace, auth) keeps the public chrome.
 */

const APP_SHELL_PREFIXES = ["/dashboard", "/k/", "/session/", "/payment/"];

type Props = {
  user: { id: string; displayName: string; role: UserRole } | null;
  children: React.ReactNode;
};

export function AppChrome({ user: serverUser, children }: Props) {
  const pathname = usePathname() ?? "";
  // Strip the locale segment so the check works for /fr, /en, etc.
  const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  const isAppShell = APP_SHELL_PREFIXES.some(
    (prefix) =>
      stripped === prefix.replace(/\/$/, "") || stripped.startsWith(prefix)
  );

  // Keep a client-side copy of the user so we can correct stale server
  // props (e.g. when Next.js caches the root layout or cookie clearing
  // lags behind a redirect).
  const [user, setUser] = useState(serverUser);

  useEffect(() => {
    setUser(serverUser);
  }, [serverUser]);

  useEffect(() => {
    const supabase = createClient();

    // On mount, double-check the client session. If the server prop is
    // stale (cached layout, cookies not yet cleared) we correct it.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && serverUser) {
        setUser(null);
      }
      // If session exists we trust the server prop (it has profile data).
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      }
      // SIGNED_IN is handled by the full-page reload in login-form.tsx.
    });

    return () => subscription.unsubscribe();
  }, [serverUser]);

  return (
    <>
      {!isAppShell && <Header user={user} />}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {!isAppShell && <Footer />}
    </>
  );
}
