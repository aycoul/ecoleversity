import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/admin/dashboard-shell";
import type { AvatarSwitcherLearner } from "@/components/nav/avatar-switcher";
import type { GradeLevel } from "@/types/domain";

/**
 * Kid mode reuses the adult DashboardShell so the two surfaces look
 * like the same product: same sidebar width, same active-state styling,
 * same bottom-left profile switcher (which lets the kid — or rather the
 * parent holding the phone — flip back to parent mode).
 *
 * Nav items are kid-specific (Accueil / Mes classes / Mes cours /
 * Mes succès). The shell reads the :learner_id param via the switcher's
 * `activeLearnerId` prop to show the learner's face in the footer card.
 */
export default async function KidLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ learner_id: string }>;
}) {
  const { learner_id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Parent profile for the switcher header
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");

  // All learners for kid-to-kid switching + verify this learner belongs
  // to the signed-in parent (middleware also guards but belt + braces)
  const { data: learnerRows } = await supabase
    .from("learner_profiles")
    .select("id, first_name, grade_level, avatar_url")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });

  const learners: AvatarSwitcherLearner[] = (learnerRows ?? []).map((l) => ({
    id: l.id as string,
    first_name: l.first_name as string,
    grade_level: l.grade_level as GradeLevel,
    avatar_url: (l.avatar_url as string | null) ?? null,
  }));

  if (!learners.some((l) => l.id === learner_id)) {
    redirect("/dashboard/parent/overview");
  }

  const navLinks = [
    { href: `/k/${learner_id}`, label: "Accueil", icon: "layout-dashboard" },
    { href: `/k/${learner_id}/classes`, label: "Mes classes", icon: "video" },
    { href: `/k/${learner_id}/courses`, label: "Mes cours", icon: "play-circle" },
    { href: `/k/${learner_id}/messages`, label: "Messages", icon: "message-circle" },
    { href: `/k/${learner_id}/achievements`, label: "Mes succès", icon: "award" },
  ];

  return (
    <div data-theme="kid">
      <DashboardShell
        links={navLinks}
        role="parent"
        userName={(profile.display_name as string | null) ?? "Parent"}
        activeLearnerId={learner_id}
        learners={learners}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
