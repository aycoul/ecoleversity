import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import {
  loadFinanceSnapshot,
  listTransactions,
  type Granularity,
  type CompareMode,
} from "@/lib/admin/finance-data";
import { BarChart } from "@/components/admin/bar-chart";
import { DonutChart } from "@/components/admin/donut-chart";
import { FinanceInsightsPanel } from "@/components/admin/finance-insights-panel";
import {
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  HandCoins,
  Banknote,
  Receipt,
  RefreshCcw,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

const RANGES: Array<{ days: number; label: string }> = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
  { days: 365, label: "12 mois" },
];

const GRANS: Array<{ value: Granularity; label: string }> = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

const PROVIDERS = ["all", "orange_money", "wave", "paypal", "manual"] as const;
const STATUSES = ["all", "confirmed", "pending", "expired", "refunded"] as const;

type SP = Promise<{
  days?: string;
  gran?: string;
  cmp?: string;
  status?: string;
  provider?: string;
  page?: string;
  q?: string;
}>;

const COMPARE_MODES: Array<{ value: CompareMode; label: string }> = [
  { value: "previous_period", label: "Période préc." },
  { value: "previous_year", label: "Année préc." },
];

function fmtXof(n: number): string {
  return n.toLocaleString("fr-FR");
}

function deltaPct(curr: number, prev: number): { sign: "up" | "down" | "flat"; pct: number } {
  if (prev === 0) {
    return { sign: curr > 0 ? "up" : "flat", pct: curr > 0 ? 100 : 0 };
  }
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.5) return { sign: "flat", pct: 0 };
  return { sign: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
}

function defaultGran(days: number): Granularity {
  if (days <= 14) return "day";
  if (days <= 90) return "day";
  return "week";
}

