import { createAdminClient } from "@/lib/supabase/admin";

export type GroupClassCard = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  gradeLevel: string;
  scheduledAt: string;
  durationMinutes: number;
  priceXof: number;
  maxStudents: number;
  enrolledCount: number;
  spotsLeft: number;
  recurrence: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string | null;
  teacherCity: string | null;
};

type LoadArgs = {
  /** When set, only classes from this teacher. */
  teacherId?: string;
  /** Include past instances. Default false. */
  includePast?: boolean;
  /** Hard cap on returned rows. */
  limit?: number;
};

/**
 * Returns upcoming (or all) scheduled group classes. Uses the admin client
 * because teacher_profiles RLS only exposes fully_verified teachers on the
 * anon/auth-parent key, but the join pattern here is simpler with a bypass
 * and the page-level filter (only verified teachers) still holds.
 */
export async function loadGroupClasses(
  args: LoadArgs = {}
): Promise<GroupClassCard[]> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  let q = supabase
    .from("live_classes")
    .select(
      "id, title, description, subject, grade_level, scheduled_at, duration_minutes, price_xof, max_students, recurrence, teacher_id, status"
    )
    .eq("format", "group")
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .limit(args.limit ?? 50);

  if (args.teacherId) q = q.eq("teacher_id", args.teacherId);
  if (!args.includePast) q = q.gte("scheduled_at", nowIso);

  const { data: classes } = await q;
  if (!classes || classes.length === 0) return [];

  // Filter to verified teachers only
  const teacherIds = Array.from(
    new Set(classes.map((c) => c.teacher_id as string))
  );
  const { data: verifiedRows } = await supabase
    .from("teacher_profiles")
    .select("id, verification_status")
    .in("id", teacherIds)
    .eq("verification_status", "fully_verified");
  const verifiedIds = new Set(
    (verifiedRows ?? []).map((r) => r.id as string)
  );

  const visibleClasses = classes.filter((c) =>
    verifiedIds.has(c.teacher_id as string)
  );
  if (visibleClasses.length === 0) return [];

  // Batch teacher profiles
  const visibleTeacherIds = Array.from(
    new Set(visibleClasses.map((c) => c.teacher_id as string))
  );
  const { data: teacherProfiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, city")
    .in("id", visibleTeacherIds);
  const tById = new Map(
    (teacherProfiles ?? []).map((p) => [p.id as string, p])
  );

  // Enrolled counts per class (excluding cancelled/refunded)
  const classIds = visibleClasses.map((c) => c.id as string);
  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("live_class_id")
    .in("live_class_id", classIds);
  const enrolledByClass = new Map<string, number>();
  for (const e of enrollmentRows ?? []) {
    const k = e.live_class_id as string;
    enrolledByClass.set(k, (enrolledByClass.get(k) ?? 0) + 1);
  }

  return visibleClasses.map((c) => {
    const teacher = tById.get(c.teacher_id as string);
    const enrolled = enrolledByClass.get(c.id as string) ?? 0;
    const max = (c.max_students as number) ?? 0;
    return {
      id: c.id as string,
      title: c.title as string,
      description: (c.description as string | null) ?? null,
      subject: c.subject as string,
      gradeLevel: c.grade_level as string,
      scheduledAt: c.scheduled_at as string,
      durationMinutes: c.duration_minutes as number,
      priceXof: c.price_xof as number,
      maxStudents: max,
      enrolledCount: enrolled,
      spotsLeft: Math.max(0, max - enrolled),
      recurrence: (c.recurrence as string) ?? "one_time",
      teacherId: c.teacher_id as string,
      teacherName: (teacher?.display_name as string | undefined) ?? "—",
      teacherAvatar: (teacher?.avatar_url as string | null | undefined) ?? null,
      teacherCity: (teacher?.city as string | null | undefined) ?? null,
    };
  });
}

export function formatClassDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-CI", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Africa/Abidjan",
    }) +
    " · " +
    d.toLocaleTimeString("fr-CI", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Abidjan",
    }) +
    " GMT"
  );
}
