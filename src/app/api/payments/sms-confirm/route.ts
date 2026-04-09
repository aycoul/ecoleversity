import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePaymentSms } from "@/lib/payments/bootstrap";
import { sendNotification } from "@/lib/notifications/service";
import crypto from "crypto";

const smsConfirmSchema = z.object({
  amount: z.number().int().positive(),
  senderPhone: z.string().min(10).max(15),
  reference: z.string().min(1),
  provider: z.string().min(1),
  rawSms: z.string().min(1),
  timestamp: z.number().int().positive(),
});

const ALLOWED_IPS = (process.env.SMS_ALLOWED_IPS ?? "72.62.237.25,127.0.0.1").split(",").map((ip) => ip.trim());
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  try {
    // IP allowlist check
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";

    if (!ALLOWED_IPS.includes(clientIp)) {
      console.warn(`[sms-confirm] Rejected IP: ${clientIp}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify HMAC signature
    const signature = request.headers.get("X-SMS-Signature");
    const rawBody = await request.text();
    const secret = process.env.SMS_WEBHOOK_SECRET;

    if (!secret || !signature || !verifyHmac(rawBody, signature, secret)) {
      console.warn("[sms-confirm] Invalid HMAC signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const parsed = smsConfirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { amount, reference, provider, rawSms, timestamp } = parsed.data;

    // Reject stale requests (replay protection)
    const age = Date.now() - timestamp;
    if (age > MAX_AGE_MS || age < -MAX_AGE_MS) {
      console.warn(`[sms-confirm] Stale request: age=${age}ms, ref=${reference}`);
      return NextResponse.json({ error: "Request expired" }, { status: 400 });
    }

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
      .select("id, amount_xof, status, parent_id, teacher_id, payment_reference")
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

    // Fire notification asynchronously — don't block the response
    if (transaction.parent_id) {
      sendNotification({
        event: 'payment_confirmed',
        userId: transaction.parent_id,
        data: {
          amount: transaction.amount_xof,
          teacherName: transaction.teacher_id ?? '',
          reference,
          provider,
        },
      }).catch((err) => console.error('[notifications] payment_confirmed error:', err));
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
