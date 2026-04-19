import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { logAdminAction } from "@/lib/admin/audit";

const patchSchema = z.object({
  ticketId: z.string().uuid(),
  action: z.enum(["resolve", "start_progress", "reply", "close"]),
  reply: z.string().max(4000).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, admin_scope, display_name")
      .eq("id", user.id)
      .single();

    const scope = (profile?.admin_scope as AdminScope | null) ?? null;
    if (!profile || profile.role !== "admin" || !canAccess(scope, "tickets")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { ticketId, action, reply } = parsed.data;
    const adminSupabase = createAdminClient();

    const { data: before } = await adminSupabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .maybeSingle();

    if (!before) {
      return NextResponse.json(
        { error: "Ticket introuvable" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    let update: Record<string, unknown> = {};
    const conversation = Array.isArray(before.conversation)
      ? [...(before.conversation as unknown[])]
      : [];

    switch (action) {
      case "start_progress":
        update = { status: "in_progress" };
        break;
      case "resolve":
        update = { status: "resolved", resolved_at: now };
        break;
      case "close":
        update = { status: "closed" };
        break;
      case "reply": {
        if (!reply || reply.trim().length === 0) {
          return NextResponse.json(
            { error: "Réponse vide" },
            { status: 400 }
          );
        }
        conversation.push({
          role: "admin",
          content: reply.trim(),
          timestamp: now,
          admin_name: profile.display_name ?? null,
        });
        update = {
          conversation,
          status:
            before.status === "open" ? "in_progress" : before.status,
        };
        break;
      }
    }

    const { data: after, error: updateError } = await adminSupabase
      .from("support_tickets")
      .update(update)
      .eq("id", ticketId)
      .select("*")
      .maybeSingle();

    if (updateError || !after) {
      console.error("[admin/tickets] patch failed:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    await logAdminAction({
      actorId: user.id,
      actorScope: scope,
      action: `ticket.${action}`,
      targetTable: "support_tickets",
      targetId: ticketId,
      before,
      after,
      notes: action === "reply" ? reply?.slice(0, 500) ?? null : null,
    });

    return NextResponse.json({ data: after });
  } catch (err) {
    const e = err as Error;
    console.error("[admin/tickets PATCH]:", e.name, e.message);
    return NextResponse.json(
      { error: "Erreur interne du serveur", hint: e.message },
      { status: 500 }
    );
  }
}
