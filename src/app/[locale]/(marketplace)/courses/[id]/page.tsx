import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SUBJECT_LABELS, GRADE_LEVEL_LABELS } from "@/types/domain";
import type { Subject, GradeLevel } from "@/types/domain";
import { Link } from "@/i18n/routing";
import {
  BookOpen,
  Clock,
  Star,
  Users,
  Play,
  Eye,
  GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EnrollButton } from "@/components/course/enroll-button";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations("courseCatalog");

  // Fetch course
  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, title, description, subject, grade_level, exam_type, price_xof, thumbnail_url, teacher_id, rating_avg, rating_count, enrollment_count, total_duration_minutes, status, created_at"
    )
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!course) {
    notFound();
  }

  // Fetch lessons
  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      "id, title, video_url, video_duration_seconds, is_preview, sort_order"
    )
    .eq("course_id", id)
    .order("sort_order", { ascending: true });

  // Fetch teacher profile
  const { data: teacherProfile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio")
    .eq("id", course.teacher_id)
    .single();

  const { data: teacherData } = await supabase
    .from("teacher_profiles")
    .select("rating_avg, rating_count")
    .eq("id", course.teacher_id)
    .single();

  // Fetch reviews for this course
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer_id")
    .eq("course_id", id)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch reviewer names
  const reviewerIds = (reviews ?? []).map((r) => r.reviewer_id);
  const { data: reviewers } =
    reviewerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", reviewerIds)
      : { data: [] };

  const reviewerMap = new Map(
    (reviewers ?? []).map((r) => [r.id, r])
  );

  // Check auth state for enrollment button
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isLoggedIn = false;
  let isParent = false;
  let learners: Array<{
    id: string;
    first_name: string;
    grade_level: GradeLevel;
  }> = [];
  let enrolledLearnerIds: string[] = [];

  if (user) {
    isLoggedIn = true;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "parent") {
      isParent = true;

      // Fetch learners for this parent
      const { data: learnerData } = await supabase
        .from("learner_profiles")
        .select("id, first_name, grade_level")
        .eq("parent_id", user.id);

      learners = (learnerData ?? []) as typeof learners;

      // Check which learners are already enrolled
      if (learners.length > 0) {
        const learnerIds = learners.map((l) => l.id);
        const { data: existingEnrollments } = await supabase
          .from("enrollments")
          .select("learner_id")
          .eq("course_id", id)
          .in("learner_id", learnerIds);

        enrolledLearnerIds = (existingEnrollments ?? []).map(
          (e) => e.learner_id
        );
      }
    }
  }

  const lessonList = lessons ?? [];
  const totalDurationMinutes = course.total_duration_minutes;
  const hours = Math.floor(totalDurationMinutes / 60);
  const minutes = totalDurationMinutes % 60;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero section */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Thumbnail */}
          {course.thumbnail_url ? (
            <div className="overflow-hidden rounded-xl">
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-56 w-full object-cover sm:h-72"
              />
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--ev-green)] to-[var(--ev-blue)] sm:h-72">
              <BookOpen className="size-16 text-white/80" />
            </div>
          )}

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {course.title}
          </h1>

          {/* Teacher link */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-bold text-slate-500">
              {teacherProfile?.avatar_url ? (
                <img
                  src={teacherProfile.avatar_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                (teacherProfile?.display_name ?? "E").charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <Link
                href={`/teachers/${course.teacher_id}`}
                className="font-medium text-slate-800 hover:text-[var(--ev-blue)]"
              >
                {teacherProfile?.display_name ?? "Enseignant"}
              </Link>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {SUBJECT_LABELS[course.subject as Subject] ?? course.subject}
            </Badge>
            <Badge variant="secondary">
              {GRADE_LEVEL_LABELS[course.grade_level as GradeLevel] ??
                course.grade_level}
            </Badge>
            {course.exam_type && (
              <Badge variant="outline">{course.exam_type}</Badge>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Users className="size-4" />
              {t("enrolledStudents", { count: course.enrollment_count })}
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="size-4" />
              {t("lessons", { count: lessonList.length })}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="size-4" />
              {t("totalDuration", { hours, minutes })}
            </div>
            {course.rating_count > 0 && (
              <div className="flex items-center gap-1">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <span className="font-medium text-slate-700">
                  {Number(course.rating_avg).toFixed(1)}
                </span>
                <span>({course.rating_count})</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Price + Enroll */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">
                {course.price_xof.toLocaleString("fr-CI")} FCFA
              </div>
            </div>
            <EnrollButton
              courseId={course.id}
              priceXof={course.price_xof}
              isLoggedIn={isLoggedIn}
              isParent={isParent}
              learners={learners}
              enrolledLearnerIds={enrolledLearnerIds}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-800">
            {t("courseDetails")}
          </h2>
          <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-600">
            {course.description.split("\n").map((p: string, i: number) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      )}

      {/* Syllabus */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <GraduationCap className="size-5 text-[var(--ev-blue)]" />
          {t("syllabus")}
        </h2>
        {lessonList.length === 0 ? (
          <p className="text-sm text-slate-400">--</p>
        ) : (
          <div className="space-y-2">
            {lessonList.map((lesson, index) => {
              const durationMin = Math.ceil(
                lesson.video_duration_seconds / 60
              );
              return (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[var(--ev-green)]/10 text-xs font-bold text-[var(--ev-blue)]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {lesson.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="size-3" />
                        {durationMin} min
                        {lesson.is_preview && (
                          <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                            <Eye className="size-3" />
                            {t("preview")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {lesson.is_preview && lesson.video_url && (
                    <a
                      href={lesson.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg bg-[var(--ev-green-50)] px-3 py-1.5 text-xs font-medium text-[var(--ev-blue)] transition-colors hover:bg-[var(--ev-green)]/10"
                    >
                      <Play className="size-3" />
                      {t("preview")}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teacher card */}
      {teacherProfile && (
        <div className="mb-8">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-lg font-bold text-slate-500">
              {teacherProfile.avatar_url ? (
                <img
                  src={teacherProfile.avatar_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                teacherProfile.display_name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-slate-800">
                {teacherProfile.display_name}
              </div>
              {teacherData && Number(teacherData.rating_count) > 0 && (
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {Number(teacherData.rating_avg).toFixed(1)} (
                  {teacherData.rating_count})
                </div>
              )}
              {teacherProfile.bio && (
                <p className="text-sm text-slate-500 line-clamp-2">
                  {teacherProfile.bio}
                </p>
              )}
            </div>
            <Link
              href={`/teachers/${course.teacher_id}`}
              className="shrink-0 rounded-lg border border-[var(--ev-green)]/20 px-3 py-1.5 text-sm font-medium text-[var(--ev-blue)] transition-colors hover:bg-[var(--ev-green-50)]"
            >
              {t("teacherProfile")}
            </Link>
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Star className="size-5 text-amber-400" />
          {t("courseReviews")}
        </h2>
        {!reviews || reviews.length === 0 ? (
          <p className="text-sm text-slate-400">{t("noReviews")}</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const reviewer = reviewerMap.get(review.reviewer_id);
              return (
                <div
                  key={review.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-500">
                        {reviewer?.avatar_url ? (
                          <img
                            src={reviewer.avatar_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          (reviewer?.display_name ?? "?").charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {reviewer?.display_name ?? "Utilisateur"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-slate-600">{review.comment}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(review.created_at).toLocaleDateString("fr-CI", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
