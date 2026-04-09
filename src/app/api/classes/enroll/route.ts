import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  generatePaymentReference,
  calculateCommission,
} from "@/lib/booking";

const enrollSchema = z.object({
  classId: z.string().uuid(),
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

    const { classId, learnerId } = parsed.data;

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    // Verify learner belongs to parent
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

    // Fetch class details
    const { data: liveClass } = await supabase
      .from("live_classes")
      .select("id, teacher_id, max_students, price_xof, status, format")
      .eq("id", classId)
      .single();

    if (!liveClass) {
      return NextResponse.json(
        { error: "Cours non trouve" },
        { status: 404 }
      );
    }

    if (liveClass.status !== "scheduled") {
      return NextResponse.json(
        { error: "Ce cours n'est plus disponible" },
        { status: 400 }
      );
    }

    // Atomic enrollment — prevents TOCTOU race condition via DB-level lock
    const { data: enrollResult, error: enrollRpcError } = await supabase
      .rpc("enroll_learner_atomic", {
        p_learner_id: learnerId,
        p_live_class_id: classId,
      });

    if (enrollRpcError) {
      console.error("Enrollment RPC error:", enrollRpcError);
      return NextResponse.json(
        { error: "Erreur lors de l'inscription" },
        { status: 500 }
      );
    }

    const result = enrollResult as { error?: string; success?: boolean; enrollment_id?: string; current_count?: number };

    if (result.error === "already_enrolled") {
      return NextResponse.json(
        { error: "Deja inscrit a ce cours" },
        { status: 409 }
      );
    }

    if (result.error === "class_not_available") {
      return NextResponse.json(
        { error: "Ce cours n'est plus disponible" },
        { status: 400 }
      );
    }

    // If full, add to waitlist
    if (result.error === "class_full") {
      // Get current max waitlist position
      const { data: maxPos } = await supabase
        .from("waitlists")
        .select("position")
        .eq("live_class_id", classId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = (maxPos?.position ?? 0) + 1;

      const { error: waitlistError } = await supabase
        .from("waitlists")
        .insert({
          live_class_id: classId,
          parent_id: user.id,
          learner_id: learnerId,
          position: nextPosition,
        });

      if (waitlistError) {
        // Could be unique constraint (already on waitlist)
        if (waitlistError.code === "23505") {
          return NextResponse.json(
            { error: "Deja sur la liste d'attente" },
            { status: 409 }
          );
        }
        console.error("Error adding to waitlist:", waitlistError);
        return NextResponse.json(
          { error: "Erreur lors de l'ajout a la liste d'attente" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        waitlisted: true,
        position: nextPosition,
      });
    }

    // Enrollment succeeded via RPC — now create the transaction

    // Get teacher commission rate
    const { data: teacherProfile } = await supabase
      .from("teacher_profiles")
      .select("commission_rate")
      .eq("id", liveClass.teacher_id)
      .single();

    const commissionRate = Number(teacherProfile?.commission_rate) || 0.2;
    const { commission, teacherAmount } = calculateCommission(
      liveClass.price_xof,
      commissionRate
    );
    const paymentReference = generatePaymentReference();

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        parent_id: user.id,
        teacher_id: liveClass.teacher_id,
        type: "class_booking",
        amount_xof: liveClass.price_xof,
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
        .eq("live_class_id", classId)
        .eq("learner_id", learnerId);
      return NextResponse.json(
        { error: "Erreur lors de la creation de la transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      waitlisted: false,
      transactionId: transaction.id,
      paymentReference,
      amountXof: liveClass.price_xof,
    });
  } catch (err) {
    console.error("Enrollment error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
