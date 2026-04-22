"use client";

import { usePathname } from "next/navigation";
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

export function AppChrome({ user, children }: Props) {
  const pathname = usePathname() ?? "";
  // Strip the locale segment so the check works for /fr, /en, etc.
  const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  const isAppShell = APP_SHELL_PREFIXES.some(
    (prefix) => stripped === prefix.replace(/\/$/, "") || stripped.startsWith(prefix)
  );

  return (
    <>
      {!isAppShell && <Header user={user} />}
      <main className="flex-1">{children}</main>
      {!isAppShell && <Footer />}
    </>
  );
}
