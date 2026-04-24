import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/routing";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { PlayCircle, Calendar, Clock, Video } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ParentRecordingsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Get parent's learners
  const { data: learners } = await admin
    .from("learner_profiles")
    .select("id, first_name")
    .eq("parent_id", user.id);

  const learnerIds = (learners ?? []).map((l) => l.id as string);
  const learnerName = new Map(
    (learners ?? []).map((l) => [l.id as string, l.first_name as string])
  );

  // Get enrollments
  const { data: enrollments } = learnerIds.length > 0
    ? await admin
        .from("enrollments")
        .select("live_class_id, learner_id")
        .in("learner_id", learnerIds)
    : { data: [] };

  const classIds = Array.from(
    new Set((enrollments ?? []).map((e) => e.live_class_id as string).filter(Boolean))
  );

  // Get recordings for these classes
  const { data: recordings } = classIds.length > 0
    ? await admin
        .from("session_recordings")
        .select("id, live_class_id, duration_seconds, ended_at, summary, ai_status, engagement_json")
        .in("live_class_id", classIds)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
    : { data: [] };

  const recClassIds = Array.from(
    new Set((recordings ?? []).map((r) => r.live_class_id as string))
  );

  // Get class details
  const { data: classes } = recClassIds.length > 0
    ? await admin
        .from("live_classes")
        .select("id, title, subject, teacher_id, scheduled_at, duration_minutes")
        .in("id", recClassIds)
    : { data: [] };

  const classById = new Map((classes ?? []).map((c) => [c.id as string, c]));

  // Get teacher names
  const teacherIds = Array.from(
    new Set((classes ?? []).map((c) => c.teacher_id as string))
  );
  const { data: teachers } = teacherIds.length > 0
    ? await admin.from("profiles").select("id, display_name").in("id", teacherIds)
    : { data: [] };

  const teacherName = new Map(
    (teachers ?? []).map((t) => [t.id as string, (t.display_name as string) ?? "—"])
  );

  // Map learners per class
  const learnersByClass = new Map<string, string[]>();
  for (const e of enrollments ?? []) {
    const cid = e.live_class_id as string;
    const name = learnerName.get(e.learner_id as string);
    if (!name) continue;
    const arr = learnersByClass.get(cid) ?? [];
    arr.push(name);
    learnersByClass.set(cid, arr);
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} min ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Enregistrements</h1>

      {(!recordings || recordings.length === 0) ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <Video className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="text-sm text-slate-500">Aucun enregistrement disponible</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {recordings.map((rec) => {
            const cls = classById.get(rec.live_class_id as string);
            if (!cls) return null;
            const scheduledAt = new Date(cls.scheduled_at as string);
            const subject = SUBJECT_LABELS[cls.subject as Subject] ?? (cls.subject as string);
            const teacher = teacherName.get(cls.teacher_id as string) ?? "—";
            const learners = learnersByClass.get(cls.id as string)?.join(", ") ?? "—";
            const summary = rec.summary as string | null;

            return (
              <div
                key={rec.id as number}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {(cls.title as string) ?? subject}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {teacher} · {learners}
                    </p>
                  </div>
                  <Link
                    href={`/api/recordings/${cls.id}/play?recordingId=${rec.id}`}
                    target="_blank"
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--ev-blue)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--ev-blue-light)]"
                  >
                    <PlayCircle className="size-3.5" />
                    Revoir
                  </Link>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3" />
                    {scheduledAt.toLocaleDateString("fr-CI", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      timeZone: "Africa/Abidjan",
                    })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3" />
                    {formatDuration(rec.duration_seconds as number | null)}
                    {" · "}{subject}
                  </div>
                </div>

                {summary ? (
                  <details className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                    <summary className="cursor-pointer font-semibold text-slate-900">
                      Résumé du cours
                    </summary>
                    <div className="mt-2 whitespace-pre-wrap leading-relaxed">
                      {summary}
                    </div>
                  </details>
                ) : rec.ai_status === "processing" ? (
                  <div className="mt-3 text-xs italic text-slate-400">
                    Résumé en cours de génération…
                  </div>
                ) : null}

                <EngagementBreakdown engagement={rec.engagement_json as Record<string, { name: string; speakingMs: number }> | null} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Speaking-time breakdown per participant. Data lands on
// session_recordings.engagement_json from the teacher's browser as
// { [identity]: { name, speakingMs } }. We normalize to the biggest
// speaker and show percentage bars.
function EngagementBreakdown({
  engagement,
}: {
  engagement: Record<string, { name: string; speakingMs: number }> | null;
}) {
  if (!engagement) return null;
  const rows = Object.values(engagement)
    .filter((r) => r.speakingMs > 1000) // ignore sub-second flickers
    .sort((a, b) => b.speakingMs - a.speakingMs);
  if (rows.length === 0) return null;

  const max = rows[0].speakingMs;
  const total = rows.reduce((s, r) => s + r.speakingMs, 0);

  return (
    <details className="mt-3 rounded-lg bg-[var(--ev-blue-50)] p-3 text-xs text-slate-700">
      <summary className="cursor-pointer font-semibold text-slate-900">
        Temps de parole · {Math.round(total / 1000 / 60)} min
      </summary>
      <div className="mt-2 space-y-1.5">
        {rows.map((r, i) => {
          const pct = max > 0 ? Math.round((r.speakingMs / max) * 100) : 0;
          const mins = Math.max(1, Math.round(r.speakingMs / 1000 / 60));
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate">{r.name}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
                  {mins} min
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full bg-[var(--ev-blue)] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
