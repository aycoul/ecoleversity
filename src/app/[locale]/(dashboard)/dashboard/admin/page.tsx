import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  AlertOctagon,
  ArrowUpRight,
  BarChart3,
  CircleCheck,
  Cpu,
  Flag,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wallet,
  Banknote,
  CalendarCheck,
  UserPlus,
  CircleDollarSign,
} from "lucide-react";
import { loadAdminOverview, formatXof } from "@/lib/admin/overview-data";
import {
  canAccess,
  SCOPE_LABELS_FR,
  type AdminPage,
  type AdminScope,
} from "@/lib/admin/scopes";

export const dynamic = "force-dynamic";

type Tone = "blue" | "green" | "amber" | "rose" | "violet" | "slate";

type AttentionCard = {
  page: AdminPage;
  label: string;
  count: number;
  href: string;
  icon: React.ElementType;
  tone: Tone;
  empty: string;
  helper: string;
};

const TONE_CLASSES: Record<Tone, string> = {
  blue: "bg-[var(--ev-blue-50)] text-[var(--ev-blue)]",
  green: "bg-[var(--ev-green-50)] text-[var(--ev-green)]",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-700",
};

export default async function AdminOverviewPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, admin_scope")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/login");
  }

  const adminScope = (profile.admin_scope as AdminScope | null) ?? null;
  if (!adminScope) {
    // Admin with no scope assigned — tell them to ask the founder.
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Votre compte est marqué administrateur mais n&apos;a pas encore de
        périmètre attribué. Contactez le fondateur pour qu&apos;il définisse
        votre rôle.
      </div>
    );
  }

  const locale = await getLocale();
  const t = await getTranslations("adminOverview");
  const { counts, today, agentEscalations } = await loadAdminOverview();

  const firstName = (profile.display_name ?? user.email ?? "").split(" ")[0];
  const todayLabel = new Date().toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  const cardsUntyped = [
    {
      page: "verification",
      label: t("cards.verification"),
      count: counts.pendingVerifications,
      href: `/${locale}/dashboard/admin/verification`,
      icon: ShieldCheck,
      tone: "blue",
      helper: t("cards.verificationHelper"),
      empty: t("cards.verificationEmpty"),
    },
    {
      page: "payments",
      label: t("cards.payments"),
      count: counts.pendingPayments,
      href: `/${locale}/dashboard/admin/payments`,
      icon: Wallet,
      tone: "green",
      helper: t("cards.paymentsHelper"),
      empty: t("cards.paymentsEmpty"),
    },
    {
      page: "payouts",
      label: t("cards.payouts"),
      count: counts.pendingPayouts,
      href: `/${locale}/dashboard/admin/payouts`,
      icon: Banknote,
      tone: "violet",
      helper: t("cards.payoutsHelper"),
      empty: t("cards.payoutsEmpty"),
    },
    {
      page: "reports",
      label: t("cards.reports"),
      count: counts.pendingReports,
      href: `/${locale}/dashboard/admin/reports`,
      icon: Flag,
      tone: "rose",
      helper: t("cards.reportsHelper"),
      empty: t("cards.reportsEmpty"),
    },
    {
      page: "tickets",
      label: t("cards.tickets"),
      count: counts.openTickets,
      href: `/${locale}/dashboard/admin/tickets`,
      icon: Ticket,
      tone: "amber",
      helper: t("cards.ticketsHelper"),
      empty: t("cards.ticketsEmpty"),
    },
    {
      page: "strikes",
      label: t("cards.strikes"),
      count: counts.activeStrikes,
      href: `/${locale}/dashboard/admin/strikes`,
      icon: AlertOctagon,
      tone: "slate",
      helper: t("cards.strikesHelper"),
      empty: t("cards.strikesEmpty"),
    },
  ] as const;
  const cards: AttentionCard[] = cardsUntyped.filter((c) =>
    canAccess(adminScope, c.page)
  );

  const canSeeMoney =
    canAccess(adminScope, "analytics") || canAccess(adminScope, "payments");

  const totalPendingAttention =
    counts.pendingVerifications +
    counts.pendingPayments +
    counts.pendingPayouts +
    counts.pendingReports +
    counts.openTickets +
    counts.activeStrikes;

  return (
    <div className="space-y-8 pb-16">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--ev-blue)] via-[var(--ev-blue)] to-[var(--ev-blue-light)] p-6 text-white md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/80">
              <Sparkles className="size-3.5" />
              Le Patron · {SCOPE_LABELS_FR[adminScope]}
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              {t("greeting", { name: firstName })}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {todayLabel}
              {" · "}
              {totalPendingAttention === 0
                ? t("allClear")
                : t("pendingSummary", { count: totalPendingAttention })}
            </p>
          </div>
          {/* Hero used to carry a "Voir les agents" CTA — removed as it
              duplicated the sidebar link and the escalation section CTA below.
              Keeping the hero minimal: greeting + today's status line. */}
        </div>
      </section>

      {cards.length > 0 && (() => {
        // Only surface cards with actual pending work; empty categories are
        // already accessible from the sidebar. If everything is clear, show
        // a single reassuring tile instead of six zero-count cards.
        const pending = cards.filter((c) => c.count > 0);
        if (pending.length === 0) {
          return (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                {t("needsAttention")}
              </h2>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                <CircleCheck className="size-5 text-emerald-600" />
                <div>
                  <div className="font-semibold">Tout est à jour</div>
                  <div className="text-xs text-emerald-700/80">
                    Aucune action en attente. Les catégories sont accessibles depuis le menu de gauche.
                  </div>
                </div>
              </div>
            </section>
          );
        }
        return (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              {t("needsAttention")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pending.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.page}
                    href={card.href}
                    className="group rounded-xl border border-slate-200 bg-white p-5 ring-1 ring-[var(--ev-blue)]/10 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex size-10 items-center justify-center rounded-lg ${TONE_CLASSES[card.tone]}`}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span className="inline-flex min-w-[2rem] justify-center rounded-full bg-[var(--ev-blue)] px-2 py-0.5 text-xs font-semibold text-white">
                        {card.count}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-900">
                      {card.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {card.helper}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })()}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {t("todaySnapshot")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {canSeeMoney && (
            <SnapshotTile
              icon={CircleDollarSign}
              tone="green"
              label={t("snapshot.revenue")}
              value={`${formatXof(today.revenueXof)} FCFA`}
              helper={t("snapshot.revenueHelper")}
            />
          )}
          {canSeeMoney && (
            <SnapshotTile
              icon={BarChart3}
              tone="blue"
              label={t("snapshot.gmv")}
              value={`${formatXof(today.gmvXof)} FCFA`}
              helper={t("snapshot.gmvHelper")}
            />
          )}
          <SnapshotTile
            icon={UserPlus}
            tone="violet"
            label={t("snapshot.signups")}
            value={`${today.newSignups}`}
            // When there are no signups today the breakdown would repeat
            // "0 · 0 parents · 0 enseignants". Swap in a neutral helper at
            // zero; keep the split helper when something actually happened.
            helper={
              today.newSignups === 0
                ? t("snapshot.signupsHelper_empty")
                : t("snapshot.signupsHelper", {
                    parents: today.newParents,
                    teachers: today.newTeachers,
                  })
            }
          />
          <SnapshotTile
            icon={CalendarCheck}
            tone="amber"
            // Same reasoning: "0/0" reads as nonsense, "—" reads as empty.
            value={(() => {
              const total =
                today.sessionsScheduledToday + today.sessionsCompleted;
              return total === 0 ? "—" : `${today.sessionsCompleted}/${total}`;
            })()}
            label={t("snapshot.sessions")}
            helper={
              today.sessionsScheduledToday + today.sessionsCompleted === 0
                ? t("snapshot.sessionsHelper_empty")
                : t("snapshot.sessionsHelper")
            }
          />
        </div>
      </section>

      {canAccess(adminScope, "agents") && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {t("agentEscalations")}
            </h2>
            <Link
              href={`/${locale}/dashboard/admin/agents`}
              className="text-sm font-medium text-[var(--ev-blue)] hover:underline"
            >
              {t("viewAll")} →
            </Link>
          </div>
          {agentEscalations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <p className="text-sm text-slate-500">{t("agentsAllQuiet")}</p>
              <p className="mt-1 text-xs text-slate-400">
                {t("agentsAllQuietHelper")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {agentEscalations.map((esc) => (
                <div
                  key={esc.agent}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Cpu className="size-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {esc.agent}
                      </p>
                      <p className="text-xs text-slate-600">
                        {t("pendingDecisions", { count: esc.pending })}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/${locale}/dashboard/admin/agents`}
                    className="text-sm font-medium text-amber-700 hover:underline"
                  >
                    {t("review")}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SnapshotTile({
  icon: Icon,
  tone,
  label,
  value,
  helper,
}: {
  icon: React.ElementType;
  tone: Tone;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div
          className={`flex size-7 items-center justify-center rounded-md ${TONE_CLASSES[tone]}`}
        >
          <Icon className="size-3.5" />
        </div>
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
