import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  generatePaymentReference,
  generateJitsiRoomId,
  calculateSessionPrice,
  calculateCommission,
} from "@/lib/booking";

const bookingSchema = z.object({
  teacherId: z.string().uuid(),
  learnerId: z.string().uuid(),
  subject: z.string().min(1),
  gradeLevel: z.string().min(1),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().refine((v) => v === 30 || v === 60, {
    message: "Duration must be 30 or 60 minutes",
  }),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { teacherId, learnerId, subject, gradeLevel, scheduledAt, durationMinutes, note } =
      parsed.data;

    const supabase = await createServerSupabaseClient();

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Verify the learner belongs to this parent
    const { data: learner } = await supabase
      .from("learner_profiles")
      .select("id, parent_id, grade_level")
      .eq("id", learnerId)
      .eq("parent_id", user.id)
      .single();

    if (!learner) {
      return NextResponse.json(
        { error: "Élève non trouvé ou non autorisé" },
        { status: 403 }
      );
    }

    // Verify teacher exists and is verified
    const { data: teacher } = await supabase
      .from("teacher_profiles")
      .select("id, verification_status, commission_rate")
      .eq("id", teacherId)
      .single();

    if (!teacher) {
      return NextResponse.json(
        { error: "Enseignant non trouvé" },
        { status: 404 }
      );
    }

    if (teacher.verification_status !== "fully_verified") {
      return NextResponse.json(
        { error: "Enseignant non vérifié" },
        { status: 400 }
      );
    }

    // Check the time slot is available (no existing live_class at this time)
    const scheduledDate = new Date(scheduledAt);
    const endDate = new Date(scheduledDate.getTime() + durationMinutes * 60 * 1000);

    const { data: conflicts } = await supabase
      .from("live_classes")
      .select("id, scheduled_at, duration_minutes")
      .eq("teacher_id", teacherId)
      .in("status", ["scheduled", "live"])
      .gte("scheduled_at", new Date(scheduledDate.getTime() - 60 * 60 * 1000).toISOString())
      .lte("scheduled_at", endDate.toISOString());

    const hasConflict = (conflicts ?? []).some((c) => {
      const cStart = new Date(c.scheduled_at).getTime();
      const cEnd = cStart + c.duration_minutes * 60 * 1000;
      const sStart = scheduledDate.getTime();
      const sEnd = endDate.getTime();
      return sStart < cEnd && sEnd > cStart;
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: "Ce créneau n'est plus disponible" },
        { status: 409 }
      );
    }

    // Calculate price and commission
    const priceXof = calculateSessionPrice(durationMinutes);
    const commissionRate = Number(teacher.commission_rate) || 0.2;
    const { commission, teacherAmount } = calculateCommission(priceXof, commissionRate);
    const paymentReference = generatePaymentReference();
    const jitsiRoomId = generateJitsiRoomId();

    // Create live_class
    const { data: liveClass, error: classError } = await supabase
      .from("live_classes")
      .insert({
        teacher_id: teacherId,
        title: `Cours particulier — ${subject}`,
        description: note ?? null,
        subject,
        grade_level: gradeLevel,
        format: "one_on_one",
        max_students: 1,
        price_xof: priceXof,
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes,
        recurrence: "one_time",
        jitsi_room_id: jitsiRoomId,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (classError || !liveClass) {
      console.error("Error creating live_class:", classError);
      return NextResponse.json(
        { error: "Erreur lors de la création du cours" },
        { status: 500 }
      );
    }

    // Create enrollment
    const { error: enrollError } = await supabase.from("enrollments").insert({
      learner_id: learnerId,
      live_class_id: liveClass.id,
    });

    if (enrollError) {
      console.error("Error creating enrollment:", enrollError);
      // Clean up the live_class
      await supabase.from("live_classes").delete().eq("id", liveClass.id);
      return NextResponse.json(
        { error: "Erreur lors de l'inscription" },
        { status: 500 }
      );
    }

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        parent_id: user.id,
        teacher_id: teacherId,
        type: "class_booking",
        amount_xof: priceXof,
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
      // Clean up
      await supabase.from("enrollments").delete().eq("live_class_id", liveClass.id);
      await supabase.from("live_classes").delete().eq("id", liveClass.id);
      return NextResponse.json(
        { error: "Erreur lors de la création de la transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookingId: liveClass.id,
      transactionId: transaction.id,
      paymentReference,
      amountXof: priceXof,
    });
  } catch (err) {
    console.error("Booking creation error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
