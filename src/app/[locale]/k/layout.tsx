import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { KidShell } from "@/components/kid/kid-shell";

export default async function KidLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all learners for this parent (for quick kid-to-kid switching)
  const { data: learnerRows } = await supabase
    .from("learner_profiles")
    .select("id, first_name, grade_level, avatar_url")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });

  const learners = (learnerRows ?? []).map((l) => ({
    id: l.id as string,
    first_name: l.first_name as string,
    grade_level: l.grade_level as string,
    avatar_url: (l.avatar_url as string | null) ?? null,
  }));

  return <KidShell learners={learners}>{children}</KidShell>;
}
