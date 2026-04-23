import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import { Bookmark, Calendar, Clock, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SavedClassesPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("groupClass");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: saved } = await supabase
    .from("saved_classes")
    .select(`
      id,
      saved_at,
      live_class:live_class_id (
        id, title, subject, grade_level, scheduled_at, duration_minutes, max_students, price_xof, is_trial, status
      )
    `)
    .eq("parent_id", user.id)
    .order("saved_at", { ascending: false });

  // Server component renders once per request — evaluate "now" before JSX.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  const items = (saved ?? []).map((s) => {
    const rawClass = Array.isArray(s.live_class)
      ? (s.live_class[0] as Record<string, unknown> | null)
      : (s.live_class as Record<string, unknown> | null);
    const scheduledMs = rawClass?.scheduled_at
      ? new Date(rawClass.scheduled_at as string).getTime()
      : 0;
    return {
      savedId: s.id,
      savedAt: s.saved_at,
      class: rawClass,
      isPast: scheduledMs > 0 && scheduledMs < nowMs,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("savedClasses")}</h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <Bookmark className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t("noSavedClasses")}</p>
          <Link
            href="/classes"
            className="mt-3 inline-block text-sm font-medium text-[var(--ev-blue)] hover:underline"
          >
            {t("browseClasses")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const cls = item.class;
            if (!cls) return null;

            const scheduledAt = new Date(cls.scheduled_at as string);
            const isPast = item.isPast;
            const subject = SUBJECT_LABELS[cls.subject as Subject] ?? (cls.subject as string);
            const grade = GRADE_LEVEL_LABELS[cls.grade_level as GradeLevel] ?? (cls.grade_level as string);

            return (
              <Link
                key={item.savedId as string}
                href={`/classes/${cls.id as string}`}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[var(--ev-blue)]/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                    {(cls.title as string) ?? subject}
                  </h3>
                  {(cls.is_trial as boolean) && (
                    <span className="shrink-0 rounded-full bg-[var(--ev-amber)]/10 px-2 py-0.5 text-xs font-medium text-[var(--ev-amber)]">
                      {t("freeTrial")}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    {subject}
                  </span>
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                    {grade}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3" />
                    {scheduledAt.toLocaleDateString("fr-CI", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Africa/Abidjan",
                    })}
                    {isPast && (
                      <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        Passé
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3" />
                    {cls.duration_minutes as number} min
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-sm font-bold text-slate-800">
                    {(cls.is_trial as boolean) ? (
                      <span className="text-[var(--ev-green)]">{t("free")}</span>
                    ) : (
                      <>{(cls.price_xof as number).toLocaleString("fr-CI")} FCFA</>
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-[var(--ev-blue)] group-hover:underline">
                    {t("viewDetails")}
                    <ArrowRight className="size-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
