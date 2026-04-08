import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePaymentSms } from "@/lib/payments/bootstrap";

const smsConfirmSchema = z.object({
  amount: z.number().int().positive(),
  senderPhone: z.string().min(10).max(15),
  reference: z.string().min(1),
  provider: z.string().min(1),
  rawSms: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Verify SMS webhook secret
    const secret = request.headers.get("X-SMS-Secret");
    if (!secret || secret !== process.env.SMS_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = smsConfirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { amount, reference, provider, rawSms } = parsed.data;

    // Also parse the raw SMS to double-check
    const smsData = parsePaymentSms(rawSms, provider);
    if (smsData) {
      // Log if parsed amount differs from reported amount
      if (smsData.amount !== amount) {
        console.warn(
          `SMS amount mismatch: reported=${amount}, parsed=${smsData.amount}, ref=${reference}`
        );
      }
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Find transaction by payment reference
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("id, amount_xof, status, parent_id, teacher_id")
      .eq("payment_reference", reference.toUpperCase())
      .single();

    if (txError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found for reference", reference },
        { status: 404 }
      );
    }

    // Already confirmed — idempotent
    if (transaction.status === "confirmed") {
      return NextResponse.json({
        data: { transactionId: transaction.id, status: "already_confirmed" },
      });
    }

    // Verify amount matches (allow small tolerance for fees)
    if (amount < transaction.amount_xof) {
      return NextResponse.json(
        {
          error: "Amount mismatch",
          expected: transaction.amount_xof,
          received: amount,
        },
        { status: 400 }
      );
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "confirmed",
        payment_provider: provider.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
      return NextResponse.json(
        { error: "Failed to confirm transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        transactionId: transaction.id,
        status: "confirmed",
      },
    });
  } catch (err) {
    console.error("SMS confirm error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
