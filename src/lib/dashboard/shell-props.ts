import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole, GradeLevel } from "@/types/domain";
import type { AvatarSwitcherLearner } from "@/components/nav/avatar-switcher";
import {
  PAGE_PATHS,
  SCOPE_PAGES,
  canAccess,
  type AdminPage,
  type AdminScope,
} from "@/lib/admin/scopes";

export type LearnerStats = {
  upcomingCount: number;
  hasAlert: boolean;
};

export type DashboardShellProps = {
  role: UserRole;
  userName: string;
  avatarUrl: string | null;
  activeLearnerId: string | null;
  learners: AvatarSwitcherLearner[];
  /** Keyed by learner id — upcoming session count + urgency flag per kid.
   *  Used by the parent-dashboard kid strip. */
  learnerStats: Record<string, LearnerStats>;
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
  let learnerStats: Record<string, LearnerStats> = {};
  let pendingPaymentsCount = 0;
  if (role === "parent") {
    // Parallel: fetch learners + pending-payments count. Upcoming-session
    // stats depend on learner IDs, so it runs in a second phase. Previous
    // version did all three sequentially — three RTTs when two is enough.
    const expiryCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const [learnersResult, paymentsResult] = await Promise.all([
      supabase
        .from("learner_profiles")
        .select("id, first_name, grade_level, avatar_url")
        .eq("parent_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", user.id)
        .eq("status", "pending")
        .gte("created_at", expiryCutoff),
    ]);
    learners = (learnersResult.data ?? []).map((l) => ({
      id: l.id as string,
      first_name: l.first_name as string,
      grade_level: l.grade_level as GradeLevel,
      avatar_url: (l.avatar_url as string | null) ?? null,
    }));
    pendingPaymentsCount = paymentsResult.count ?? 0;

    // Per-kid stats for the top "kid strip". Upcoming sessions count +
    // "hasAlert" flag (red dot) when a session starts in < 30 min.
    if (learners.length > 0) {
      const learnerIds = learners.map((l) => l.id);
      const nowIso = new Date().toISOString();
      const soonIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const { data: upcomingRows } = await supabase
        .from("enrollments")
        .select("learner_id, live_classes!inner(id, status, scheduled_at)")
        .in("learner_id", learnerIds)
        .eq("live_classes.status", "scheduled")
        .gte("live_classes.scheduled_at", nowIso);
      for (const id of learnerIds) {
        learnerStats[id] = { upcomingCount: 0, hasAlert: false };
      }
      for (const row of (upcomingRows ?? []) as Array<{
        learner_id: string;
        live_classes: { scheduled_at: string } | { scheduled_at: string }[];
      }>) {
        const stats = learnerStats[row.learner_id];
        if (!stats) continue;
        stats.upcomingCount += 1;
        const lc = Array.isArray(row.live_classes) ? row.live_classes[0] : row.live_classes;
        if (lc && lc.scheduled_at <= soonIso) stats.hasAlert = true;
      }
    }
  }

  // Teacher review badge — count of recordings awaiting this teacher's
  // approval. Cheap query (one count(*) with a small index hit).
  let teacherPendingReviewCount = 0;
  if (role === "teacher") {
    const { data: myClasses } = await supabase
      .from("live_classes")
      .select("id")
      .eq("teacher_id", user.id);
    const ids = (myClasses ?? []).map((c) => c.id as string);
    if (ids.length > 0) {
      const { count } = await supabase
        .from("session_recordings")
        .select("id", { count: "exact", head: true })
        .in("live_class_id", ids)
        .eq("summary_review_status", "awaiting_teacher");
      teacherPendingReviewCount = count ?? 0;
    }
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
    ai_twins: "Jumeaux IA",
    ai_settings: "Paramètres IA",
    admins: "Administrateurs",
    review: "Revue des résumés",
    finance: "Finance & KPI",
    operations: "Opérations en direct",
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
    ai_twins: "cpu",
    ai_settings: "settings",
    admins: "shield-check",
    review: "video",
    finance: "trending-up",
    operations: "video",
  };
  // Section labels for sidebar grouping. Order here defines display order.
  // Keys map 1:1 to AdminPage. 'overview' has no section (sits above the
  // first group as a bare entry).
  const S_FINANCES = t("sectionFinances");
  const S_OPERATIONS = t("sectionOperations");
  const S_LEARNING = t("sectionLearning");
  const S_TEACHING = t("sectionTeaching");
  const S_MODERATION = t("sectionModeration");
  const S_IA = t("sectionAI");
  const S_COMMS = t("sectionCommunication");
  const S_ACCOUNT = t("sectionAccount");

  const ADMIN_PAGE_SECTION: Record<AdminPage, string | undefined> = {
    overview: undefined,
    payments: S_FINANCES,
    payouts: S_FINANCES,
    finance: S_FINANCES,
    reports: S_MODERATION,
    strikes: S_MODERATION,
    tickets: S_MODERATION,
    review: S_MODERATION,
    verification: S_OPERATIONS,
    analytics: S_OPERATIONS,
    ai_twins: S_IA,
    ai_settings: S_IA,
    agents: S_IA,
    admins: S_OPERATIONS,
    operations: S_OPERATIONS,
  };

  // Preserve the SCOPE_PAGES order for access control, but re-order within
  // that set by section so the sidebar renders grouped items together.
  const adminPages = adminScope ? SCOPE_PAGES[adminScope] : [];
  const sectionOrder = [
    undefined,
    S_FINANCES,
    S_MODERATION,
    S_OPERATIONS,
    S_IA,
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
  // Add refunds link for scopes that can access payments
  if (canAccess(adminScope, "payments")) {
    adminNav.push({
      href: "/dashboard/admin/refunds",
      label: t("refunds"),
      icon: "rotate-ccw",
      section: S_FINANCES,
    });
  }

  // Add featured teachers link for founders
  if (canAccess(adminScope, "analytics")) {
    adminNav.push({
      href: "/dashboard/admin/featured-teachers",
      label: t("featured"),
      icon: "sparkles",
      section: S_OPERATIONS,
    });
  }

  adminNav.push({
    href: "/dashboard/settings/notifications",
    label: t("settings"),
    icon: "settings",
    section: S_ACCOUNT,
  });

  const navConfig: Record<
    UserRole,
    Array<{ href: string; label: string; icon: string; badge?: number; section?: string }>
  > = {
    admin: adminNav,
    teacher: [
      { href: "/dashboard/teacher", label: t("myProfile"), icon: "user" },
      { href: "/dashboard/teacher/availability", label: t("schedule"), icon: "calendar", section: S_TEACHING },
      { href: "/dashboard/teacher/sessions", label: t("upcomingSessions"), icon: "video", section: S_TEACHING },
      { href: "/dashboard/teacher/classes", label: t("liveClasses"), icon: "video", section: S_TEACHING },
      { href: "/dashboard/teacher/courses", label: t("recordedCourses"), icon: "play-circle", section: S_TEACHING },
      { href: "/dashboard/teacher/review", label: "Revue des résumés", icon: "video", section: S_TEACHING, badge: teacherPendingReviewCount },
      { href: "/dashboard/teacher/earnings", label: t("earnings"), icon: "wallet", section: S_FINANCES },
      { href: "/dashboard/teacher/transactions", label: t("payments"), icon: "receipt", section: S_FINANCES },
      { href: "/dashboard/teacher/messages", label: t("messages"), icon: "message-circle", section: S_COMMS },
      { href: "/dashboard/settings/notifications", label: t("settings"), icon: "settings", section: S_ACCOUNT },
    ],
    parent: [
      { href: "/dashboard/parent", label: t("myChildren"), icon: "users" },
      { href: "/teachers", label: t("findTeacher"), icon: "search", section: S_LEARNING },
      { href: "/dashboard/parent/sessions", label: t("upcomingSessions"), icon: "calendar", section: S_LEARNING },
      { href: "/dashboard/parent/recordings", label: t("recordings"), icon: "video", section: S_LEARNING },
      { href: "/dashboard/parent/courses", label: t("recordedCourses"), icon: "play-circle", section: S_LEARNING },
      { href: "/dashboard/parent/saved-classes", label: t("savedClasses"), icon: "bookmark", section: S_LEARNING },
      { href: "/dashboard/parent/payments", label: t("payments"), icon: "receipt", badge: pendingPaymentsCount, section: S_FINANCES },
      { href: "/dashboard/parent/spending", label: t("spending"), icon: "trending-up", section: S_FINANCES },
      { href: "/dashboard/parent/wallet", label: t("wallet"), icon: "wallet", section: S_FINANCES },
      { href: "/dashboard/parent/messages", label: t("messages"), icon: "message-circle", section: S_COMMS },
      { href: "/dashboard/settings/notifications", label: t("settings"), icon: "settings", section: S_ACCOUNT },
    ],
    school_admin: [
      { href: "/dashboard/admin/verification", label: t("verification"), icon: "shield-check" },
      { href: "/dashboard/admin/reports", label: t("reports"), icon: "bar-chart" },
      { href: "/dashboard/settings/notifications", label: t("settings"), icon: "settings", section: S_ACCOUNT },
    ],
  };

  return {
    role,
    userName: profile.display_name ?? user.email ?? "",
    avatarUrl: (profile.avatar_url as string | null) ?? null,
    activeLearnerId: (profile.active_learner_id as string | null) ?? null,
    learners,
    learnerStats,
    links: navConfig[role] ?? navConfig.parent,
  };
}
