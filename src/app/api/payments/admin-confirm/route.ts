import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications/service";

const adminConfirmSchema = z.object({
  transactionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      (profile.role !== "admin" && profile.role !== "school_admin")
    ) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = adminConfirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { transactionId } = parsed.data;

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    const { data: transaction, error: txError } = await adminSupabase
      .from("transactions")
      .select("id, status, parent_id, amount_xof, teacher_id")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      return NextResponse.json(
        { error: "Transaction non trouvée" },
        { status: 404 }
      );
    }

    if (transaction.status === "confirmed") {
      return NextResponse.json({
        data: { transactionId: transaction.id, status: "already_confirmed" },
      });
    }

    const { error: updateError } = await adminSupabase
      .from("transactions")
      .update({
        status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (updateError) {
      console.error("Error confirming transaction:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la confirmation" },
        { status: 500 }
      );
    }

    // Fire notification asynchronously
    if (transaction.parent_id) {
      sendNotification({
        event: 'payment_confirmed',
        userId: transaction.parent_id,
        data: {
          amount: transaction.amount_xof ?? 0,
          teacherName: transaction.teacher_id ?? '',
        },
      }).catch((err) => console.error('[notifications] payment_confirmed error:', err));
    }

    return NextResponse.json({
      data: { transactionId, status: "confirmed" },
    });
  } catch (err) {
    console.error("Admin confirm error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
