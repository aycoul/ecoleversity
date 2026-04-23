import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateRefundAmount } from "@/lib/refund-policy";
import { z } from "zod";

const requestSchema = z.object({
  transactionId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch transaction with related class
    const { data: transaction } = await admin
      .from("transactions")
      .select("id, parent_id, amount_xof, status, live_class_id")
      .eq("id", parsed.data.transactionId)
      .single();

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction introuvable" },
        { status: 404 }
      );
    }

    if (transaction.parent_id !== user.id) {
      return NextResponse.json(
        { error: "Non autorise" },
        { status: 403 }
      );
    }

    if (transaction.status === "refunded") {
      return NextResponse.json(
        { error: "Deja rembourse" },
        { status: 400 }
      );
    }

    // Check for existing pending refund request
    const { data: existing } = await admin
      .from("refund_requests")
      .select("id, status")
      .eq("transaction_id", transaction.id)
      .in("status", ["pending", "approved", "partial"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Une demande de remboursement est deja en cours" },
        { status: 409 }
      );
    }

    // Fetch class start time
    let classStart: Date | null = null;
    if (transaction.live_class_id) {
      const { data: liveClass } = await admin
        .from("live_classes")
        .select("scheduled_at")
        .eq("id", transaction.live_class_id)
        .single();
      if (liveClass) {
        classStart = new Date(liveClass.scheduled_at as string);
      }
    }

    if (!classStart) {
      return NextResponse.json(
        { error: "Cours introuvable" },
        { status: 404 }
      );
    }

    const refund = calculateRefundAmount(classStart, transaction.amount_xof as number);

    if (!refund.eligible) {
      return NextResponse.json(
        { error: "Delai de remboursement depasse (moins de 2h avant le cours)" },
        { status: 400 }
      );
    }

    // Create refund request
    const { data: refundReq, error } = await admin
      .from("refund_requests")
      .insert({
        transaction_id: transaction.id,
        parent_id: user.id,
        live_class_id: transaction.live_class_id as string | null,
        reason: parsed.data.reason ?? null,
        requested_amount_xof: refund.amount,
      })
      .select("id, requested_amount_xof, status")
      .single();

    if (error) {
      console.error("Refund request error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la demande" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      refundRequestId: refundReq.id,
      amount: refund.amount,
      rate: refund.rate,
    });
  } catch (err) {
    console.error("Refund request error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
