import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Calendar, Clock, Users, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import { EnrollForm } from "@/components/class/enroll-form";
import { WaitlistButton } from "@/components/class/waitlist-button";

type Params = Promise<{ id: string }>;

export default async function ClassDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const t = await getTranslations("groupClass");
  const tCommon = await getTranslations("common");
  const supabase = await createServerSupabaseClient();

  // Fetch class
  const { data: liveClass } = await supabase
    .from("live_classes")
    .select("*")
    .eq("id", id)
    .single();

  if (!liveClass) notFound();

  // Fetch teacher profile
  const { data: teacher } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", liveClass.teacher_id)
    .single();

  // Count enrollments
  const { count: enrollmentCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("live_class_id", id);

  const enrolled = enrollmentCount ?? 0;
  const spotsRemaining = liveClass.max_students - enrolled;
  const isFull = spotsRemaining <= 0;

  // Check if current user is logged in and get their children
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let learners: Array<{ id: string; first_name: string; grade_level: string }> = [];
  let alreadyEnrolledLearnerIds: string[] = [];

  if (user) {
    const { data: children } = await supabase
      .from("learner_profiles")
      .select("id, first_name, grade_level")
      .eq("parent_id", user.id);
    learners = children ?? [];

    // Check which children are already enrolled
    if (learners.length > 0) {
      const { data: existingEnrollments } = await supabase
        .from("enrollments")
        .select("learner_id")
        .eq("live_class_id", id)
        .in(
          "learner_id",
          learners.map((l) => l.id)
        );
      alreadyEnrolledLearnerIds = (existingEnrollments ?? []).map(
        (e) => e.learner_id
      );
    }
  }

  const date = new Date(liveClass.scheduled_at);
  const dateStr = date.toLocaleDateString("fr-CI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("fr-CI", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/classes"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="size-4" />
        {tCommon("back")}
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Header */}
        <h1 className="text-2xl font-bold text-slate-900">{liveClass.title}</h1>

        {/* Teacher */}
        {teacher && (
          <div className="mt-3 flex items-center gap-2">
            <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 overflow-hidden">
              {teacher.avatar_url ? (
                <img
                  src={teacher.avatar_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                teacher.display_name.charAt(0).toUpperCase()
              )}
            </div>
            <Link
              href={`/teachers/${teacher.id}`}
              className="text-sm font-medium text-emerald-600 hover:underline"
            >
              {teacher.display_name}
            </Link>
          </div>
        )}

        {/* Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            {SUBJECT_LABELS[liveClass.subject as Subject] ?? liveClass.subject}
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            {GRADE_LEVEL_LABELS[liveClass.grade_level as GradeLevel] ??
              liveClass.grade_level}
          </span>
        </div>

        {/* Description */}
        {liveClass.description && (
          <p className="mt-4 text-sm text-slate-600 whitespace-pre-wrap">
            {liveClass.description}
          </p>
        )}

        {/* Details grid */}
        <div className="mt-6 grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="size-4 text-emerald-600" />
            <div>
              <div className="font-medium text-slate-800">{dateStr}</div>
              <div>{timeStr}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="size-4 text-emerald-600" />
            <span>{liveClass.duration_minutes} min</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="size-4 text-emerald-600" />
            <span>
              {isFull
                ? t("spotsFull")
                : t("spotsRemaining", { count: spotsRemaining })}
              {" "}
              ({enrolled}/{liveClass.max_students})
            </span>
          </div>
          <div className="text-lg font-bold text-emerald-700">
            {liveClass.price_xof.toLocaleString("fr-CI")} FCFA
            <span className="text-sm font-normal text-slate-400">
              {" "}{t("perStudent")}
            </span>
          </div>
        </div>

        {/* Spots progress bar */}
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                isFull ? "bg-red-400" : "bg-emerald-500"
              }`}
              style={{
                width: `${Math.min(100, Math.round((enrolled / liveClass.max_students) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Enrollment section */}
        <div className="mt-6">
          {!user ? (
            <Link href="/login">
              <button className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700">
                {t("enroll")}
              </button>
            </Link>
          ) : isFull ? (
            <WaitlistButton
              classId={id}
              learners={learners.filter(
                (l) => !alreadyEnrolledLearnerIds.includes(l.id)
              )}
            />
          ) : (
            <EnrollForm
              classId={id}
              learners={learners}
              alreadyEnrolledIds={alreadyEnrolledLearnerIds}
            />
          )}
        </div>
      </div>
    </div>
  );
}
