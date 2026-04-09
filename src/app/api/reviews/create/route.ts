import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications/service";

const reviewSchema = z.object({
  liveClassId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Verify parent role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "parent") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { liveClassId, rating, comment } = parsed.data;
    const adminSupabase = createAdminClient();

    // Verify class exists and is completed
    const { data: liveClass, error: classError } = await adminSupabase
      .from("live_classes")
      .select("id, teacher_id, status")
      .eq("id", liveClassId)
      .single();

    if (classError || !liveClass) {
      return NextResponse.json(
        { error: "Cours non trouvé" },
        { status: 404 }
      );
    }

    if (liveClass.status !== "completed") {
      return NextResponse.json(
        { error: "Le cours n'est pas encore terminé" },
        { status: 400 }
      );
    }

    // Verify parent's child was enrolled (enrollments has learner_id, not parent_id)
    const { data: parentLearners } = await adminSupabase
      .from("learner_profiles")
      .select("id")
      .eq("parent_id", user.id);

    const learnerIds = (parentLearners ?? []).map((l) => l.id);

    const { count: enrollCount } = await adminSupabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("live_class_id", liveClassId)
      .in("learner_id", learnerIds.length > 0 ? learnerIds : ["none"]);

    if (!enrollCount || enrollCount === 0) {
      return NextResponse.json(
        { error: "Vous n'êtes pas inscrit à ce cours" },
        { status: 403 }
      );
    }

    // Check if already reviewed
    const { count: existingReview } = await adminSupabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("reviewer_id", user.id)
      .eq("live_class_id", liveClassId);

    if (existingReview && existingReview > 0) {
      return NextResponse.json(
        { error: "Vous avez déjà évalué ce cours" },
        { status: 409 }
      );
    }

    // Insert review (auto-approved)
    const { error: insertError } = await adminSupabase.from("reviews").insert({
      reviewer_id: user.id,
      teacher_id: liveClass.teacher_id,
      live_class_id: liveClassId,
      rating,
      comment: comment ?? null,
      moderation_status: "approved",
    });

    if (insertError) {
      console.error("Error inserting review:", insertError);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'avis" },
        { status: 500 }
      );
    }

    // Recalculate ratings for both teacher and class
    const recalcRating = (oldAvg: number, oldCount: number, newRating: number) => {
      const newCount = oldCount + 1;
      return { newAvg: Math.round(((oldAvg * oldCount + newRating) / newCount) * 10) / 10, newCount };
    };

    const { data: teacherProfile } = await adminSupabase
      .from("teacher_profiles")
      .select("rating_avg, rating_count")
      .eq("id", liveClass.teacher_id)
      .single();

    if (teacherProfile) {
      const { newAvg, newCount } = recalcRating(Number(teacherProfile.rating_avg) || 0, teacherProfile.rating_count || 0, rating);
      await adminSupabase.from("teacher_profiles").update({ rating_avg: newAvg, rating_count: newCount }).eq("id", liveClass.teacher_id);
    }

    const { data: classRating } = await adminSupabase
      .from("live_classes")
      .select("rating_avg, rating_count")
      .eq("id", liveClassId)
      .single();

    if (classRating) {
      const { newAvg, newCount } = recalcRating(Number(classRating.rating_avg) || 0, classRating.rating_count || 0, rating);
      await adminSupabase.from("live_classes").update({ rating_avg: newAvg, rating_count: newCount }).eq("id", liveClassId);
    }

    // Notify the teacher about the new review
    const { data: teacherUser } = await adminSupabase
      .from("teacher_profiles")
      .select("user_id")
      .eq("id", liveClass.teacher_id)
      .single();

    const { data: reviewerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const { data: classInfo } = await adminSupabase
      .from("live_classes")
      .select("title")
      .eq("id", liveClassId)
      .single();

    if (teacherUser) {
      sendNotification({
        event: 'new_review',
        userId: teacherUser.user_id,
        data: {
          reviewerName: reviewerProfile?.full_name ?? 'Un parent',
          rating,
          ...(comment ? { comment } : {}),
          className: classInfo?.title ?? '',
        },
      }).catch((err) => console.error('[notifications] new_review error:', err));
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("Review create error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