export default async function FinancePage({ searchParams }: { searchParams: SP }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .maybeSingle();
  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (profile?.role !== "admin" || !canAccess(scope, "finance")) {
    redirect("/dashboard/admin");
  }

  const params = await searchParams;
  const days = Math.min(
    Math.max(parseInt(params.days ?? "30", 10) || 30, 7),
    365
  );
  const gran: Granularity =
    params.gran === "day" || params.gran === "week" || params.gran === "month"
      ? params.gran
      : defaultGran(days);
  const compareMode: CompareMode =
    params.cmp === "previous_year" ? "previous_year" : "previous_period";

  const snap = await loadFinanceSnapshot({ days, granularity: gran, compareMode });

  const txStatus =
    (STATUSES as readonly string[]).includes(params.status ?? "")
      ? (params.status as (typeof STATUSES)[number])
      : "all";
  const txProvider =
    (PROVIDERS as readonly string[]).includes(params.provider ?? "")
      ? (params.provider as string)
      : "all";
  const txPage = Math.max(parseInt(params.page ?? "1", 10) || 1, 1);
  const txSearch = (params.q ?? "").trim().slice(0, 80);

  const txList = await listTransactions({
    status: txStatus === "all" ? undefined : (txStatus as "pending" | "confirmed" | "expired" | "refunded"),
    provider: txProvider,
    search: txSearch || undefined,
    page: txPage,
    perPage: 25,
  });

  const labels = snap.buckets.map((b) => b.label);
  const gmvSeries = snap.buckets.map((b) => b.gmvXof);
  const commissionSeries = snap.buckets.map((b) => b.commissionXof);
  const payoutsSeries = snap.buckets.map((b) => b.payoutsXof);

  const linkBase = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    sp.set("days", String(days));
    sp.set("gran", gran);
    sp.set("cmp", compareMode);
    sp.set("status", txStatus);
    sp.set("provider", txProvider);
    if (txSearch) sp.set("q", txSearch);
    sp.set("page", String(txPage));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) sp.delete(k);
      else sp.set(k, v);
    }
    return `/dashboard/admin/finance?${sp.toString()}`;
  };

  const totalPages = Math.max(1, Math.ceil(txList.total / 25));

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="size-7 text-[var(--ev-blue)]" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Finance &amp; KPI</h1>
            <p className="text-sm text-slate-500">
              Revenus, commissions, versements et historique — comparé à la période précédente.
            </p>
          </div>
        </div>
      </div>

      {/* Range + granularity */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {RANGES.map((r) => {
            const active = r.days === days;
            return (
              <Link
                key={r.days}
                href={linkBase({ days: String(r.days), gran: defaultGran(r.days), page: undefined })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  active ? "bg-[var(--ev-blue)] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {GRANS.map((g) => {
            const active = g.value === gran;
            return (
              <Link
                key={g.value}
                href={linkBase({ gran: g.value })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {g.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <span className="px-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">vs</span>
          {COMPARE_MODES.map((m) => {
            const active = m.value === compareMode;
            return (
              <Link
                key={m.value}
                href={linkBase({ cmp: m.value })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  active ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {m.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="Volume brut (GMV)"
          value={`${fmtXof(snap.totals.gmvXof)} FCFA`}
          previous={snap.previousTotals.gmvXof}
          current={snap.totals.gmvXof}
          tone="blue"
          helper={`${snap.totals.txCount} transactions sur ${days} jours`}
        />
        <KpiCard
          icon={HandCoins}
          label="Commission (revenu plateforme)"
          value={`${fmtXof(snap.totals.commissionXof)} FCFA`}
          previous={snap.previousTotals.commissionXof}
          current={snap.totals.commissionXof}
          tone="green"
          helper={`Net après remboursements: ${fmtXof(snap.totals.netMarginXof)} FCFA`}
        />
        <KpiCard
          icon={Banknote}
          label="Versements aux enseignants"
          value={`${fmtXof(snap.totals.payoutsXof)} FCFA`}
          previous={snap.previousTotals.payoutsXof}
          current={snap.totals.payoutsXof}
          tone="violet"
          helper="Sortie de trésorerie"
        />
        <KpiCard
          icon={RefreshCcw}
          label="Remboursements approuvés"
          value={`${fmtXof(snap.totals.refundsXof)} FCFA`}
          previous={snap.previousTotals.refundsXof}
          current={snap.totals.refundsXof}
          tone="amber"
          inverse
          helper="Charge — moins c'est mieux"
        />
      </div>

      {/* Trend chart with YoY/Period overlay */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Tendance — Volume brut par {gran === "day" ? "jour" : gran === "week" ? "semaine" : "mois"}
          </h2>
          <p className="text-xs text-slate-500">
            FCFA · {snap.buckets.length} période{snap.buckets.length > 1 ? "s" : ""}
          </p>
        </div>
        <BarChart
          labels={labels}
          series={gmvSeries}
          comparison={snap.comparisonBuckets}
          tone="blue"
          formatY={fmtXof}
        />
        <div className="flex items-center justify-end gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block size-3 rounded-sm bg-[var(--ev-blue)]" />
            Période actuelle
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-3 rounded-sm bg-[#bfdbfe] opacity-60" />
            {compareMode === "previous_year" ? "Année préc." : "Période préc."}
          </span>
        </div>
      </section>

      {/* AI Insights — Claude Haiku reads the snapshot above and produces
          actionable recommendations on revenue / retention / pricing /
          teacher support. Cached server-side per user via rate limit. */}
      <FinanceInsightsPanel
        days={days}
        granularity={gran}
        compareMode={compareMode}
      />

      {/* Commission + Payouts side by side */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Commission par période</h3>
            <p className="text-xs text-slate-500">FCFA</p>
          </div>
          <BarChart labels={labels} series={commissionSeries} tone="green" formatY={fmtXof} height={180} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Versements aux enseignants</h3>
            <p className="text-xs text-slate-500">FCFA</p>
          </div>
          <BarChart labels={labels} series={payoutsSeries} tone="violet" formatY={fmtXof} height={180} />
        </div>
      </section>

      {/* Provider breakdown + Top teachers */}
      <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Répartition par moyen de paiement</h3>
          <DonutChart
            slices={snap.byProvider.map((p) => ({
              label: providerLabel(p.provider),
              value: p.gmvXof,
            }))}
            formatValue={(v) => `${fmtXof(v)} FCFA`}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Top enseignants ({snap.topTeachers.length})
          </h3>
          {snap.topTeachers.length === 0 ? (
            <p className="text-xs text-slate-400">Aucune transaction sur la période.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="py-2 text-left text-xs font-medium text-slate-500">Enseignant</th>
                  <th className="py-2 text-right text-xs font-medium text-slate-500">GMV</th>
                  <th className="py-2 text-right text-xs font-medium text-slate-500">Commission</th>
                  <th className="py-2 text-right text-xs font-medium text-slate-500">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {snap.topTeachers.map((t) => (
                  <tr key={t.teacherId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 text-slate-800">{t.displayName}</td>
                    <td className="py-2 text-right tabular-nums">{fmtXof(t.gmvXof)}</td>
                    <td className="py-2 text-right tabular-nums text-emerald-600">
                      {fmtXof(t.commissionXof)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-500">{t.txCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Historical transactions */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Historique des transactions ({txList.total})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <form className="flex items-center gap-2" action="/dashboard/admin/finance">
              <input type="hidden" name="days" value={days} />
              <input type="hidden" name="gran" value={gran} />
              <input type="hidden" name="status" value={txStatus} />
              <input type="hidden" name="provider" value={txProvider} />
              <input
                type="text"
                name="q"
                defaultValue={txSearch}
                placeholder="Recherche réf…"
                className="h-8 w-48 rounded-md border border-slate-300 px-2 text-xs"
              />
              <button
                type="submit"
                className="h-8 rounded-md bg-slate-900 px-3 text-xs font-medium text-white"
              >
                OK
              </button>
            </form>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Statut:</span>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={linkBase({ status: s, page: "1" })}
              className={`rounded-full border px-2.5 py-0.5 transition-colors ${
                s === txStatus
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "Tous" : s}
            </Link>
          ))}
          <span className="ml-2 text-slate-500">Moyen:</span>
          {PROVIDERS.map((p) => (
            <Link
              key={p}
              href={linkBase({ provider: p, page: "1" })}
              className={`rounded-full border px-2.5 py-0.5 transition-colors ${
                p === txProvider
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p === "all" ? "Tous" : providerLabel(p)}
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-2 text-left text-xs font-medium text-slate-500">Date</th>
                <th className="p-2 text-left text-xs font-medium text-slate-500">Parent</th>
                <th className="p-2 text-left text-xs font-medium text-slate-500">Enseignant</th>
                <th className="p-2 text-right text-xs font-medium text-slate-500">Montant</th>
                <th className="p-2 text-right text-xs font-medium text-slate-500">Commission</th>
                <th className="p-2 text-left text-xs font-medium text-slate-500">Moyen</th>
                <th className="p-2 text-left text-xs font-medium text-slate-500">Statut</th>
                <th className="p-2 text-left text-xs font-medium text-slate-500">Réf.</th>
              </tr>
            </thead>
            <tbody>
              {txList.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    Aucune transaction.
                  </td>
                </tr>
              ) : (
                txList.rows.map((r) => {
                  const date = new Date(r.createdAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  });
                  return (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="p-2 text-xs text-slate-600 tabular-nums">{date}</td>
                      <td className="p-2 text-xs">{r.parentName ?? "—"}</td>
                      <td className="p-2 text-xs">{r.teacherName ?? "—"}</td>
                      <td className="p-2 text-right text-xs tabular-nums">{fmtXof(r.amountXof)}</td>
                      <td className="p-2 text-right text-xs tabular-nums text-emerald-600">
                        {fmtXof(r.commissionXof)}
                      </td>
                      <td className="p-2 text-xs">{r.provider ? providerLabel(r.provider) : "—"}</td>
                      <td className="p-2 text-xs">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="p-2 text-xs font-mono text-slate-500">
                        {r.reference ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {txPage} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              {txPage > 1 && (
                <Link
                  href={linkBase({ page: String(txPage - 1) })}
                  className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50"
                >
                  Précédent
                </Link>
              )}
              {txPage < totalPages && (
                <Link
                  href={linkBase({ page: String(txPage + 1) })}
                  className="rounded-md border border-slate-200 px-3 py-1 hover:bg-slate-50"
                >
                  Suivant
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  previous,
  current,
  tone,
  helper,
  inverse,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  previous: number;
  current: number;
  tone: "blue" | "green" | "violet" | "amber";
  helper: string;
  inverse?: boolean;
}) {
  const TONE_BG: Record<string, string> = {
    blue: "bg-[var(--ev-blue-50)] text-[var(--ev-blue)]",
    green: "bg-[var(--ev-green-50)] text-[var(--ev-green)]",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };
  const d = deltaPct(current, previous);
  const isPositive = inverse ? d.sign === "down" : d.sign === "up";
  const isNegative = inverse ? d.sign === "up" : d.sign === "down";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className={`flex size-9 items-center justify-center rounded-md ${TONE_BG[tone]}`}>
          <Icon className="size-5" />
        </div>
        {d.sign !== "flat" && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              isPositive
                ? "bg-emerald-50 text-emerald-700"
                : isNegative
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {d.sign === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {d.pct.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
      <p className="mt-2 text-xs text-slate-400">
        Période préc. : <span className="tabular-nums">{previous.toLocaleString("fr-FR")}</span>
        <ArrowRight className="mx-1 inline-block size-3" />
        <span className="tabular-nums">{current.toLocaleString("fr-FR")}</span>
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const conf: Record<string, string> = {
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    expired: "bg-slate-100 text-slate-600 border-slate-200",
    refunded: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const cls = conf[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {status}
    </span>
  );
}

function providerLabel(provider: string): string {
  const map: Record<string, string> = {
    orange_money: "Orange Money",
    wave: "Wave",
    paypal: "PayPal",
    mtn_momo: "MTN MoMo",
    manual: "Manuel",
    inconnu: "Inconnu",
    all: "Tous",
  };
  return map[provider] ?? provider;
}
