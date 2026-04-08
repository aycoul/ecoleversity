import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BookingForm } from "@/components/booking/booking-form";
import type { Subject, GradeLevel } from "@/types/domain";
import { Link } from "@/i18n/routing";
import { ChevronLeft } from "lucide-react";

export default async function BookSessionPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("booking");
  const tCommon = await getTranslations("common");

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch teacher profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", id)
    .eq("role", "teacher")
    .single();

  if (!profile) {
    notFound();
  }

  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select("subjects, verification_status")
    .eq("id", id)
    .single();

  if (!teacherProfile || teacherProfile.verification_status !== "fully_verified") {
    notFound();
  }

  // Fetch teacher availability
  const { data: availability } = await supabase
    .from("teacher_availability")
    .select("day_of_week, start_time, end_time")
    .eq("teacher_id", id)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  // Fetch existing bookings for next 7 days to filter conflicts
  const now = new Date();
  const in7days = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  const { data: existingBookings } = await supabase
    .from("live_classes")
    .select("scheduled_at, duration_minutes")
    .eq("teacher_id", id)
    .in("status", ["scheduled", "live"])
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in7days.toISOString());

  // Fetch parent's learner profiles
  const { data: learners } = await supabase
    .from("learner_profiles")
    .select("id, first_name, grade_level")
    .eq("parent_id", user.id)
    .order("created_at");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Back link */}
      <Link
        href={`/teachers/${id}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="size-4" />
        {tCommon("back")}
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-slate-800">{t("title")}</h1>

      <BookingForm
        teacher={{
          id: profile.id,
          display_name: profile.display_name,
          subjects: (teacherProfile.subjects ?? []) as Subject[],
        }}
        availability={
          (availability ?? []).map((a) => ({
            day_of_week: a.day_of_week,
            start_time: a.start_time,
            end_time: a.end_time,
          }))
        }
        existingBookings={
          (existingBookings ?? []).map((b) => ({
            scheduled_at: b.scheduled_at,
            duration_minutes: b.duration_minutes,
          }))
        }
        learners={
          (learners ?? []).map((l) => ({
            id: l.id,
            first_name: l.first_name,
            grade_level: l.grade_level as GradeLevel,
          }))
        }
      />
    </div>
  );
}
