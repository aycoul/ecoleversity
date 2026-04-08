import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { Link } from "@/i18n/routing";
import { Calendar, Clock, Users, Video } from "lucide-react";

export default async function TeacherSessionsPage() {
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("session");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch upcoming live classes for this teacher
  const { data: sessions } = await supabase
    .from("live_classes")
    .select(
      `
      id,
      jitsi_room_id,
      scheduled_at,
      duration_minutes,
      status,
      subject,
      enrollments(
        id,
        parent_id,
        profiles!enrollments_parent_id_fkey(display_name)
      )
    `
    )
    .eq("teacher_id", user.id)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true });

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
            const subjectLabel =
              SUBJECT_LABELS[session.subject as Subject] ??
              session.subject ??
              "—";
            const enrollmentCount = session.enrollments?.length ?? 0;

            return (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    {subjectLabel}
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
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {t("duration", {
                        duration: String(session.duration_minutes),
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {enrollmentCount}{" "}
                      {enrollmentCount === 1 ? "inscrit" : "inscrits"}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/session/${session.id}`}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    isJoinable
                      ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
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
