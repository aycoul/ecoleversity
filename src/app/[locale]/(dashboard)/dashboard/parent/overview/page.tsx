import { getLocale, getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { LearnerCard } from "@/components/dashboard/learner-card";
import {
  UpcomingSessionList,
  type UpcomingSession,
} from "@/components/dashboard/upcoming-session-list";
import {
  ContinueWatchingRail,
  type ContinueWatchingItem,
} from "@/components/dashboard/continue-watching-rail";
import type { GradeLevel } from "@/types/domain";
import { Plus } from "lucide-react";

// Live data — parent queue changes as admin confirms enrollments
export const dynamic = "force-dynamic";

export default async function ParentOverviewPage() {
  const t = await getTranslations("parentOverview");
  const locale = await getLocale();
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const parentFirstName = (profile?.display_name ?? user.email ?? "")
    .split(" ")[0];

  // 1. All children
  const { data: childrenRows } = await supabase
    .from("learner_profiles")
    .select("id, first_name, grade_level, avatar_url")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });
  const children = (childrenRows ?? []).map((c) => ({
    id: c.id as string,
    first_name: c.first_name as string,
    grade_level: c.grade_level as GradeLevel,
    avatar_url: (c.avatar_url as string | null) ?? null,
  }));

  // 2. All enrollments for all children — use admin client because
  // the enrollments RLS policy requires joining learner_profiles.parent_id,
  // which worked in testing but is fragile across edge cases. User identity
  // is already verified above; learner ownership filter is still applied
  // via the `in(learner_id)` clause against children this parent owns.
  const childIds = children.map((c) => c.id);
  const adminRead = createAdminClient();
  const { data: enrollments, error: enrErr } =
    childIds.length > 0
      ? await adminRead
          .from("enrollments")
          .select(
            "id, learner_id, course_id, live_class_id, progress_pct, completed_at, last_lesson_id"
          )
          .in("learner_id", childIds)
      : { data: [], error: null };

  console.log(
    "[parent/overview]",
    "user=", user.id,
    "children=", childIds.length,
    "childIds=", JSON.stringify(childIds),
    "enrollments=", (enrollments ?? []).length,
    "err=", enrErr?.message ?? "none",
  );

  const debugLine = `user=${user.id.slice(0, 8)} children=${childIds.length} enrolls=${(enrollments ?? []).length} err=${enrErr?.message ?? "-"}`;

  // 3. Upcoming live sessions (next 7 days, enrolled classes only)
  const enrolledClassIds = (enrollments ?? [])
    .map((e) => e.live_class_id as string | null)
    .filter((id): id is string => !!id);
  const { data: liveClasses } =
    enrolledClassIds.length > 0
      ? await adminRead
          .from("live_classes")
          .select(
            "id, title, scheduled_at, duration_minutes, subject, teacher_id"
          )
          .in("id", enrolledClassIds)
          .in("status", ["scheduled"])
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(10)
      : { data: [] };

  // Teachers for sessions
  const teacherIds = Array.from(
    new Set((liveClasses ?? []).map((c) => c.teacher_id as string))
  );
  const { data: teachers } =
    teacherIds.length > 0
      ? await adminRead
          .from("profiles")
          .select("id, display_name")
          .in("id", teacherIds)
      : { data: [] };

  // 4. Courses in progress for ContinueWatchingRail
  const courseIds = Array.from(
    new Set(
      (enrollments ?? [])
        .filter((e) => e.course_id && !e.completed_at)
        .map((e) => e.course_id as string)
    )
  );
  const { data: courses } =
    courseIds.length > 0
      ? await supabase
          .from("courses")
          .select("id, title, cover_url")
          .in("id", courseIds)
      : { data: [] };

  // Build next-session-per-child map
  const nextSessionByLearner = new Map<string, Date>();
  for (const session of liveClasses ?? []) {
    const enrolledLearners = (enrollments ?? [])
      .filter((e) => e.live_class_id === session.id)
      .map((e) => e.learner_id as string);
    for (const learnerId of enrolledLearners) {
      if (!nextSessionByLearner.has(learnerId)) {
        nextSessionByLearner.set(learnerId, new Date(session.scheduled_at));
      }
    }
  }

  // Shape sessions for UpcomingSessionList (parent mode — next 5, any kid)
  const upcomingSessions: UpcomingSession[] = (liveClasses ?? [])
    .slice(0, 5)
    .map((c) => {
      const learnerId = (enrollments ?? []).find(
        (e) => e.live_class_id === c.id
      )?.learner_id as string | undefined;
      const learner = children.find((ch) => ch.id === learnerId);
      const teacher = (teachers ?? []).find(
        (t) => t.id === (c.teacher_id as string)
      );
      return {
        id: c.id as string,
        title: c.title as string,
        scheduled_at: new Date(c.scheduled_at as string),
        duration_minutes: c.duration_minutes as number,
        teacher_name: (teacher?.display_name as string | undefined) ?? undefined,
        learner_name: learner?.first_name,
        subject: c.subject as string,
        // Direct link to the LiveKit room — Rejoindre button opens the
        // actual video call, not a detail page.
        join_url: `/session/${c.id}`,
      };
    });

  // Shape continue-watching items
  const continueWatching: ContinueWatchingItem[] = (enrollments ?? [])
    .filter((e) => e.course_id && !e.completed_at && (e.progress_pct ?? 0) > 0)
    .slice(0, 8)
    .map((e) => {
      const course = (courses ?? []).find(
        (c) => c.id === (e.course_id as string)
      );
      const learner = children.find((ch) => ch.id === (e.learner_id as string));
      return {
        enrollment_id: e.id as string,
        course_id: e.course_id as string,
        course_title: (course?.title as string) ?? "Cours",
        course_cover_url: (course?.cover_url as string | null) ?? null,
        progress_pct: (e.progress_pct as number) ?? 0,
        last_lesson_id: (e.last_lesson_id as string | null) ?? null,
        learner_id: e.learner_id as string,
        learner_first_name: learner?.first_name,
      };
    });

  return (
    <div className="space-y-8">
      {/* TEMP DIAGNOSTIC */}
      <div className="rounded-md bg-rose-50 px-3 py-2 font-mono text-[11px] text-rose-700">
        DEBUG: {debugLine}
      </div>
      {/* Greeting banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--ev-blue)] to-[var(--ev-blue-light)] p-6 text-white md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">
          {t("greeting", { name: parentFirstName })}
        </h1>
        <p className="mt-1 text-sm text-white/80 md:text-base">
          {children.length === 0
            ? t("noChildrenCta")
            : t("childCount", { count: children.length })}
        </p>
      </div>

      {/* Kids */}
      {children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-sm text-slate-500">{t("noChildren")}</p>
          <Link
            href="/dashboard/parent/children"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ev-blue)] hover:underline"
          >
            <Plus className="size-4" />
            {t("addChild")}
          </Link>
        </div>
      ) : (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{t("myChildren")}</h2>
            <Link
              href="/dashboard/parent/children"
              className="text-sm font-medium text-[var(--ev-blue)] hover:underline"
            >
              {t("manage")}
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => {
              const childEnrollmentsCount = (enrollments ?? []).filter(
                (e) => e.learner_id === child.id && !e.completed_at
              ).length;
              return (
                <LearnerCard
                  key={child.id}
                  learner={child}
                  enrolledCount={childEnrollmentsCount}
                  nextSessionAt={nextSessionByLearner.get(child.id) ?? null}
                  locale={locale}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming sessions */}
      {children.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            {t("upcomingSessionsTitle")}
          </h2>
          <UpcomingSessionList
            sessions={upcomingSessions}
            mode="parent"
            locale={locale}
          />
        </section>
      )}

      {/* Continue watching */}
      <ContinueWatchingRail items={continueWatching} />
    </div>
  );
}
