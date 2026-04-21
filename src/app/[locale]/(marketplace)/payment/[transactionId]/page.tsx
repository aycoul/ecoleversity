import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PaymentInstructions } from "@/components/payment/payment-instructions";
import { generatePaymentQR, orangeMoneyUri, waveUri } from "@/lib/payments/qr";
import { getOrangeMoneyNumber, getWaveNumber } from "@/lib/payments/config";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ locale: string; transactionId: string }>;
}) {
  const { transactionId } = await params;

  const supabase = await createServerSupabaseClient();

  // Verify authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch transaction with related live_class and teacher profile
  const { data: transaction } = await supabase
    .from("transactions")
    .select(`
      id,
      status,
      payment_reference,
      amount_xof,
      created_at,
      teacher_id
    `)
    .eq("id", transactionId)
    .eq("parent_id", user.id)
    .single();

  if (!transaction) {
    redirect("/dashboard/parent/overview");
  }

  // If already confirmed, redirect to dashboard
  if (transaction.status === "confirmed") {
    redirect("/dashboard/parent/overview");
  }

  // Get teacher display name
  const { data: teacherProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", transaction.teacher_id)
    .single();



  // Get the live class for schedule info — find the most recent class
  // linked to this teacher with a matching transaction amount
  const { data: liveClass } = await supabase
    .from("live_classes")
    .select("scheduled_at, duration_minutes")
    .eq("teacher_id", transaction.teacher_id)
    .eq("price_xof", transaction.amount_xof)
    .eq("status", "scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Pre-render the QR codes server-side so the parent's device doesn't
  // need to load a JS QR library just to show 256×256 PNGs.
  const orangeNumber = getOrangeMoneyNumber();
  const waveNumber = getWaveNumber();
  const orangeQR = orangeNumber
    ? await generatePaymentQR(orangeMoneyUri(orangeNumber, transaction.amount_xof))
    : null;
  const waveQR = waveNumber
    ? await generatePaymentQR(waveUri(waveNumber, transaction.amount_xof))
    : null;

  return (
    <PaymentInstructions
      transactionId={transaction.id}
      paymentReference={transaction.payment_reference}
      amountXof={transaction.amount_xof}
      teacherName={teacherProfile?.display_name ?? "—"}
      scheduledAt={liveClass?.scheduled_at ?? transaction.created_at}
      durationMinutes={liveClass?.duration_minutes ?? 30}
      createdAt={transaction.created_at}
      orangeQR={orangeQR}
      waveQR={waveQR}
      orangeNumber={orangeNumber}
      waveNumber={waveNumber}
    />
  );
}
