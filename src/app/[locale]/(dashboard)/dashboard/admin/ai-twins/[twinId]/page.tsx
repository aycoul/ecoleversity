import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";

/**
 * Per-twin inspector. Admin lands here from /dashboard/admin/ai-twins and
 * sees every training_content row for the twin — transcript, structured
 * payload, topics, style signals — so they can judge whether the twin is
 * ready for public rollout.
 *
 * Read-only. Actions (activate twin, retrain, etc.) land later when the
 * training job is implemented.
 */

type Twin = {
  id: string;
  teacher_id: string;
  subject: string;
  grade_level: string;
  maturity_level: string;
  is_active: boolean;
  total_recordings_processed: number | null;
  last_trained_at: string | null;
  teaching_style_profile: Record<string, unknown> | null;
};

type TrainingRow = {
  id: string;
  source_type: string;
  source_id: string | null;
  transcription: string | null;
  training_payload: {
    segments?: Array<{ t: number; end: number; speaker: string; text: string }>;
    topics?: string[];
    qAndA?: Array<{ question: string; answerSummary: string }>;
    teacherStyleSignals?: {
      tone?: string[];
      vocabularyLevel?: string;
      pedagogicalPatterns?: string[];
    };
  } | null;
  duration_seconds: number | null;
  segment_count: number | null;
  language: string | null;
  processed_at: string | null;
  created_at: string;
};

function fmt(d: string): string {
  return new Date(d).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Abidjan",
  });
}

function fmtDuration(s: number | null): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m} min ${r}s`;
}

export default async function AiTwinDetailPage({
  params,
}: {
  params: Promise<{ twinId: string }>;
}) {
  const { twinId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createAdminClient();
  const { data: twin } = await admin
    .from("ai_teacher_twins")
    .select(
      "id, teacher_id, subject, grade_level, maturity_level, is_active, total_recordings_processed, last_trained_at, teaching_style_profile"
    )
    .eq("id", twinId)
    .maybeSingle<Twin>();
  if (!twin) notFound();

  const { data: teacherProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", twin.teacher_id)
    .maybeSingle<{ display_name: string | null }>();

  const { data: rows } = await admin
    .from("ai_training_content")
    .select(
      "id, source_type, source_id, transcription, training_payload, duration_seconds, segment_count, language, processed_at, created_at"
    )
    .eq("twin_id", twinId)
    .order("created_at", { ascending: false })
    .returns<TrainingRow[]>();
  const trainingRows = rows ?? [];

  const subjectLabel =
    SUBJECT_LABELS[twin.subject as Subject] ?? twin.subject;

  // Aggregate teacher-style signals across all sessions for a quick profile.
  const toneTally = new Map<string, number>();
  const pedTally = new Map<string, number>();
  const topicsTally = new Map<string, number>();
  let vocab: string | null = null;
  for (const r of trainingRows) {
    const sig = r.training_payload?.teacherStyleSignals;
    if (sig?.tone) for (const t of sig.tone) toneTally.set(t, (toneTally.get(t) ?? 0) + 1);
    if (sig?.pedagogicalPatterns)
      for (const p of sig.pedagogicalPatterns) pedTally.set(p, (pedTally.get(p) ?? 0) + 1);
    if (sig?.vocabularyLevel) vocab = sig.vocabularyLevel;
    for (const t of r.training_payload?.topics ?? []) topicsTally.set(t, (topicsTally.get(t) ?? 0) + 1);
  }
  const sortTally = (m: Map<string, number>) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/ai-twins"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Retour aux jumeaux
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {teacherProfile?.display_name ?? "—"} · {subjectLabel} · {twin.grade_level.toUpperCase()}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Maturité <code>{twin.maturity_level}</code> ·{" "}
          {twin.is_active ? "Actif" : "Inactif"} ·{" "}
          {trainingRows.length} séance(s) d&apos;entraînement collectée(s)
        </p>
      </div>

      {/* Aggregated style profile — what the twin has learned so far. */}
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Profil pédagogique agrégé
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Tonalités observées</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {sortTally(toneTally).map(([t, n]) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200"
                >
                  {t} <span className="text-slate-400">×{n}</span>
                </span>
              ))}
              {toneTally.size === 0 && <span className="text-sm text-slate-400">—</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Patterns pédagogiques</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {sortTally(pedTally).map(([t, n]) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200"
                >
                  {t} <span className="text-slate-400">×{n}</span>
                </span>
              ))}
              {pedTally.size === 0 && <span className="text-sm text-slate-400">—</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Niveau de vocabulaire</div>
            <div className="mt-1 text-sm text-slate-700">{vocab ?? "—"}</div>
            <div className="mt-3 text-xs text-slate-500">Sujets couverts</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {sortTally(topicsTally).map(([t, n]) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200"
                >
                  {t} <span className="text-slate-400">×{n}</span>
                </span>
              ))}
              {topicsTally.size === 0 && <span className="text-sm text-slate-400">—</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Per-session training rows with expandable transcript + structured data. */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Séances individuelles
        </h2>

        {trainingRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Aucune séance transcrite. Le jumeau sera alimenté dès la prochaine séance enregistrée.
          </div>
        )}

        {trainingRows.map((row) => {
          const payload = row.training_payload ?? {};
          const topics = payload.topics ?? [];
          const segments = payload.segments ?? [];
          const qnas = payload.qAndA ?? [];
          return (
            <div
              key={row.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Séance {row.source_type === "live_recording" ? "en direct" : row.source_type}
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.processed_at ? fmt(row.processed_at) : fmt(row.created_at)} ·{" "}
                    {fmtDuration(row.duration_seconds)} ·{" "}
                    {row.segment_count ?? segments.length} segments ·{" "}
                    {(row.transcription ?? "").length.toLocaleString("fr-FR")} caractères
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {topics.slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full bg-[var(--ev-green)]/10 px-2 py-0.5 text-xs font-medium text-[var(--ev-blue)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <details className="mt-4 rounded-lg bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Transcription complète
                </summary>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                  {row.transcription ?? "—"}
                </pre>
              </details>

              {segments.length > 0 && (
                <details className="mt-3 rounded-lg bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                    Segments avec locuteurs ({segments.length})
                  </summary>
                  <div className="mt-2 max-h-96 overflow-auto space-y-1.5 text-xs">
                    {segments.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="shrink-0 font-mono text-slate-400">
                          {String(Math.floor(s.t / 60)).padStart(2, "0")}:
                          {String(Math.floor(s.t % 60)).padStart(2, "0")}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 ${
                            s.speaker === "teacher"
                              ? "bg-blue-100 text-blue-700"
                              : s.speaker === "student"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {s.speaker}
                        </span>
                        <span className="text-slate-700">{s.text}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {qnas.length > 0 && (
                <details className="mt-3 rounded-lg bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                    Questions/Réponses extraites ({qnas.length})
                  </summary>
                  <div className="mt-2 space-y-3 text-xs">
                    {qnas.map((qa, i) => (
                      <div key={i} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                        <div className="font-medium text-slate-900">
                          Q. {qa.question}
                        </div>
                        <div className="mt-1 text-slate-600">
                          R. {qa.answerSummary}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <div className="mt-3 text-xs text-slate-400">
                <a
                  href={`/api/admin/ai-twins/${twin.id}/export?rowId=${row.id}`}
                  className="underline hover:text-slate-600"
                >
                  Télécharger le JSON brut
                </a>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
