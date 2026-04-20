import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  BarChart3,
  CircleDollarSign,
  UserPlus,
  CalendarCheck,
  TrendingUp,
  HandCoins,
  PiggyBank,
  Percent,
  Construction,
} from "lucide-react";
import { loadAnalyticsSnapshot } from "@/lib/admin/analytics-data";
import { formatXof } from "@/lib/admin/overview-data";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { MiniChart } from "@/components/admin/mini-chart";

export const dynamic = "force-dynamic";

const TAB_KEYS = [
  "today",
  "acquisition",
  "marketplace",
  "retention",
  "operations",
  "investor",
] as const;
type Tab = (typeof TAB_KEYS)[number];

type SearchParams = Promise<{ tab?: string; days?: string }>;

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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
  if (!profile || profile.role !== "admin" || !canAccess(scope, "analytics")) {
    redirect("/dashboard/admin");
  }

  const locale = await getLocale();
  const t = await getTranslations("adminAnalytics");
  const params = await searchParams;
  const tab = (TAB_KEYS.includes(params.tab as Tab)
    ? params.tab
    : "today") as Tab;
  const days = params.days === "7" ? 7 : 30;

  const snapshot = await loadAnalyticsSnapshot(days);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <BarChart3 className="size-7 text-[var(--ev-blue)]" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-0">
        {TAB_KEYS.map((k) => {
          const isActive = k === tab;
          return (
            <Link
              key={k}
              href={`/${locale}/dashboard/admin/analytics?tab=${k}${k === "today" || k === "acquisition" || k === "marketplace" ? `&days=${days}` : ""}`}
              className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "border-[var(--ev-blue)] font-semibold text-[var(--ev-blue)]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t(`tabs.${k}`)}
            </Link>
          );
        })}
      </nav>

      {tab === "today" && (
        <TodayTab
          snapshot={snapshot}
          days={days}
          locale={locale}
          currentTab={tab}
          t={t}
        />
      )}

      {tab === "acquisition" && <AcquisitionTab snapshot={snapshot} t={t} />}

      {(tab === "marketplace" ||
        tab === "retention" ||
        tab === "operations" ||
        tab === "investor") && <ComingSoonTab kind={tab} t={t} />}
    </div>
  );
}

