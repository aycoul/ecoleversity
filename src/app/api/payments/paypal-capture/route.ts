import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaypalOrder } from "@/lib/payments/paypal";
import { sendNotification } from "@/lib/notifications/service";

/**
 * POST: Capture and verify a PayPal payment after client-side approval.
 * Called by the PayPal checkout component after the user approves payment.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const orderId = body.orderId;
    const paymentReference = body.paymentReference;

    if (!orderId || !paymentReference) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // Verify with PayPal API
    const verification = await verifyPaypalOrder(orderId);

    if (!verification.success) {
      return NextResponse.json({ error: "Paiement PayPal non vérifié" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Find our transaction
    const { data: transaction } = await adminSupabase
      .from("transactions")
      .select("id, amount_xof, status, parent_id, teacher_id, payment_reference")
      .eq("payment_reference", paymentReference.toUpperCase())
      .eq("parent_id", user.id)
      .single();

    if (!transaction) {
      return NextResponse.json({ error: "Transaction non trouvée" }, { status: 404 });
    }

    if (transaction.status === "confirmed") {
      return NextResponse.json({ data: { status: "already_confirmed" } });
    }

    // Verify amount (PayPal amount in EUR, convert to XOF)
    if (verification.amountXof < transaction.amount_xof * 0.95) {
      // Allow 5% tolerance for currency conversion rounding
      console.warn(
        `[paypal] Amount mismatch: expected=${transaction.amount_xof} XOF, got=${verification.amountXof} XOF (${verification.amount} ${verification.currency})`,
      );
      return NextResponse.json({ error: "Montant insuffisant" }, { status: 400 });
    }

    // Confirm atomically. Destructure error so a silent failure (RLS
    // reject, constraint violation, network blip) can't be mistaken for
    // "no rows matched" — which would wrongly return success to the
    // client while leaving the DB pending.
    const { data: updated, error: updateError } = await adminSupabase
      .from("transactions")
      .update({
        status: "confirmed",
        payment_provider: "paypal",
      })
      .eq("id", transaction.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error(
        "[paypal-capture] Update failed:",
        updateError.code,
        updateError.message,
        updateError.details,
      );
      return NextResponse.json(
        { error: "Erreur lors de la confirmation du paiement" },
        { status: 500 },
      );
    }

    if (!updated) {
      // Race condition — someone else flipped it to confirmed between
      // our SELECT and UPDATE. Treat as success but log so we notice
      // if it starts happening often.
      console.warn(
        "[paypal-capture] update matched 0 rows",
        { tx: transaction.id, startingStatus: transaction.status },
      );
      return NextResponse.json({ data: { status: "already_confirmed" } });
    }

    // Fetch teacher name
    const { data: teacherProfile } = await adminSupabase
      .from("profiles")
      .select("display_name")
      .eq("id", transaction.teacher_id)
      .single();

    // Notify
    if (transaction.parent_id) {
      sendNotification({
        event: "payment_confirmed",
        userId: transaction.parent_id,
        data: {
          amount: transaction.amount_xof,
          teacherName: teacherProfile?.display_name ?? "",
          reference: transaction.payment_reference,
          provider: "paypal",
        },
      }).catch((err) => console.error("[notifications] error:", err));
    }

    return NextResponse.json({ data: { status: "confirmed" } });
  } catch (err) {
    console.error("[paypal-capture] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
