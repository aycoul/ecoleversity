import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CoursePlayerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createServerSupabaseClient();

  // Verify authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch course to verify it exists
  const { data: course } = await supabase
    .from("courses")
    .select("id, status")
    .eq("id", id)
    .single();

  if (!course) {
    notFound();
  }

  // Fetch first lesson
  const { data: firstLesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .single();

  if (!firstLesson) {
    notFound();
  }

  // If user is logged in and enrolled, try to find last watched lesson
  if (user) {
    const { data: learners } = await supabase
      .from("learner_profiles")
      .select("id")
      .eq("parent_id", user.id);

    if (learners && learners.length > 0) {
      const learnerIds = learners.map((l) => l.id);

      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", id)
        .in("learner_id", learnerIds)
        .limit(1)
        .single();

      if (enrollment) {
        // Find the last lesson with progress
        const { data: lastProgress } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("enrollment_id", enrollment.id)
          .eq("completed", false)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastProgress) {
          redirect(`/${locale}/course/${id}/lesson/${lastProgress.lesson_id}`);
        }
      }
    }
  }

  // Default: redirect to first lesson
  redirect(`/${locale}/course/${id}/lesson/${firstLesson.id}`);
}