function TodayTab({
  snapshot,
  days,
  locale,
  currentTab,
  t,
}: {
  snapshot: Awaited<ReturnType<typeof loadAnalyticsSnapshot>>;
  days: number;
  locale: string;
  currentTab: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const { totals, series } = snapshot;
  const signupsSeries = series.map((b) => b.signups);
  const revenueSeries = series.map((b) => b.revenueXof);
  const gmvSeries = series.map((b) => b.gmvXof);
  const sessionsSeries = series.map((b) => b.sessionsCompleted);

  return (
    <div className="space-y-6">
      {/* Range switcher */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-600">{t("range")}:</span>
        {[7, 30].map((d) => (
          <Link
            key={d}
            href={`/${locale}/dashboard/admin/analytics?tab=${currentTab}&days=${d}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              d === days
                ? "border-[var(--ev-blue)] bg-[var(--ev-blue-50)] text-[var(--ev-blue)]"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t("dayWindow", { days: d })}
          </Link>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label={t("kpi.revenue")}
          value={`${formatXof(totals.revenueXof)} FCFA`}
          helper={t("kpi.revenueHelper", { days })}
          chartData={revenueSeries}
          tone="green"
        />
        <KpiCard
          icon={TrendingUp}
          label={t("kpi.gmv")}
          value={`${formatXof(totals.gmvXof)} FCFA`}
          helper={t("kpi.gmvHelper", { days })}
          chartData={gmvSeries}
          tone="blue"
        />
        <KpiCard
          icon={UserPlus}
          label={t("kpi.signups")}
          value={`${totals.signups}`}
          helper={t("kpi.signupsHelper", {
            parents: totals.signupsParent,
            teachers: totals.signupsTeacher,
          })}
          chartData={signupsSeries}
          tone="violet"
        />
        <KpiCard
          icon={CalendarCheck}
          label={t("kpi.sessions")}
          value={`${totals.sessionsCompleted}/${totals.sessionsScheduled}`}
          helper={
            totals.completionRate !== null
              ? t("kpi.sessionsHelper", {
                  pct: Math.round(totals.completionRate * 100),
                })
              : t("kpi.noSessionData")
          }
          chartData={sessionsSeries}
          tone="amber"
        />
      </div>

      {/* Take rate + per-session economics */}
      <div className="grid gap-3 sm:grid-cols-3">
        <EconTile
          icon={Percent}
          label={t("econ.takeRate")}
          value={
            totals.gmvXof > 0
              ? `${Math.round((totals.revenueXof / totals.gmvXof) * 100)}%`
              : "—"
          }
          helper={t("econ.takeRateHelper")}
        />
        <EconTile
          icon={HandCoins}
          label={t("econ.aov")}
          value={
            totals.sessionsCompleted > 0
              ? `${formatXof(Math.round(totals.gmvXof / totals.sessionsCompleted))} FCFA`
              : "—"
          }
          helper={t("econ.aovHelper")}
        />
        <EconTile
          icon={PiggyBank}
          label={t("econ.avgRevenuePerSession")}
          value={
            totals.sessionsCompleted > 0
              ? `${formatXof(Math.round(totals.revenueXof / totals.sessionsCompleted))} FCFA`
              : "—"
          }
          helper={t("econ.avgRevenuePerSessionHelper")}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">{t("dataNote")}</p>
        <p className="mt-1">{t("dataNoteBody")}</p>
      </section>
    </div>
  );
}

function AcquisitionTab({
  snapshot,
  t,
}: {
  snapshot: Awaited<ReturnType<typeof loadAnalyticsSnapshot>>;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const { totals, series } = snapshot;
  const parentSeries = series.map((b) => b.signupsParent);
  const teacherSeries = series.map((b) => b.signupsTeacher);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">
              {t("acquisition.parents")}
            </p>
            <span className="text-2xl font-bold text-slate-900">
              {totals.signupsParent}
            </span>
          </div>
          <div className="mt-3 w-full">
            <MiniChart
              data={parentSeries}
              tone="violet"
              width={400}
              height={64}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {t("acquisition.parentsHelper")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">
              {t("acquisition.teachers")}
            </p>
            <span className="text-2xl font-bold text-slate-900">
              {totals.signupsTeacher}
            </span>
          </div>
          <div className="mt-3 w-full">
            <MiniChart
              data={teacherSeries}
              tone="blue"
              width={400}
              height={64}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {t("acquisition.teachersHelper")}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        <p className="font-semibold">{t("acquisition.missingTitle")}</p>
        <p className="mt-1">{t("acquisition.missingBody")}</p>
      </section>
    </div>
  );
}

function ComingSoonTab({
  kind,
  t,
}: {
  kind: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center">
      <Construction className="mb-4 size-12 text-slate-300" />
      <p className="text-sm font-semibold text-slate-700">
        {t(`comingSoon.${kind}.title`)}
      </p>
      <p className="mt-1 max-w-md text-xs text-slate-500">
        {t(`comingSoon.${kind}.body`)}
      </p>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  helper,
  chartData,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  helper: string;
  chartData: number[];
  tone: "green" | "blue" | "violet" | "amber";
}) {
  const toneText = {
    green: "text-[var(--ev-green)]",
    blue: "text-[var(--ev-blue)]",
    violet: "text-violet-600",
    amber: "text-amber-600",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
        </div>
        <Icon className={`size-5 shrink-0 ${toneText}`} />
      </div>
      <div className="mt-3 w-full">
        <MiniChart data={chartData} tone={tone} width={240} height={44} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function EconTile({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="size-4" />
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
