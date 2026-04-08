import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RatingForm } from "@/components/session/rating-form";

export default async function RateSessionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify parent role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "parent") {
    redirect("/dashboard");
  }

  // Fetch session info
  const { data: liveClass } = await supabase
    .from("live_classes")
    .select(
      `
      id,
      status,
      teacher_id,
      profiles!live_classes_teacher_id_fkey(display_name)
    `
    )
    .eq("id", id)
    .single();

  if (!liveClass) {
    notFound();
  }

  // Only completed sessions can be rated
  if (liveClass.status !== "completed") {
    redirect(`/session/${id}`);
  }

  // Verify parent was enrolled
  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("live_class_id", id)
    .eq("parent_id", user.id);

  if (!count || count === 0) {
    redirect("/dashboard");
  }

  // Check if already reviewed
  const { count: reviewCount } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("reviewer_id", user.id)
    .eq("live_class_id", id);

  if (reviewCount && reviewCount > 0) {
    redirect("/dashboard/parent");
  }

  const profiles = liveClass.profiles as unknown as
    | { display_name: string | null }[]
    | { display_name: string | null }
    | null;
  const teacherName = Array.isArray(profiles)
    ? profiles[0]?.display_name ?? "Enseignant"
    : profiles?.display_name ?? "Enseignant";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <RatingForm liveClassId={liveClass.id} teacherName={teacherName} />
    </div>
  );
}
