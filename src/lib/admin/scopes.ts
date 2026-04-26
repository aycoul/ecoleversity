/**
 * Admin permission scopes — a single source of truth for what sub-admin
 * sees what. Middleware, dashboard layout, and server-side API routes
 * all read the same map. If you add a new admin page, update ALL_ROUTES
 * and the scope lists below.
 *
 * Design: scope is a single string on profiles.admin_scope. 'founder' is
 * the superuser. Every other scope grants access to a subset of pages.
 * 'analytics_viewer' is read-only (API routes also check before mutating).
 */

export type AdminScope =
  | "founder"
  | "finance"
  | "moderation"
  | "verification"
  | "support"
  | "analytics_viewer"
  | "school_admin";

/**
 * Every admin page key. Added to this list → every scope table below
 * must decide whether to include it. Keys intentionally match the
 * sidebar nav order.
 */
export type AdminPage =
  | "overview"
  | "verification"
  | "payments"
  | "payouts"
  | "reports"
  | "strikes"
  | "tickets"
  | "agents"
  | "analytics"
  | "ai_twins"
  | "ai_settings"
  | "admins"
  | "review"
  | "finance"
  | "operations";

/** Scope → the set of pages that scope can access. */
export const SCOPE_PAGES: Record<AdminScope, AdminPage[]> = {
  founder: [
    "overview",
    "verification",
    "payments",
    "payouts",
    "reports",
    "strikes",
    "tickets",
    "agents",
    "analytics",
    "ai_twins",
    "ai_settings",
    "admins",
    "review",
    "finance",
    "operations",
  ],
  finance: ["overview", "payments", "payouts", "analytics", "finance"],
  moderation: ["overview", "reports", "strikes", "tickets", "review", "operations"],
  verification: ["overview", "verification"],
  support: ["overview", "tickets"],
  analytics_viewer: ["overview", "analytics"],
  school_admin: ["overview", "verification", "reports"],
};

/**
 * Map each admin page to its URL path (without locale prefix).
 * Also used by the sidebar to generate nav items.
 */
export const PAGE_PATHS: Record<AdminPage, string> = {
  overview: "/dashboard/admin",
  verification: "/dashboard/admin/verification",
  payments: "/dashboard/admin/payments",
  payouts: "/dashboard/admin/payouts",
  reports: "/dashboard/admin/reports",
  strikes: "/dashboard/admin/strikes",
  tickets: "/dashboard/admin/tickets",
  agents: "/dashboard/admin/agents",
  analytics: "/dashboard/admin/analytics",
  ai_twins: "/dashboard/admin/ai-twins",
  ai_settings: "/dashboard/admin/ai-settings",
  admins: "/dashboard/admin/admins",
  review: "/dashboard/admin/review",
  finance: "/dashboard/admin/finance",
  operations: "/dashboard/admin/operations",
};

/**
 * Reverse-lookup: given a path (locale-stripped), which page is it?
 * Returns null for unknown paths. Used by middleware for gating.
 */
export function pageForPath(pathname: string): AdminPage | null {
  // Exact match on overview (shortest path) and longest prefix otherwise
  if (pathname === "/dashboard/admin" || pathname === "/dashboard/admin/") {
    return "overview";
  }
  const entries = Object.entries(PAGE_PATHS)
    .filter(([key]) => key !== "overview")
    .sort((a, b) => b[1].length - a[1].length);
  for (const [key, path] of entries) {
    if (pathname.startsWith(path)) return key as AdminPage;
  }
  return null;
}

/**
 * Does an admin with this scope have access to this page?
 * Returns false if scope is null/undefined (defensive — treat unscoped
 * admins as no-access until the founder sets their scope explicitly).
 */
export function canAccess(
  scope: AdminScope | null | undefined,
  page: AdminPage,
): boolean {
  if (!scope) return false;
  return SCOPE_PAGES[scope]?.includes(page) ?? false;
}

/**
 * The landing page for a given scope — where we redirect when the admin
 * lands on /dashboard/admin/* without specifying a route they can access.
 * Everyone gets "overview" because every scope is granted it.
 */
export function landingPageFor(_scope: AdminScope): AdminPage {
  return "overview";
}

/**
 * Human-readable scope labels (French — matches app default locale).
 * Used in the profile switcher header and audit log UI.
 */
export const SCOPE_LABELS_FR: Record<AdminScope, string> = {
  founder: "Fondateur",
  finance: "Finance",
  moderation: "Modération",
  verification: "Vérification",
  support: "Support",
  analytics_viewer: "Analytique (lecture)",
  school_admin: "Admin école",
};
