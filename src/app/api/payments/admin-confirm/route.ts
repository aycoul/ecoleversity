import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications/service";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { logAdminAction } from "@/lib/admin/audit";

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

    // Verify admin scope — must have payments access
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, admin_scope")
      .eq("id", user.id)
      .single();

    const scope = (profile?.admin_scope as AdminScope | null) ?? null;
    if (!profile || profile.role !== "admin" || !canAccess(scope, "payments")) {
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

    const { data: after, error: updateError } = await adminSupabase
      .from("transactions")
      .update({ status: "confirmed" })
      .eq("id", transactionId)
      .select("*")
      .maybeSingle();

    if (updateError || !after) {
      console.error("Error confirming transaction:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la confirmation" },
        { status: 500 }
      );
    }

    await logAdminAction({
      actorId: user.id,
      actorScope: scope,
      action: "payment.admin_confirm",
      targetTable: "transactions",
      targetId: transactionId,
      before: transaction,
      after,
    });

    // Fire notification asynchronously
    if (transaction.parent_id) {
      const { data: teacherProfile } = await adminSupabase
        .from("profiles")
        .select("display_name")
        .eq("id", transaction.teacher_id)
        .maybeSingle();

      sendNotification({
        event: 'payment_confirmed',
        userId: transaction.parent_id,
        data: {
          amount: transaction.amount_xof ?? 0,
          teacherName: teacherProfile?.display_name ?? 'votre enseignant',
        },
      }).catch((err) => console.error('[notifications] payment_confirmed error:', err));
    }

    return NextResponse.json({
      data: { transactionId, status: "confirmed" },
    });
  } catch (err) {
    const e = err as Error;
    console.error(
      "[admin-confirm] failed:",
      e?.name,
      e?.message,
      e?.stack,
    );
    return NextResponse.json(
      { error: "Erreur interne du serveur", hint: e?.message ?? String(err) },
      { status: 500 }
    );
  }
}
