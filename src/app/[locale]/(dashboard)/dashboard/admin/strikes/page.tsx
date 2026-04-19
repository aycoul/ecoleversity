import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AlertOctagon, CircleCheck, Gavel, Users } from "lucide-react";
import {
  loadStrikesGroupedByTeacher,
  countStrikeStats,
} from "@/lib/admin/strikes-data";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { StrikeTimeline } from "@/components/admin/strike-timeline";

export default async function AdminStrikesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .single();

  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (!profile || profile.role !== "admin" || !canAccess(scope, "strikes")) {
    redirect("/dashboard/admin");
  }

  const t = await getTranslations("adminStrikes");
  const [groups, stats] = await Promise.all([
    loadStrikesGroupedByTeacher(),
    countStrikeStats(),
  ]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <AlertOctagon className="size-7 text-rose-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={AlertOctagon}
          label={t("stats.activeTotal")}
          value={stats.activeTotal}
          tone="rose"
        />
        <StatTile
          icon={Gavel}
          label={t("stats.appeals")}
          value={stats.appealsPending}
          tone="blue"
        />
        <StatTile
          icon={Users}
          label={t("stats.restricted")}
          value={stats.teachersRestricted}
          tone="slate"
        />
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <CircleCheck className="mb-3 size-12 text-[var(--ev-green)]" />
          <p className="text-sm font-semibold text-slate-700">{t("empty")}</p>
          <p className="mt-1 text-xs text-slate-400">{t("emptyHelper")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <StrikeTimeline key={g.teacherId} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: "rose" | "blue" | "slate";
}) {
  const toneClass = {
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-[var(--ev-blue-50)] text-[var(--ev-blue)]",
    slate: "bg-slate-100 text-slate-700",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div
          className={`flex size-7 items-center justify-center rounded-md ${toneClass}`}
        >
          <Icon className="size-3.5" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
