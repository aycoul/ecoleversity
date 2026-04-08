import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { SUBJECT_LABELS, type Subject } from "@/types/domain";
import { SessionRoom } from "@/components/session/session-room";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("session");

  // Verify authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the live class with teacher profile
  const { data: liveClass } = await supabase
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
    .eq("id", id)
    .single();

  if (!liveClass) {
    notFound();
  }

  // Get current user's profile
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  if (!userProfile) {
    redirect("/login");
  }

  const role = userProfile.role as "parent" | "teacher" | "admin";

  // Authorization: only teacher or enrolled parent can view
  let authorized = false;

  if (role === "teacher" && liveClass.teacher_id === user.id) {
    authorized = true;
  }

  if (role === "parent") {
    // Check if this parent has an enrollment for this class
    const { count } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("live_class_id", id)
      .eq("parent_id", user.id);

    if (count && count > 0) {
      authorized = true;
    }
  }

  if (!authorized) {
    redirect("/dashboard");
  }

  const profiles = liveClass.profiles as unknown as
    | { display_name: string | null }[]
    | { display_name: string | null }
    | null;
  const teacherName = Array.isArray(profiles)
    ? profiles[0]?.display_name ?? "—"
    : profiles?.display_name ?? "—";
  const subjectLabel =
    SUBJECT_LABELS[liveClass.subject as Subject] ?? liveClass.subject ?? "—";
  const displayName = userProfile.display_name ?? user.email ?? "Utilisateur";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SessionRoom
        sessionId={liveClass.id}
        jitsiRoomId={liveClass.jitsi_room_id}
        scheduledAt={liveClass.scheduled_at}
        durationMinutes={liveClass.duration_minutes}
        teacherName={teacherName}
        subjectLabel={subjectLabel}
        userName={displayName}
        userRole={role === "teacher" ? "teacher" : "parent"}
      />
    </div>
  );
}
