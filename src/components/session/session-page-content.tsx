import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { SessionRoom } from "@/components/session/session-room";

type SessionPageContentProps = {
  sessionId: string;
  /**
   * When rendered under /k/[learner_id]/class/[id]/room the outer kid
   * layout already provides the sidebar + back-to-parent-mode button,
   * so we hide the internal back-bar to avoid duplicate navigation.
   */
  hideBackBar?: boolean;
  /**
   * Explicit back-link target. Lets /session/[id] route to the parent
   * overview while /k/.../class/.../room can point at /k/[kid] home
   * — or hide the bar entirely.
   */
  backHref?: string;
  /**
   * Stamped when the parent joined from kid mode. Propagates down to
   * the LiveKit token + chat API so teachers see the kid's name as
   * the participant display / message author.
   */
  actingAsLearnerId?: string;
};

/**
 * Shared server component powering both:
 *   - /session/[id]                 (teacher, admin, legacy parent link)
 *   - /k/[learner_id]/class/[id]/room (kid mode — wrapped in kid layout
 *     so the sidebar stays visible while the class is running)
 *
 * Owns auth, authorization (teacher OR enrolled parent), recording
 * probe, and renders the SessionRoom state machine.
 */
export async function SessionPageContent({
  sessionId,
  hideBackBar = false,
  backHref,
  actingAsLearnerId,
}: SessionPageContentProps) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: liveClass } = await supabase
    .from("live_classes")
    .select(
      `
      id,
      scheduled_at,
      duration_minutes,
      status,
      subject,
      teacher_id,
      profiles!live_classes_teacher_id_fkey(display_name)
    `
    )
    .eq("id", sessionId)
    .single();
  if (!liveClass) notFound();

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();
  if (!userProfile) redirect("/login");

  const role = userProfile.role as "parent" | "teacher" | "admin";

  // Authorization: teacher owns the class OR any of the parent's
  // learners is enrolled OR admin.
  let authorized = role === "admin";
  if (!authorized && role === "teacher" && liveClass.teacher_id === user.id) {
    authorized = true;
  }
  if (!authorized && role === "parent") {
    const { data: enrolledRows } = await supabase
      .from("enrollments")
      .select("learner_id")
      .eq("live_class_id", sessionId);
    const learnerIds = (enrolledRows ?? [])
      .map((e) => e.learner_id as string | null)
      .filter((id): id is string => !!id);
    if (learnerIds.length > 0) {
      const { count } = await supabase
        .from("learner_profiles")
        .select("id", { count: "exact", head: true })
        .in("id", learnerIds)
        .eq("parent_id", user.id);
      if (count && count > 0) authorized = true;
    }
  }
  if (!authorized) redirect("/");

  // Time-gate: parents can only enter the live room within the class
  // window. Teachers and admins can enter any time (set-up before,
  // wrap-up after). Window: 15 min before scheduled_at → 30 min after
  // expected end. Outside window, redirect to dashboard with a flag
  // so the page can show a "session not yet started / already ended"
  // message.
  if (role === "parent") {
    const startMs = new Date(liveClass.scheduled_at as string).getTime();
    const endMs = startMs + ((liveClass.duration_minutes as number) ?? 60) * 60 * 1000;
    const now = Date.now();
    const earliestEntryMs = startMs - 15 * 60 * 1000;
    const latestEntryMs = endMs + 30 * 60 * 1000;
    if (now < earliestEntryMs) {
      redirect("/dashboard/parent/sessions?notice=too_early");
    }
    if (now > latestEntryMs) {
      redirect("/dashboard/parent/sessions?notice=ended");
    }
  }

  const { count: completedRecordings } = await supabase
    .from("session_recordings")
    .select("id", { count: "exact", head: true })
    .eq("live_class_id", sessionId)
    .eq("status", "completed");
  const hasRecording = !!completedRecordings && completedRecordings > 0;

  const profiles = liveClass.profiles as unknown as
    | { display_name: string | null }[]
    | { display_name: string | null }
    | null;
  const teacherName = Array.isArray(profiles)
    ? profiles[0]?.display_name ?? "—"
    : profiles?.display_name ?? "—";
  const subjectLabel =
    SUBJECT_LABELS[liveClass.subject as Subject] ?? liveClass.subject ?? "—";

  const defaultBackHref =
    role === "teacher"
      ? "/dashboard/teacher"
      : role === "admin"
        ? "/dashboard/admin"
        : "/dashboard/parent/overview";
  const resolvedBackHref = backHref ?? defaultBackHref;

  return (
    <div>
      {!hideBackBar && (
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link
              href={resolvedBackHref}
              className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft className="size-4" />
              Retour au tableau de bord
            </Link>
            <div className="hidden text-xs text-slate-500 sm:block">
              {subjectLabel} · {teacherName}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-6">
        <SessionRoom
          sessionId={liveClass.id}
          scheduledAt={liveClass.scheduled_at}
          durationMinutes={liveClass.duration_minutes}
          teacherName={teacherName}
          subjectLabel={subjectLabel}
          userRole={role === "teacher" ? "teacher" : "parent"}
          hasRecording={hasRecording}
          actingAsLearnerId={actingAsLearnerId}
        />
      </div>
    </div>
  );
}
