import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

/** GET: Fetch wallet balance + transaction history */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Get or create wallet
    let { data: wallet } = await adminSupabase
      .from("wallets")
      .select("id, balance_xof")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet } = await adminSupabase
        .from("wallets")
        .insert({ user_id: user.id, balance_xof: 0 })
        .select("id, balance_xof")
        .single();
      wallet = newWallet;
    }

    // Get wallet transactions
    const { data: transactions } = await adminSupabase
      .from("wallet_transactions")
      .select("id, type, amount_xof, description, created_at")
      .eq("wallet_id", wallet?.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      data: {
        balance: wallet?.balance_xof ?? 0,
        transactions: transactions ?? [],
      },
    });
  } catch (err) {
    console.error("[wallet] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

const debitSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().min(1),
});

/** POST: Debit from wallet (used during payment) */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = debitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { amount, description } = parsed.data;
    const adminSupabase = createAdminClient();

    // Atomic debit: update only if sufficient balance, return updated row
    const { data: updated, error: updateError } = await adminSupabase
      .rpc("debit_wallet", {
        p_user_id: user.id,
        p_amount: amount,
        p_description: description,
      });

    if (updateError) {
      console.error("[wallet] Debit RPC error:", updateError);
      // Fallback: check if insufficient balance
      const { data: wallet } = await adminSupabase
        .from("wallets")
        .select("balance_xof")
        .eq("user_id", user.id)
        .single();
      if (wallet && wallet.balance_xof < amount) {
        return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
      }
      return NextResponse.json({ error: "Erreur lors du débit" }, { status: 500 });
    }

    return NextResponse.json({
      data: { newBalance: updated ?? 0 },
    });
  } catch (err) {
    console.error("[wallet] Debit error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
