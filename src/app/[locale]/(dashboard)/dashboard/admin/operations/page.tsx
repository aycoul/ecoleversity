import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { loadLiveOps } from "@/lib/admin/live-ops-data";
import { Activity, Users, CalendarClock, CalendarDays, Radio, ArrowRight } from "lucide-react";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";

// Re-render every 15s server-side so the founder sees live participant
// counts move without a full client refresh.
export const revalidate = 15;

export default async function OperationsPage() {
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

  const ops = await loadLiveOps();
  const generatedAt = new Date(ops.generatedAt).toLocaleTimeString("fr-FR", { timeZone: "Africa/Abidjan" });

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity className="size-7 text-[var(--ev-blue)]" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Opérations en direct</h1>
            <p className="text-sm text-slate-500">
              Sessions en cours, programme du jour, vue de la semaine. Mise à jour automatique toutes les 15 secondes.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
          MAJ {generatedAt}
        </span>
      </div>

      {/* Live tile */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LiveTile
          icon={Radio}
          label="Sessions en cours"
          value={ops.totals.ongoingCount}
          tone="rose"
          helper={
            ops.totals.activeRoomCount > 0
              ? `${ops.totals.activeRoomCount} salle${ops.totals.activeRoomCount > 1 ? "s" : ""} active${ops.totals.activeRoomCount > 1 ? "s" : ""}`
              : "Aucune diffusion en direct"
          }
        />
        <LiveTile
          icon={Users}
          label="Personnes en ligne"
          value={ops.totals.livePeopleCount}
          tone="green"
          helper="Participants connectés à LiveKit"
        />
        <LiveTile
          icon={CalendarClock}
          label="Programmées aujourd'hui"
          value={ops.totals.todayCount}
          tone="blue"
          helper="Du jour, fuseau Abidjan"
        />
        <LiveTile
          icon={CalendarDays}
          label="Cette semaine"
          value={ops.totals.weekCount}
          tone="violet"
          helper="Lundi → Dimanche (UTC)"
        />
      </div>

      {/* Ongoing now */}
      <Section title="En cours maintenant" empty="Aucune session en direct.">
        {ops.ongoing.map((c) => <OpsCard key={c.id} c={c} highlight />)}
      </Section>

      {/* Today */}
      <Section title="Programme du jour" empty="Pas de session programmée aujourd'hui.">
        {ops.today.map((c) => <OpsCard key={c.id} c={c} />)}
      </Section>

      {/* Week */}
      <Section title="Semaine en cours" empty="Aucune session cette semaine.">
        {ops.week.map((c) => <OpsCard key={c.id} c={c} />)}
      </Section>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const arr = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {arr.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
          {empty}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{arr}</div>
      )}
    </section>
  );
}

function OpsCard({
  c,
  highlight,
}: {
  c: Awaited<ReturnType<typeof loadLiveOps>>["ongoing"][number];
  highlight?: boolean;
}) {
  const subjectLabel = SUBJECT_LABELS[c.subject as Subject] ?? c.subject;
  const start = new Date(c.scheduledAt);
  const dateLabel = start.toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Abidjan",
  });
  const isLive = (c.liveParticipants ?? 0) > 0 || c.status === "live";

  return (
    <Link
      href={`/dashboard/admin/operations/${c.id}`}
      className={`group block rounded-xl border p-4 shadow-sm transition-colors ${
        highlight
          ? "border-rose-300 bg-rose-50 hover:border-rose-400"
          : "border-slate-200 bg-white hover:border-[var(--ev-blue)]/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{c.title ?? subjectLabel}</p>
          <p className="text-xs text-slate-500">
            {subjectLabel} · {c.gradeLevel.toUpperCase()}
          </p>
        </div>
        {isLive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            LIVE
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-600">
        {c.teacherName} · {dateLabel}
      </p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {c.enrolledCount} inscrit{c.enrolledCount > 1 ? "s" : ""}
          {c.liveParticipants !== undefined && (
            <>
              {" · "}
              <span className="font-semibold text-rose-700">
                {c.liveParticipants} en ligne
              </span>
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-[var(--ev-blue)] group-hover:underline">
          Détail
          <ArrowRight className="size-3" />
        </span>
      </div>
    </Link>
  );
}

function LiveTile({
  icon: Icon,
  label,
  value,
  tone,
  helper,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: "blue" | "green" | "violet" | "rose";
  helper: string;
}) {
  const TONE_BG: Record<string, string> = {
    blue: "bg-[var(--ev-blue-50)] text-[var(--ev-blue)]",
    green: "bg-[var(--ev-green-50)] text-[var(--ev-green)]",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className={`flex size-9 items-center justify-center rounded-md ${TONE_BG[tone]}`}>
        <Icon className="size-5" />
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
