import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Plus, Calendar, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";

export default async function TeacherClassesPage() {
  const t = await getTranslations("groupClass");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch teacher's group classes
  const { data: classes } = await supabase
    .from("live_classes")
    .select("*")
    .eq("teacher_id", user.id)
    .eq("format", "group")
    .order("scheduled_at", { ascending: false });

  const now = new Date().toISOString();
  const upcoming = (classes ?? []).filter((c) => c.scheduled_at >= now);
  const past = (classes ?? []).filter((c) => c.scheduled_at < now);

  // Get enrollment counts for all classes
  const classIds = (classes ?? []).map((c) => c.id);
  const { data: enrollments } = classIds.length
    ? await supabase
        .from("enrollments")
        .select("live_class_id")
        .in("live_class_id", classIds)
    : { data: [] };

  const enrollmentCounts: Record<string, number> = {};
  (enrollments ?? []).forEach((e) => {
    enrollmentCounts[e.live_class_id] =
      (enrollmentCounts[e.live_class_id] ?? 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("myClasses")}</h1>
        <Link href="/dashboard/teacher/classes/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-2 size-4" />
            {t("createClass")}
          </Button>
        </Link>
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          {t("upcoming")} ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
            {t("noClasses")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((cls) => (
              <ClassRow
                key={cls.id}
                cls={cls}
                enrolledCount={enrollmentCounts[cls.id] ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-500">
            {t("past")} ({past.length})
          </h2>
          <div className="grid gap-4 opacity-60 sm:grid-cols-2">
            {past.map((cls) => (
              <ClassRow
                key={cls.id}
                cls={cls}
                enrolledCount={enrollmentCounts[cls.id] ?? 0}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ClassRow({
  cls,
  enrolledCount,
}: {
  cls: {
    id: string;
    title: string;
    subject: string;
    grade_level: string;
    scheduled_at: string;
    duration_minutes: number;
    max_students: number;
    price_xof: number;
  };
  enrolledCount: number;
}) {
  const date = new Date(cls.scheduled_at);
  const dateStr = date.toLocaleDateString("fr-CI", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("fr-CI", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-800">{cls.title}</h3>
      <div className="mt-2 space-y-1 text-sm text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {SUBJECT_LABELS[cls.subject as Subject] ?? cls.subject}
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {GRADE_LEVEL_LABELS[cls.grade_level as GradeLevel] ?? cls.grade_level}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          {dateStr} {timeStr}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {cls.duration_minutes} min
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5" />
          {enrolledCount}/{cls.max_students}
        </div>
        <div className="font-medium text-slate-700">
          {cls.price_xof.toLocaleString("fr-CI")} FCFA / eleve
        </div>
      </div>
    </div>
  );
}
