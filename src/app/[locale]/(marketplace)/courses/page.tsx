import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CourseCatalog } from "@/components/course/course-catalog";
import type { CourseCardData } from "@/components/course/course-card";

type SearchParams = Promise<{
  subject?: string;
  grade?: string;
  exam?: string;
  sort?: string;
}>;

export default async function CourseCatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("courseCatalog");
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();

  // Fetch published courses
  let query = supabase
    .from("courses")
    .select(
      "id, title, subject, grade_level, exam_type, price_xof, thumbnail_url, teacher_id, rating_avg, rating_count, enrollment_count, total_duration_minutes, created_at"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (params.subject) {
    query = query.eq("subject", params.subject);
  }
  if (params.grade) {
    query = query.eq("grade_level", params.grade);
  }
  if (params.exam) {
    query = query.eq("exam_type", params.exam);
  }

  const { data: courses } = await query;

  if (!courses || courses.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <CourseCatalog
          courses={[]}
          initialSubject={params.subject}
          initialGrade={params.grade}
          initialExam={params.exam}
          initialSort={params.sort}
        />
      </div>
    );
  }

  // Fetch teacher profiles
  const teacherIds = [...new Set(courses.map((c) => c.teacher_id))];
  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", teacherIds);

  const teacherMap = new Map(
    (teachers ?? []).map((t) => [t.id, t])
  );

  // Fetch lesson counts per course
  const courseIds = courses.map((c) => c.id);
  const { data: lessons } = await supabase
    .from("lessons")
    .select("course_id")
    .in("course_id", courseIds);

  const lessonCounts: Record<string, number> = {};
  (lessons ?? []).forEach((l) => {
    lessonCounts[l.course_id] = (lessonCounts[l.course_id] ?? 0) + 1;
  });

  // Build card data
  const cardData: CourseCardData[] = courses.map((c) => {
    const teacher = teacherMap.get(c.teacher_id);
    return {
      id: c.id,
      title: c.title,
      subject: c.subject,
      grade_level: c.grade_level,
      price_xof: c.price_xof,
      thumbnail_url: c.thumbnail_url,
      teacher_name: teacher?.display_name ?? "Enseignant",
      teacher_avatar: teacher?.avatar_url ?? null,
      rating_avg: Number(c.rating_avg),
      rating_count: c.rating_count,
      enrollment_count: c.enrollment_count,
      lesson_count: lessonCounts[c.id] ?? 0,
      total_duration_minutes: c.total_duration_minutes,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
      </div>
      <CourseCatalog
        courses={cardData}
        initialSubject={params.subject}
        initialGrade={params.grade}
        initialExam={params.exam}
        initialSort={params.sort}
      />
    </div>
  );
}
