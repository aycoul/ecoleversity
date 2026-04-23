import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ClassCatalog } from "@/components/class/class-catalog";
import type { ClassCardData } from "@/components/class/class-card";

type SearchParams = Promise<{
  subject?: string;
  grade?: string;
}>;

export default async function GroupClassCatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("groupClass");
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();

  // Include classes that started up to 8h ago — some group classes run
  // for 60–90 min, so a class whose start time is in the past but whose
  // end time is still in the future should still appear as bookable.
  // The JS filter after the query narrows this properly.
  const now = new Date();
  const earliestWindow = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();

  // Fetch group classes AND trial sessions that are still upcoming or currently running
  let query = supabase
    .from("live_classes")
    .select(
      "id, title, subject, grade_level, scheduled_at, duration_minutes, max_students, price_xof, teacher_id, format, is_trial"
    )
    .or("format.eq.group,and(format.eq.one_on_one,is_trial.eq.true)")
    .eq("status", "scheduled")
    .gte("scheduled_at", earliestWindow)
    .order("scheduled_at", { ascending: true });

  if (params.subject) {
    query = query.eq("subject", params.subject);
  }
  if (params.grade) {
    query = query.eq("grade_level", params.grade);
  }

  const { data: classesRaw } = await query;

  // JS filter — keep classes whose end time is still in the future.
  // A class scheduled 2h ago with duration_minutes=60 is already done,
  // but a class scheduled 2h ago with duration_minutes=90 is still live.
  const nowMs = now.getTime();
  const classes = (classesRaw ?? []).filter((c) => {
    const start = new Date(c.scheduled_at as string).getTime();
    const end = start + (c.duration_minutes as number) * 60 * 1000;
    return end > nowMs;
  });

  if (classes.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">{t("title")}</h1>
        <ClassCatalog
          classes={[]}
          initialSubject={params.subject}
          initialGrade={params.grade}
        />
      </div>
    );
  }

  // Fetch teacher profiles
  const teacherIds = [...new Set(classes.map((c) => c.teacher_id))];
  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", teacherIds);

  const teacherMap = new Map(
    (teachers ?? []).map((t) => [t.id, t])
  );

  // Fetch enrollment counts
  const classIds = classes.map((c) => c.id);
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("live_class_id")
    .in("live_class_id", classIds);

  const enrollmentCounts: Record<string, number> = {};
  (enrollments ?? []).forEach((e) => {
    enrollmentCounts[e.live_class_id] =
      (enrollmentCounts[e.live_class_id] ?? 0) + 1;
  });

  // Fetch saved status for current user
  let savedClassIds = new Set<string>();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: saved } = await supabase
      .from("saved_classes")
      .select("live_class_id")
      .eq("parent_id", user.id)
      .in("live_class_id", classIds);
    savedClassIds = new Set((saved ?? []).map((s) => s.live_class_id));
  }

  // Build card data
  const cardData: ClassCardData[] = classes.map((c) => {
    const teacher = teacherMap.get(c.teacher_id);
    return {
      id: c.id,
      title: c.title,
      subject: c.subject,
      grade_level: c.grade_level,
      scheduled_at: c.scheduled_at,
      duration_minutes: c.duration_minutes,
      max_students: c.max_students,
      price_xof: c.price_xof,
      enrolled_count: enrollmentCounts[c.id] ?? 0,
      teacher_name: teacher?.display_name ?? "Enseignant",
      teacher_avatar: teacher?.avatar_url ?? null,
      is_trial: c.is_trial ?? false,
      is_saved: savedClassIds.has(c.id),
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{t("title")}</h1>
      <ClassCatalog
        classes={cardData}
        initialSubject={params.subject}
        initialGrade={params.grade}
      />
    </div>
  );
}
