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

  const now = new Date().toISOString();

  // Fetch upcoming group classes with teacher info
  let query = supabase
    .from("live_classes")
    .select(
      "id, title, subject, grade_level, scheduled_at, duration_minutes, max_students, price_xof, teacher_id"
    )
    .eq("format", "group")
    .eq("status", "scheduled")
    .gt("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  if (params.subject) {
    query = query.eq("subject", params.subject);
  }
  if (params.grade) {
    query = query.eq("grade_level", params.grade);
  }

  const { data: classes } = await query;

  if (!classes || classes.length === 0) {
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
