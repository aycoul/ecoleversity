import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";
import { DashboardShell } from "@/components/admin/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const role = profile.role as UserRole;
  const t = await getTranslations("dashboard.sidebar");

  const navConfig: Record<UserRole, Array<{ href: string; label: string; icon: string }>> = {
    admin: [
      { href: "/dashboard/admin/verification", label: t("verification"), icon: "shield-check" },
      { href: "/dashboard/admin/payments", label: t("payments"), icon: "wallet" },
      { href: "/dashboard/admin/tickets", label: t("supportTickets"), icon: "ticket" },
      { href: "/dashboard/admin/reports", label: t("reports"), icon: "bar-chart" },
    ],
    teacher: [
      { href: "/dashboard/teacher", label: t("myProfile"), icon: "user" },
      { href: "/dashboard/teacher/availability", label: t("schedule"), icon: "calendar" },
      { href: "/dashboard/teacher/sessions", label: t("upcomingSessions"), icon: "video" },
      { href: "/dashboard/teacher/courses", label: t("myCourses"), icon: "book-open" },
      { href: "/dashboard/teacher/earnings", label: t("earnings"), icon: "wallet" },
      { href: "/dashboard/teacher/messages", label: t("messages"), icon: "message-circle" },
    ],
    parent: [
      { href: "/dashboard/parent", label: t("myChildren"), icon: "users" },
      { href: "/dashboard/parent/sessions", label: t("upcomingSessions"), icon: "calendar" },
      { href: "/dashboard/parent/spending", label: t("spending"), icon: "wallet" },
      { href: "/dashboard/parent/messages", label: t("messages"), icon: "message-circle" },
    ],
    school_admin: [
      { href: "/dashboard/admin/verification", label: t("verification"), icon: "shield-check" },
      { href: "/dashboard/admin/reports", label: t("reports"), icon: "bar-chart" },
    ],
  };

  const links = navConfig[role] ?? navConfig.parent;

  return (
    <DashboardShell
      links={links}
      role={role}
      userName={profile.display_name ?? user.email ?? ""}
      avatarUrl={profile.avatar_url}
    >
      {children}
    </DashboardShell>
  );
}
