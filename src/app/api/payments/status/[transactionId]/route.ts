import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;

    const supabase = await createServerSupabaseClient();

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: transaction, error } = await supabase
      .from("transactions")
      .select("id, status, payment_reference, amount_xof, created_at")
      .eq("id", transactionId)
      .eq("parent_id", user.id)
      .single();

    if (error || !transaction) {
      return NextResponse.json(
        { error: "Transaction non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: transaction.id,
        status: transaction.status,
        paymentReference: transaction.payment_reference,
        amountXof: transaction.amount_xof,
        createdAt: transaction.created_at,
      },
    });
  } catch (err) {
    console.error("Payment status check error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
