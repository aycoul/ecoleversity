import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Inbox } from "lucide-react";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { SummaryReviewCard, type SummaryReviewItem } from "@/components/recordings/summary-review-card";
import { getTranscriptReviewMode } from "@/lib/platform-config";

export const dynamic = "force-dynamic";

/**
 * Teacher's review inbox — only meaningful when transcript_review_mode
 * is 'teacher_review'. Lists every recording from this teacher's classes
 * whose summary is parked at awaiting_teacher.
 */
export default async function TeacherReviewPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") redirect("/dashboard");

  const reviewMode = await getTranscriptReviewMode();

  const admin = createAdminClient();

  const { data: classes } = await admin
    .from("live_classes")
    .select("id, title, subject, scheduled_at")
    .eq("teacher_id", user.id);
  const classIds = (classes ?? []).map((c) => c.id as string);
  const classById = new Map((classes ?? []).map((c) => [c.id as string, c]));

  const { data: recs } =
    classIds.length > 0
      ? await admin
          .from("session_recordings")
          .select("id, live_class_id, summary, ended_at, duration_seconds, summary_review_status")
          .in("live_class_id", classIds)
          .eq("summary_review_status", "awaiting_teacher")
          .order("ended_at", { ascending: false })
      : { data: [] };

  const items: SummaryReviewItem[] = (recs ?? []).map((r) => {
    const cls = classById.get(r.live_class_id as string);
    const subj = cls?.subject as Subject | undefined;
    const subjectLabel = subj ? (SUBJECT_LABELS[subj] ?? subj) : "—";
    return {
      recordingId: r.id as number,
      classTitle: (cls?.title as string | null) ?? subjectLabel,
      subject: subjectLabel,
      scheduledAt: (cls?.scheduled_at as string) ?? (r.ended_at as string),
      initialSummary: (r.summary as string | null) ?? "",
      durationSeconds: (r.duration_seconds as number | null) ?? null,
    };
  });

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <Inbox className="size-7 text-[var(--ev-blue)]" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Revue des résumés</h1>
          <p className="text-sm text-slate-500">
            Relisez et corrigez le résumé généré par l&apos;IA avant qu&apos;il
            ne parte aux parents.
          </p>
        </div>
      </div>

      {reviewMode !== "teacher_review" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Le mode de relecture actuel est <strong>{reviewMode}</strong>. Tant que
          le fondateur ne bascule pas sur <code>teacher_review</code>, les résumés
          ne sont pas mis en file ici.
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Inbox className="mb-3 size-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">
            Aucun résumé en attente
          </p>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            Les résumés générés après chaque s&eacute;ance appara&icirc;tront ici
            pour validation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <SummaryReviewCard key={item.recordingId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
