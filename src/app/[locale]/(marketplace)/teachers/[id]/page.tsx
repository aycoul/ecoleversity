import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TeacherProfileHeader } from "@/components/teacher/teacher-profile-header";
import { AvailabilityDisplay } from "@/components/teacher/availability-display";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Video,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { SendMessageButton } from "@/components/messaging/send-message-button";
import { loadGroupClasses } from "@/lib/marketplace/group-classes-data";
import { GroupClassListCard } from "@/components/marketplace/group-class-card";
import { Sparkles } from "lucide-react";

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("teacher");

  // Fetch teacher profile + teacher_profiles join
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, city, created_at")
    .eq("id", id)
    .eq("role", "teacher")
    .single();

  if (!profile) {
    notFound();
  }

  const { data: teacherProfile } = await supabase
    .from("teacher_profiles")
    .select(
      "subjects, grade_levels, verification_status, rating_avg, rating_count, follower_count"
    )
    .eq("id", id)
    .single();

  if (!teacherProfile) {
    notFound();
  }

  // Fetch availability
  const { data: availability } = await supabase
    .from("teacher_availability")
    .select("day_of_week, start_time, end_time")
    .eq("teacher_id", id)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  // Fetch upcoming group classes this teacher has published
  const groupClasses = await loadGroupClasses({ teacherId: id, limit: 12 });

  // Fetch upcoming trial sessions
  const now = new Date().toISOString();
  const { data: trialClasses } = await supabase
    .from("live_classes")
    .select("id, title, subject, grade_level, scheduled_at, duration_minutes")
    .eq("teacher_id", id)
    .eq("is_trial", true)
    .eq("status", "scheduled")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(3);

  // Fetch recent reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, created_at, reviewer_id, profiles!reviews_reviewer_id_fkey(display_name, avatar_url)"
    )
    .eq("teacher_id", id)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(5);

  // Check current user follow status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isFollowing = false;
  let isParent = false;
  if (user) {
    const { data: follow } = await supabase
      .from("teacher_followers")
      .select("id")
      .eq("parent_id", user.id)
      .eq("teacher_id", id)
      .maybeSingle();
    isFollowing = !!follow;

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isParent = userProfile?.role === "parent";
  }

  const subjects = (teacherProfile.subjects ?? []) as Subject[];
  const gradeLevels = (teacherProfile.grade_levels ?? []) as GradeLevel[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <TeacherProfileHeader
          teacher={{
            id: profile.id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            city: profile.city,
            created_at: profile.created_at,
            verification_status: teacherProfile.verification_status,
            rating_avg: Number(teacherProfile.rating_avg),
            rating_count: teacherProfile.rating_count,
            follower_count: teacherProfile.follower_count,
          }}
          currentUserId={user?.id ?? null}
          isFollowing={isFollowing}
        />

        {/* Bio */}
        {profile.bio && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              {t("bio")}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Subjects */}
        {subjects.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <BookOpen className="size-4" />
              {t("subjects")}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => (
                <Badge key={s} variant="secondary" className="bg-blue-50 text-blue-700">
                  {SUBJECT_LABELS[s] ?? s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Grade levels */}
        {gradeLevels.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <GraduationCap className="size-4" />
              {t("grades")}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {gradeLevels.map((g) => (
                <Badge
                  key={g}
                  variant="secondary"
                  className="bg-purple-50 text-purple-700"
                >
                  {GRADE_LEVEL_LABELS[g] ?? g}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upcoming trial sessions */}
      {trialClasses && trialClasses.length > 0 && (
        <div className="mt-6 rounded-xl border-2 border-[var(--ev-amber)]/20 bg-[var(--ev-amber)]/5 p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--ev-amber)]">
            <Sparkles className="size-4" />
            Sessions d&apos;essai gratuites
          </h2>
          <div className="space-y-3">
            {trialClasses.map((c) => (
              <Link
                key={c.id}
                href={`/classes/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-[var(--ev-amber)]/40"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {SUBJECT_LABELS[c.subject as Subject] ?? c.subject} —{" "}
                    {new Date(c.scheduled_at).toLocaleDateString("fr-CI", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Africa/Abidjan",
                    })}
                    {" "}· {c.duration_minutes} min
                  </p>
                </div>
                <span className="rounded-full bg-[var(--ev-green-50)] px-3 py-1 text-xs font-semibold text-[var(--ev-green)]">
                  Gratuit
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming group classes */}
      {groupClasses.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Video className="size-4" />
            Prochains cours de groupe
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {groupClasses.map((c) => (
              <GroupClassListCard key={c.id} card={c} compact />
            ))}
          </div>
        </div>
      )}

      {/* Availability */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <AvailabilityDisplay
          slots={
            availability?.map((a) => ({
              day_of_week: a.day_of_week,
              start_time: a.start_time,
              end_time: a.end_time,
            })) ?? []
          }
        />
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/teachers/${id}/book`}
          className={buttonVariants({
            size: "lg",
            className: "w-full bg-[var(--ev-blue)] hover:bg-[var(--ev-blue-light)] sm:w-auto",
          })}
        >
          {t("bookSession")}
        </Link>
        {isParent && <SendMessageButton teacherId={id} />}
      </div>

      {/* Reviews */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MessageSquare className="size-4" />
          {t("reviews")}
        </h2>

        {(!reviews || reviews.length === 0) ? (
          <p className="text-sm text-slate-400 italic">{t("noReviews")}</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const reviewer = review.profiles as unknown as {
                display_name: string;
                avatar_url: string | null;
              } | null;
              return (
                <div
                  key={review.id}
                  className="border-b border-slate-50 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3 ${
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-slate-600">
                      {reviewer?.display_name ?? "Anonyme"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(review.created_at).toLocaleDateString("fr-CI")}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-1 text-sm text-slate-600">
                      {review.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
