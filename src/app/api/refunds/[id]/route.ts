import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const processSchema = z.object({
  action: z.enum(["approve", "deny", "partial"]),
  approvedAmountXof: z.number().int().min(0).optional(),
  adminNotes: z.string().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = processSchema.safeParse(body);
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

    // Verify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "school_admin") {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Fetch refund request
    const { data: refundReq } = await admin
      .from("refund_requests")
      .select("id, transaction_id, requested_amount_xof, status")
      .eq("id", id)
      .single();

    if (!refundReq) {
      return NextResponse.json(
        { error: "Demande introuvable" },
        { status: 404 }
      );
    }

    if (refundReq.status !== "pending") {
      return NextResponse.json(
        { error: "Demande deja traitee" },
        { status: 400 }
      );
    }

    const { action, approvedAmountXof, adminNotes } = parsed.data;

    let newStatus: string;
    let finalAmount: number;

    switch (action) {
      case "approve":
        newStatus = "approved";
        finalAmount = refundReq.requested_amount_xof as number;
        break;
      case "deny":
        newStatus = "denied";
        finalAmount = 0;
        break;
      case "partial":
        newStatus = "partial";
        finalAmount = approvedAmountXof ?? 0;
        break;
      default:
        return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    // Update refund request
    const { error: updateError } = await admin
      .from("refund_requests")
      .update({
        status: newStatus,
        approved_amount_xof: finalAmount,
        admin_notes: adminNotes ?? null,
        processed_by: user.id,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Refund process error:", updateError);
      return NextResponse.json(
        { error: "Erreur lors du traitement" },
        { status: 500 }
      );
    }

    // If approved or partial, update transaction status
    if (action === "approve" || action === "partial") {
      const { data: tx } = await admin
        .from("transactions")
        .select("amount_xof")
        .eq("id", refundReq.transaction_id as string)
        .single();

      const txAmount = (tx?.amount_xof as number) ?? 0;
      const newTxStatus = finalAmount >= txAmount ? "refunded" : "partially_refunded";

      await admin
        .from("transactions")
        .update({ status: newTxStatus })
        .eq("id", refundReq.transaction_id as string);
    }

    return NextResponse.json({ success: true, status: newStatus, amount: finalAmount });
  } catch (err) {
    console.error("Refund process error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
