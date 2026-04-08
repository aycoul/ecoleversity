import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  generatePaymentReference,
  calculateCommission,
} from "@/lib/booking";

const enrollSchema = z.object({
  courseId: z.string().uuid(),
  learnerId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = enrollSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { courseId, learnerId } = parsed.data;

    const supabase = await createServerSupabaseClient();

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    // Verify the learner belongs to this parent
    const { data: learner } = await supabase
      .from("learner_profiles")
      .select("id, parent_id")
      .eq("id", learnerId)
      .eq("parent_id", user.id)
      .single();

    if (!learner) {
      return NextResponse.json(
        { error: "Eleve non trouve ou non autorise" },
        { status: 403 }
      );
    }

    // Verify course exists and is published
    const { data: course } = await supabase
      .from("courses")
      .select("id, teacher_id, price_xof, status, title")
      .eq("id", courseId)
      .single();

    if (!course) {
      return NextResponse.json(
        { error: "Cours non trouve" },
        { status: 404 }
      );
    }

    if (course.status !== "published") {
      return NextResponse.json(
        { error: "Ce cours n'est pas disponible" },
        { status: 400 }
      );
    }

    // Check not already enrolled
    const { data: existingEnrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("learner_id", learnerId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "Deja inscrit a ce cours" },
        { status: 409 }
      );
    }

    // Get teacher commission rate
    const { data: teacherProfile } = await supabase
      .from("teacher_profiles")
      .select("commission_rate")
      .eq("id", course.teacher_id)
      .single();

    const commissionRate = Number(teacherProfile?.commission_rate) || 0.2;
    const { commission, teacherAmount } = calculateCommission(
      course.price_xof,
      commissionRate
    );
    const paymentReference = generatePaymentReference();

    // Create enrollment
    const { error: enrollError } = await supabase.from("enrollments").insert({
      learner_id: learnerId,
      course_id: courseId,
    });

    if (enrollError) {
      console.error("Error creating enrollment:", enrollError);
      return NextResponse.json(
        { error: "Erreur lors de l'inscription" },
        { status: 500 }
      );
    }

    // Increment enrollment_count on course
    const { data: currentCourse } = await supabase
      .from("courses")
      .select("enrollment_count")
      .eq("id", courseId)
      .single();

    if (currentCourse) {
      await supabase
        .from("courses")
        .update({
          enrollment_count: (currentCourse.enrollment_count ?? 0) + 1,
        })
        .eq("id", courseId);
    }

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        parent_id: user.id,
        teacher_id: course.teacher_id,
        type: "course_purchase",
        amount_xof: course.price_xof,
        currency: "XOF",
        commission_amount: commission,
        teacher_amount: teacherAmount,
        payment_provider: "orange_money",
        payment_reference: paymentReference,
        status: "pending",
      })
      .select("id")
      .single();

    if (txError || !transaction) {
      console.error("Error creating transaction:", txError);
      // Clean up enrollment
      await supabase
        .from("enrollments")
        .delete()
        .eq("learner_id", learnerId)
        .eq("course_id", courseId);
      return NextResponse.json(
        { error: "Erreur lors de la creation de la transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      enrollmentId: courseId,
      transactionId: transaction.id,
      paymentReference,
      amountXof: course.price_xof,
    });
  } catch (err) {
    console.error("Course enrollment error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
