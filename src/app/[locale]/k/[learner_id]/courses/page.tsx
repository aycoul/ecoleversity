import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PlayCircle, CheckCircle2 } from "lucide-react";

type PageProps = {
  params: Promise<{ learner_id: string }>;
};

export default async function KidCoursesPage({ params }: PageProps) {
  const { learner_id } = await params;
  const t = await getTranslations("kid");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("id", learner_id)
    .eq("parent_id", user.id)
    .maybeSingle();
  if (!learner) redirect("/dashboard/parent/overview");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "id, course_id, progress_pct, completed_at, enrolled_at"
    )
    .eq("learner_id", learner_id)
    .not("course_id", "is", null)
    .order("enrolled_at", { ascending: false });

  const courseIds = (enrollments ?? [])
    .map((e) => e.course_id as string | null)
    .filter((id): id is string => !!id);
  const { data: courses } =
    courseIds.length > 0
      ? await supabase
          .from("courses")
          .select("id, title, cover_url, subject")
          .in("id", courseIds)
      : { data: [] };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <PlayCircle className="size-6 text-[var(--ev-green)]" />
        <h1 className="text-2xl font-bold text-slate-900">{t("myCourses")}</h1>
      </div>

      {(enrollments ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          {t("emptyCourses")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(enrollments ?? []).map((e) => {
            const course = (courses ?? []).find(
              (c) => c.id === (e.course_id as string)
            );
            const pct = Math.max(0, Math.min(100, (e.progress_pct as number) ?? 0));
            const completed = !!e.completed_at;
            // Lesson-level resume requires joining lesson_progress;
            // deferred — link to course root, player picks up state.
            const href = `/k/${learner_id}/course/${e.course_id}`;
            return (
              <Link
                key={e.id as string}
                href={href}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-[var(--ev-blue)] hover:shadow-md"
              >
                <div className="relative aspect-video w-full bg-slate-100">
                  {course?.cover_url ? (
                    <img
                      src={course.cover_url as string}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--ev-blue-50)]">
                      <PlayCircle className="size-12 text-[var(--ev-blue)]" />
                    </div>
                  )}
                  {completed && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[var(--ev-green)] px-2 py-1 text-xs font-semibold text-white">
                      <CheckCircle2 className="size-3" />
                      {t("completed")}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 font-semibold text-slate-900">
                    {(course?.title as string) ?? t("courseFallback")}
                  </h3>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${
                        completed ? "bg-[var(--ev-green)]" : "bg-[var(--ev-blue)]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{pct}%</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
