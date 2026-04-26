import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { loadSessionDetail } from "@/lib/admin/live-ops-data";
import { ArrowLeft, Video, Calendar, Clock, Users, GraduationCap } from "lucide-react";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { SessionRoster } from "@/components/admin/session-roster";

export const dynamic = "force-dynamic";

export default async function AdminSessionDetail({
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
    .select("role, admin_scope")
    .eq("id", user.id)
    .maybeSingle();
  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (profile?.role !== "admin" || !canAccess(scope, "overview")) {
    redirect("/dashboard");
  }

  const detail = await loadSessionDetail(liveClassId);
  if (!detail) notFound();

  const c = detail.classRow;
  const subjectLabel = SUBJECT_LABELS[c.subject as Subject] ?? c.subject;
  const start = new Date(c.scheduledAt);
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
        href="/dashboard/admin/operations"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        Retour aux opérations
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {c.title ?? subjectLabel}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {subjectLabel} · {c.gradeLevel.toUpperCase()} · {c.format === "one_on_one" ? "1-on-1" : "Cours collectif"}
            </p>
            {c.description && (
              <p className="mt-3 text-sm text-slate-600">{c.description}</p>
            )}
          </div>
          <Link
            href={`/session/${c.id}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--ev-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--ev-blue-light)]"
          >
            <Video className="size-4" />
            Rejoindre
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <Stat icon={Users} label="Enseignant" value={c.teacherName} />
          <Stat icon={Calendar} label="Date" value={dateLabel} />
          <Stat icon={Clock} label="Durée" value={`${c.durationMinutes} min`} />
          <Stat icon={GraduationCap} label="Inscrits" value={`${detail.learners.length} / ${c.maxStudents}`} />
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
