import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { Link } from "@/i18n/routing";
import { Calendar, Clock, User, Video } from "lucide-react";

export default async function ParentSessionsPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("session");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch upcoming sessions for this parent via enrollments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("live_class_id")
    .eq("parent_id", user.id);

  const classIds = (enrollments ?? [])
    .map((e) => e.live_class_id)
    .filter(Boolean);

  const { data: sessions } = classIds.length > 0
    ? await supabase
        .from("live_classes")
        .select(
          `
        id,
        jitsi_room_id,
        scheduled_at,
        duration_minutes,
        status,
        subject,
        teacher_id,
        profiles!live_classes_teacher_id_fkey(display_name)
      `
        )
        .in("id", classIds)
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true })
    : { data: [] as never[] };

  const now = Date.now();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("upcoming")}</h1>

      {!sessions || sessions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <Calendar className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="text-sm text-slate-500">{t("noSessions")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const scheduledAt = new Date(session.scheduled_at);
            const startMs = scheduledAt.getTime();
            const isJoinable = now >= startMs - 15 * 60 * 1000;
            const profiles = session.profiles as unknown as
              | { display_name: string | null }[]
              | { display_name: string | null }
              | null;
            const teacherName = Array.isArray(profiles)
              ? profiles[0]?.display_name ?? "—"
              : profiles?.display_name ?? "—";
            const subjectLabel =
              SUBJECT_LABELS[session.subject as Subject] ??
              session.subject ??
              "—";

            return (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <User className="size-4 text-[var(--ev-blue)]" />
                    {t("sessionWith", { teacher: teacherName })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="size-3" />
                    {scheduledAt.toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    {" — "}
                    {scheduledAt.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="size-3" />
                    {t("duration", {
                      duration: String(session.duration_minutes),
                    })}
                    {" — "}
                    {subjectLabel}
                  </div>
                </div>

                <Link
                  href={`/session/${session.id}`}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    isJoinable
                      ? "bg-[var(--ev-blue)] text-white shadow-sm hover:bg-[var(--ev-blue-light)]"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Video className="size-3" />
                  {t("join")}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
