import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadSessionDetail } from "@/lib/admin/live-ops-data";
import { ArrowLeft, Video, Calendar, Clock, GraduationCap, Banknote } from "lucide-react";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { SessionRoster } from "@/components/admin/session-roster";

export const dynamic = "force-dynamic";

/**
 * Teacher's view of a single session — class info, full enrolled-kid
 * roster (with names + ages + parent), and a Join button at the top.
 *
 * The same SessionRoster component admins use is rendered here; the
 * teacher only sees their own classes (enforced by the role + ownership
 * check below + RLS on live_classes).
 */
export default async function TeacherSessionDetail({
  params,
}: {
  params: Promise<{ liveClassId: string }>;
}) {
  const { liveClassId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") redirect("/dashboard");

  const detail = await loadSessionDetail(liveClassId);
  if (!detail) notFound();
  if (detail.classRow.teacherId !== user.id) {
    // Teacher trying to peek at someone else's class.
    redirect("/dashboard/teacher/sessions");
  }

  const c = detail.classRow;
  const subjectLabel = SUBJECT_LABELS[c.subject as Subject] ?? c.subject;
  const start = new Date(c.scheduledAt);
  const startMs = start.getTime();
  const nowMs = Date.now();
  const isJoinable = nowMs >= startMs - 15 * 60 * 1000 &&
    nowMs <= startMs + (c.durationMinutes + 15) * 60 * 1000;
  const dateLabel = start.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Abidjan",
  });

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/dashboard/teacher/sessions"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        Retour à mes sessions
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {c.title ?? subjectLabel}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {subjectLabel} · {c.gradeLevel.toUpperCase()} ·{" "}
              {c.format === "one_on_one" ? "1-on-1" : "Cours collectif"}
            </p>
            {c.description && <p className="mt-3 text-sm text-slate-600">{c.description}</p>}
          </div>
          {isJoinable ? (
            <Link
              href={`/session/${c.id}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--ev-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--ev-blue-light)]"
            >
              <Video className="size-4" />
              Rejoindre
            </Link>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">
              <Video className="size-4" />
              Rejoindre (15 min avant)
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <Stat icon={Calendar} label="Date" value={dateLabel} />
          <Stat icon={Clock} label="Durée" value={`${c.durationMinutes} min`} />
          <Stat
            icon={GraduationCap}
            label="Inscrits"
            value={`${detail.learners.length} / ${c.maxStudents}`}
          />
          <Stat
            icon={Banknote}
            label="Prix"
            value={c.priceXof === 0 ? "Gratuit" : `${c.priceXof.toLocaleString("fr-FR")} FCFA`}
          />
        </div>
      </div>

      <SessionRoster learners={detail.learners} />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-slate-400">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
