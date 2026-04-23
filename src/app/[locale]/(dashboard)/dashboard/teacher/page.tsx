import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/routing";
import {
  Clock,
  Users,
  Video,
  Wallet,
  MessageCircle,
  CalendarDays,
  Plus,
  BookOpen,
  Star,
  ArrowUpRight,
} from "lucide-react";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { EmptySessionsIllustration } from "@/components/common/empty-state-illustrations";

export const dynamic = "force-dynamic";

function formatCiDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Africa/Abidjan",
    }) +
    " · " +
    d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Abidjan",
    }) +
    " GMT"
  );
}

export default async function TeacherDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "teacher") {
    redirect("/");
  }

  const locale = await getLocale();
  void locale;
  const t = await getTranslations("teacherDashboard");

  const admin = createAdminClient();

  // Upcoming + in-progress sessions. scheduled_at up to 8h in the past
  // still counts if end time is still in the future; JS filter narrows.
  const now = new Date();
  const earliestWindow = new Date(
    now.getTime() - 8 * 60 * 60 * 1000
  ).toISOString();
  const { data: sessionsRaw } = await admin
    .from("live_classes")
    .select(
      "id, title, subject, scheduled_at, duration_minutes, status, format"
    )
    .eq("teacher_id", user.id)
    .in("status", ["scheduled", "live"])
    .gte("scheduled_at", earliestWindow)
    .order("scheduled_at", { ascending: true })
    .limit(10);
  const nowMs = now.getTime();
  const sessions = (sessionsRaw ?? []).filter((s) => {
    const start = new Date(s.scheduled_at as string).getTime();
    const end = start + (s.duration_minutes as number) * 60 * 1000;
    return end > nowMs;
  });

  const sessionIds = (sessions ?? []).map((s) => s.id as string);

  // Enrollment counts per session
  const { data: enrollmentRows } =
    sessionIds.length > 0
      ? await admin
          .from("enrollments")
          .select("live_class_id, learner_id")
          .in("live_class_id", sessionIds)
      : { data: [] };
  const enrolledCountByClass = new Map<string, number>();
  for (const e of enrollmentRows ?? []) {
    const k = e.live_class_id as string;
    enrolledCountByClass.set(k, (enrolledCountByClass.get(k) ?? 0) + 1);
  }

  // Stats — confirmed earnings this month + lifetime confirmed
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const { data: txsThisMonth } = await admin
    .from("transactions")
    .select("teacher_amount")
    .eq("teacher_id", user.id)
    .eq("status", "confirmed")
    .gte("created_at", startOfMonth.toISOString());
  const earnedThisMonth = (txsThisMonth ?? []).reduce(
    (sum, tx) => sum + ((tx.teacher_amount as number) ?? 0),
    0
  );

  const { data: payoutsTotal } = await admin
    .from("teacher_payouts")
    .select("amount_xof")
    .eq("teacher_id", user.id)
    .eq("status", "completed");
  const paidOut = (payoutsTotal ?? []).reduce(
    (s, p) => s + ((p.amount_xof as number) ?? 0),
    0
  );
  const owedNow = Math.max(0, earnedThisMonth - paidOut);

  // Teacher profile stats
  const { data: tp } = await admin
    .from("teacher_profiles")
    .select("verification_status, rating_avg, rating_count, follower_count")
    .eq("id", user.id)
    .maybeSingle();

  const nowTime = new Date().getTime();

  const nextSession = sessions?.[0];
  const imminent =
    nextSession &&
    new Date(nextSession.scheduled_at as string).getTime() - nowTime <=
      15 * 60 * 1000 &&
    new Date(nextSession.scheduled_at as string).getTime() +
      (nextSession.duration_minutes as number) * 60 * 1000 >=
      nowTime;

  return (
    <div className="space-y-8 pb-16">
      {/* Imminent session banner */}
      {imminent && nextSession && (
        <section className="flex flex-col items-start justify-between gap-3 rounded-2xl border-2 border-[var(--ev-amber)] bg-[var(--ev-amber-50)] p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--ev-amber)] opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-[var(--ev-amber)]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--ev-amber-dark)]">
                {t("imminentTitle")}
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                {(nextSession.title as string) ??
                  SUBJECT_LABELS[nextSession.subject as Subject]}{" "}
                · {formatCiDateTime(nextSession.scheduled_at as string)}
              </p>
            </div>
          </div>
          <Link
            href={`/session/${nextSession.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--ev-amber)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--ev-amber-light)]"
          >
            <Video className="size-4" />
            {t("joinNow")}
          </Link>
        </section>
      )}

      {/* Stats row */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label={t("stats.owedNow")}
          value={`${owedNow.toLocaleString("fr-CI")} FCFA`}
          helper={t("stats.owedHelper")}
          href="/dashboard/teacher/earnings"
          tone="green"
        />
        <StatCard
          icon={CalendarDays}
          label={t("stats.upcomingSessions")}
          value={(sessions ?? []).length.toString()}
          helper={t("stats.upcomingHelper")}
          href="/dashboard/teacher/sessions"
          tone="blue"
        />
        <StatCard
          icon={Star}
          label={t("stats.rating")}
          value={
            tp?.rating_count && tp.rating_count > 0
              ? `${Number(tp.rating_avg).toFixed(1)} / 5`
              : "—"
          }
          helper={
            tp?.rating_count && tp.rating_count > 0
              ? t("stats.ratingHelper", { count: tp.rating_count })
              : t("stats.ratingNone")
          }
          href="/dashboard/teacher"
          tone="amber"
        />
      </section>

      {/* Upcoming sessions list */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("upcomingTitle")}
          </h2>
          <Link
            href="/dashboard/teacher/sessions"
            className="text-sm font-medium text-[var(--ev-blue)] hover:underline"
          >
            {t("viewAll")} →
          </Link>
        </div>
        {!sessions || sessions.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-[var(--ev-blue-50)] p-10 text-center">
            <EmptySessionsIllustration className="size-20" />
            <p className="mt-4 text-base font-semibold text-[var(--ev-blue)]">
              {t("noUpcoming")}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t("noUpcomingHelper")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard/teacher/availability"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <CalendarDays className="size-4" />
                {t("setAvailability")}
              </Link>
              <Link
                href="/dashboard/teacher/create"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ev-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--ev-blue-light)]"
              >
                <Plus className="size-4" />
                {t("createClass")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const start = new Date(s.scheduled_at as string).getTime();
              const end = start + (s.duration_minutes as number) * 60 * 1000;
              const isJoinable = nowMs >= start - 15 * 60 * 1000 && nowMs <= end;
              const count = enrolledCountByClass.get(s.id as string) ?? 0;
              return (
                <div
                  key={s.id as string}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {(s.title as string) ??
                        SUBJECT_LABELS[s.subject as Subject]}
                      <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 align-middle">
                        {s.format === "group" ? t("groupTag") : t("soloTag")}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatCiDateTime(s.scheduled_at as string)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <Clock className="mr-1 inline size-3" />
                      {s.duration_minutes as number} min ·{" "}
                      <Users className="mx-1 inline size-3" />
                      {t("enrolled", { count })}
                    </p>
                  </div>
                  <Link
                    href={`/session/${s.id}`}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                      isJoinable
                        ? "bg-[var(--ev-blue)] text-white hover:bg-[var(--ev-blue-light)]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Video className="size-3.5" />
                    {isJoinable ? t("joinNow") : t("joinSoon")}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Shortcuts */}
      <section className="grid gap-3 sm:grid-cols-3">
        <ShortcutCard
          href="/dashboard/teacher/availability"
          icon={CalendarDays}
          title={t("shortcut.availability")}
          helper={t("shortcut.availabilityHelper")}
        />
        <ShortcutCard
          href="/dashboard/teacher/classes"
          icon={BookOpen}
          title={t("shortcut.classes")}
          helper={t("shortcut.classesHelper")}
        />
        <ShortcutCard
          href="/dashboard/teacher/messages"
          icon={MessageCircle}
          title={t("shortcut.messages")}
          helper={t("shortcut.messagesHelper")}
        />
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  href,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  helper: string;
  href: string;
  tone: "blue" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "bg-[var(--ev-green-50)] text-[var(--ev-green)]"
      : tone === "blue"
        ? "bg-[var(--ev-blue-50)] text-[var(--ev-blue)]"
        : "bg-[var(--ev-amber-50)] text-[var(--ev-amber-dark)]";

  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
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
      <div className="mt-2 flex items-center gap-2">
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <ArrowUpRight className="size-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </Link>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  title,
  helper,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  helper: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--ev-blue-50)] text-[var(--ev-blue)]">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{helper}</p>
      </div>
    </Link>
  );
}
