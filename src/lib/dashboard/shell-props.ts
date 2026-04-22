import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole, GradeLevel } from "@/types/domain";
import type { AvatarSwitcherLearner } from "@/components/nav/avatar-switcher";
import {
  PAGE_PATHS,
  SCOPE_PAGES,
  type AdminPage,
  type AdminScope,
} from "@/lib/admin/scopes";

export type DashboardShellProps = {
  role: UserRole;
  userName: string;
  avatarUrl: string | null;
  activeLearnerId: string | null;
  learners: AvatarSwitcherLearner[];
  links: Array<{ href: string; label: string; icon: string; badge?: number }>;
};

/**
 * Builds the DashboardShell props from the current authed user. Returns null
 * if the visitor is signed out or their profile row is missing. Used by both
 * the /dashboard layout (where auth is required) and the marketplace layout
 * (where it's optional — a logged-in parent keeps their sidebar while
 * browsing public catalog pages).
 */
export async function getDashboardShellProps(): Promise<DashboardShellProps | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, avatar_url, active_learner_id, admin_scope")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const role = profile.role as UserRole;
  const adminScope = (profile.admin_scope as AdminScope | null) ?? null;

  let learners: AvatarSwitcherLearner[] = [];
  let pendingPaymentsCount = 0;
  if (role === "parent") {
    const { data: learnerRows } = await supabase
      .from("learner_profiles")
      .select("id, first_name, grade_level, avatar_url")
      .eq("parent_id", user.id)
      .order("created_at", { ascending: true });
    learners = (learnerRows ?? []).map((l) => ({
      id: l.id as string,
      first_name: l.first_name as string,
      grade_level: l.grade_level as GradeLevel,
      avatar_url: (l.avatar_url as string | null) ?? null,
    }));

    const expiryCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", user.id)
      .eq("status", "pending")
      .gte("created_at", expiryCutoff);
    pendingPaymentsCount = count ?? 0;
  }

  const t = await getTranslations("dashboard.sidebar");

  const ADMIN_PAGE_LABEL: Record<AdminPage, string> = {
    overview: t("overview"),
    verification: t("verification"),
    payments: t("payments"),
    payouts: t("payouts"),
    reports: t("reports"),
    strikes: t("strikes"),
    tickets: t("supportTickets"),
    agents: t("agents"),
    analytics: t("analytics"),
    ai_services: "Services IA",
    ai_twins: "Jumeaux IA",
    ai_settings: "Paramètres IA",
  };
  const ADMIN_PAGE_ICON: Record<AdminPage, string> = {
    overview: "layout-dashboard",
    verification: "shield-check",
    payments: "wallet",
    payouts: "banknote",
    reports: "flag",
    strikes: "alert-octagon",
    tickets: "ticket",
    agents: "cpu",
    analytics: "bar-chart",
    ai_services: "cpu",
    ai_twins: "cpu",
    ai_settings: "settings",
  };
  // Section labels for sidebar grouping. Order here defines display order.
  // Keys map 1:1 to AdminPage. 'overview' has no section (sits above the
  // first group as a bare entry).
  const ADMIN_PAGE_SECTION: Record<AdminPage, string | undefined> = {
    overview: undefined,
    payments: "Finances",
    payouts: "Finances",
    reports: "Modération",
    strikes: "Modération",
    tickets: "Modération",
    verification: "Opérations",
    analytics: "Opérations",
    ai_services: "IA",
    ai_twins: "IA",
    ai_settings: "IA",
    agents: "IA",
  };

  // Preserve the SCOPE_PAGES order for access control, but re-order within
  // that set by section so the sidebar renders grouped items together.
  const adminPages = adminScope ? SCOPE_PAGES[adminScope] : [];
  const sectionOrder = [
    undefined,
    "Finances",
    "Modération",
    "Opérations",
    "IA",
  ];
  const adminPagesOrdered = [...adminPages].sort((a, b) => {
    const aIdx = sectionOrder.indexOf(ADMIN_PAGE_SECTION[a]);
    const bIdx = sectionOrder.indexOf(ADMIN_PAGE_SECTION[b]);
    return aIdx - bIdx;
  });
  const adminNav = adminPagesOrdered.map((page) => ({
    href: PAGE_PATHS[page],
    label: ADMIN_PAGE_LABEL[page],
    icon: ADMIN_PAGE_ICON[page],
    section: ADMIN_PAGE_SECTION[page],
  }));
  adminNav.push({
    href: "/dashboard/settings/notifications",
    label: t("settings"),
    icon: "settings",
    section: "Compte",
  });

  const navConfig: Record<
    UserRole,
    Array<{ href: string; label: string; icon: string; badge?: number; section?: string }>
  > = {
    admin: adminNav,
    teacher: [
      { href: "/dashboard/teacher", label: t("myProfile"), icon: "user" },
      { href: "/dashboard/teacher/availability", label: t("schedule"), icon: "calendar", section: "Enseignement" },
      { href: "/dashboard/teacher/sessions", label: t("upcomingSessions"), icon: "video", section: "Enseignement" },
      { href: "/dashboard/teacher/classes", label: t("myCourses"), icon: "book-open", section: "Enseignement" },
      { href: "/dashboard/teacher/courses", label: t("recordedCourses"), icon: "play-circle", section: "Enseignement" },
      { href: "/dashboard/teacher/earnings", label: t("earnings"), icon: "wallet", section: "Finances" },
      { href: "/dashboard/teacher/transactions", label: t("payments"), icon: "receipt", section: "Finances" },
      { href: "/dashboard/teacher/messages", label: t("messages"), icon: "message-circle", section: "Communication" },
      { href: "/dashboard/settings/notifications", label: t("settings"), icon: "settings", section: "Compte" },
    ],
    parent: [
      { href: "/dashboard/parent", label: t("myChildren"), icon: "users" },
      { href: "/teachers", label: t("findTeacher"), icon: "search", section: "Apprentissage" },
      { href: "/dashboard/parent/sessions", label: t("upcomingSessions"), icon: "calendar", section: "Apprentissage" },
      { href: "/dashboard/parent/courses", label: t("recordedCourses"), icon: "play-circle", section: "Apprentissage" },
      { href: "/dashboard/parent/payments", label: t("payments"), icon: "receipt", badge: pendingPaymentsCount, section: "Finances" },
      { href: "/dashboard/parent/spending", label: t("spending"), icon: "trending-up", section: "Finances" },
      { href: "/dashboard/parent/wallet", label: t("wallet"), icon: "wallet", section: "Finances" },
      { href: "/dashboard/parent/messages", label: t("messages"), icon: "message-circle", section: "Communication" },
      { href: "/dashboard/settings/notifications", label: t("settings"), icon: "settings", section: "Compte" },
    ],
    school_admin: [
      { href: "/dashboard/admin/verification", label: t("verification"), icon: "shield-check" },
      { href: "/dashboard/admin/reports", label: t("reports"), icon: "bar-chart" },
      { href: "/dashboard/settings/notifications", label: t("settings"), icon: "settings", section: "Compte" },
    ],
  };

  return {
    role,
    userName: profile.display_name ?? user.email ?? "",
    avatarUrl: (profile.avatar_url as string | null) ?? null,
    activeLearnerId: (profile.active_learner_id as string | null) ?? null,
    learners,
    links: navConfig[role] ?? navConfig.parent,
  };
}
