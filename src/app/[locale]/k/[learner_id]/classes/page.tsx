import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  UpcomingSessionList,
  type UpcomingSession,
} from "@/components/dashboard/upcoming-session-list";
import { Video } from "lucide-react";

type PageProps = {
  params: Promise<{ learner_id: string }>;
};

export default async function KidClassesPage({ params }: PageProps) {
  const { learner_id } = await params;
  const locale = await getLocale();
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify ownership
  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id, first_name")
    .eq("id", learner_id)
    .eq("parent_id", user.id)
    .maybeSingle();
  if (!learner) redirect("/dashboard/parent/overview");

  // All live class enrollments (upcoming + past)
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, live_class_id")
    .eq("learner_id", learner_id);
  const enrolledClassIds = (enrollments ?? [])
    .map((e) => e.live_class_id as string | null)
    .filter((id): id is string => !!id);

  const { data: allClasses } =
    enrolledClassIds.length > 0
      ? await supabase
          .from("live_classes")
          .select(
            "id, title, scheduled_at, duration_minutes, subject, teacher_id, status"
          )
          .in("id", enrolledClassIds)
          .order("scheduled_at", { ascending: true })
      : { data: [] };

  const now = new Date();
  const upcoming = (allClasses ?? []).filter(
    (c) =>
      (c.status as string) === "scheduled" &&
      new Date(c.scheduled_at as string) >= now
  );
  const past = (allClasses ?? []).filter(
    (c) =>
      (c.status as string) !== "scheduled" ||
      new Date(c.scheduled_at as string) < now
  );

  const teacherIds = Array.from(
    new Set((allClasses ?? []).map((c) => c.teacher_id as string))
  );
  const { data: teachers } =
    teacherIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", teacherIds)
      : { data: [] };

  type ClassRow = {
    id: string;
    title: string;
    scheduled_at: string;
    duration_minutes: number;
    subject: string;
    teacher_id: string;
    status: string;
  };

  const shape = (c: ClassRow): UpcomingSession => ({
    id: c.id,
    title: c.title,
    scheduled_at: new Date(c.scheduled_at),
    duration_minutes: c.duration_minutes,
    teacher_name:
      (teachers ?? []).find((t) => t.id === c.teacher_id)?.display_name ??
      undefined,
    subject: c.subject,
    join_url: `/k/${learner_id}/class/${c.id}/room`,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Video className="size-6 text-[var(--ev-blue)]" />
        <h1 className="text-2xl font-bold text-slate-900">Mes classes</h1>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Prochaines classes
        </h2>
        <UpcomingSessionList
          sessions={upcoming.map((c) => shape(c as unknown as ClassRow))}
          mode="kid"
          locale={locale}
          emptyMessage="Aucune classe prévue. Demande à tes parents de t'inscrire à une classe !"
        />
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Classes passées
          </h2>
          <UpcomingSessionList
            sessions={past.map((c) => shape(c as unknown as ClassRow))}
            mode="kid"
            locale={locale}
          />
        </section>
      )}
    </div>
  );
}
