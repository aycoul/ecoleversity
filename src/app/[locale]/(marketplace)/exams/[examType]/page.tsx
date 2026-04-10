import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { TARGET_EXAM_LABELS, SUBJECT_LABELS, type TargetExam, type Subject } from "@/types/domain";
import { getExamSubjects, formatDuration } from "@/lib/exam";
import { PracticeTest } from "@/components/exam/practice-test";
import { ArrowLeft, BookOpen, Clock, Trophy } from "lucide-react";

export default async function ExamTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; examType: string }>;
  searchParams: Promise<{ subject?: string; learnerId?: string }>;
}) {
  const { examType } = await params;
  const { subject, learnerId } = await searchParams;
  const t = await getTranslations("exam");

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const examLabel = TARGET_EXAM_LABELS[examType as TargetExam] ?? examType;
  const subjects = getExamSubjects(examType);

  // If subject and learner selected, show the test
  if (subject && learnerId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href={`/exams/${examType}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[var(--ev-blue)]"
        >
          <ArrowLeft className="size-4" />
          {t("backToExam")}
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-[var(--ev-blue)]">
          {examLabel} — {SUBJECT_LABELS[subject as Subject] ?? subject}
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {t("testInstructions")}
        </p>

        <PracticeTest
          examType={examType}
          subject={subject}
          learnerId={learnerId}
        />
      </div>
    );
  }

  // Fetch learner profiles for the parent
  const { data: learners } = await supabase
    .from("learner_profiles")
    .select("id, first_name")
    .eq("parent_id", user.id);

  // Fetch past attempts
  const learnerIds = (learners ?? []).map((l) => l.id);
  const { data: attempts } = learnerIds.length > 0
    ? await supabase
        .from("exam_attempts")
        .select("id, subject, score, total_questions, duration_seconds, created_at, learner_id")
        .eq("exam_type", examType)
        .in("learner_id", learnerIds)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/exams"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[var(--ev-blue)]"
      >
        <ArrowLeft className="size-4" />
        {t("backToHub")}
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-[var(--ev-blue)]">{examLabel}</h1>
      <p className="mb-8 text-slate-600">{t("chooseSubject")}</p>

      {/* Subject cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subj) => (
          <div key={subj} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <BookOpen className="size-5 text-[var(--ev-green)]" />
              <h3 className="font-semibold text-slate-900">
                {SUBJECT_LABELS[subj as Subject] ?? subj}
              </h3>
            </div>

            {/* Start button per learner */}
            <div className="mt-3 space-y-2">
              {(learners ?? []).map((learner) => (
                <Link
                  key={learner.id}
                  href={`/exams/${examType}?subject=${subj}&learnerId=${learner.id}`}
                  className="block rounded-lg bg-[var(--ev-blue)] px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-[var(--ev-blue-light)]"
                >
                  {t("startFor", { name: learner.first_name })}
                </Link>
              ))}
              {(!learners || learners.length === 0) && (
                <p className="text-xs text-slate-400">{t("addChildFirst")}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Past attempts */}
      {attempts && attempts.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-bold text-slate-900">{t("pastAttempts")}</h2>
          <div className="space-y-3">
            {attempts.map((a) => {
              const learnerName = learners?.find((l) => l.id === a.learner_id)?.first_name ?? "";
              const pct = Math.round((a.score / a.total_questions) * 100);
              return (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {learnerName} — {SUBJECT_LABELS[a.subject as Subject] ?? a.subject}
                    </p>
                    <p className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDuration(a.duration_seconds ?? 0)}
                      </span>
                      <span>{new Date(a.created_at).toLocaleDateString("fr-CI")}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className={`size-4 ${pct >= 70 ? "text-green-500" : pct >= 50 ? "text-amber-500" : "text-red-400"}`} />
                    <span className={`text-lg font-bold ${pct >= 70 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
