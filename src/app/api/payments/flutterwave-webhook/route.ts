import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyFlutterwaveWebhook, verifyFlutterwavePayment } from "@/lib/payments/flutterwave";
import { sendNotification } from "@/lib/notifications/service";

/**
 * Flutterwave webhook — called when a credit card payment completes.
 * Verifies signature, confirms with Flutterwave API, updates transaction.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get("verif-hash");
    if (!verifyFlutterwaveWebhook(signature)) {
      console.warn("[flutterwave-webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = await request.json();
    const flwTransactionId = body.data?.id;
    const txRef = body.data?.tx_ref;

    if (!flwTransactionId || !txRef) {
      return NextResponse.json({ error: "Missing transaction data" }, { status: 400 });
    }

    // Verify payment with Flutterwave API (don't trust webhook data alone)
    const verification = await verifyFlutterwavePayment(String(flwTransactionId));

    if (!verification.success) {
      console.warn(`[flutterwave-webhook] Verification failed for ${flwTransactionId}`);
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find our transaction by payment_reference (txRef format: EV-xxx)
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("id, amount_xof, status, parent_id, teacher_id, payment_reference")
      .eq("payment_reference", verification.txRef.toUpperCase())
      .single();

    if (txError || !transaction) {
      console.error(`[flutterwave-webhook] Transaction not found: ${verification.txRef}`);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Idempotent — already confirmed
    if (transaction.status === "confirmed") {
      return NextResponse.json({ status: "already_confirmed" });
    }

    // Verify amount matches (converted to FCFA)
    if (verification.amountXof < transaction.amount_xof) {
      console.warn(
        `[flutterwave-webhook] Amount mismatch: expected=${transaction.amount_xof} XOF, got=${verification.amountXof} XOF (${verification.amount} ${verification.currency})`,
      );
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Confirm the transaction
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "confirmed",
        payment_provider: "flutterwave",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (updateError) {
      console.error("[flutterwave-webhook] Update error:", updateError);
      return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
    }

    // Fetch teacher name for notification
    const { data: teacherProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", transaction.teacher_id)
      .single();

    // Notify parent
    if (transaction.parent_id) {
      sendNotification({
        event: "payment_confirmed",
        userId: transaction.parent_id,
        data: {
          amount: transaction.amount_xof,
          teacherName: teacherProfile?.display_name ?? "",
          reference: transaction.payment_reference,
          provider: "flutterwave",
        },
      }).catch((err) => console.error("[notifications] payment_confirmed error:", err));
    }

    console.log(
      `[flutterwave-webhook] Confirmed: ${transaction.id} — ${verification.amount} ${verification.currency} → ${verification.amountXof} XOF`,
    );

    return NextResponse.json({ status: "confirmed" });
  } catch (err) {
    console.error("[flutterwave-webhook] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
