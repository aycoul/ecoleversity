import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { logAdminAction } from "@/lib/admin/audit";

const patchSchema = z.object({
  agentName: z.string().min(1),
  isActive: z.boolean().optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  escalationWhatsappNumber: z
    .string()
    .regex(/^\+?\d{6,20}$/)
    .nullable()
    .optional(),
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
      .select("role, admin_scope")
      .eq("id", user.id)
      .single();

    const scope = (profile?.admin_scope as AdminScope | null) ?? null;
    if (!profile || profile.role !== "admin" || !canAccess(scope, "agents")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Only founder can mutate agent config — other admins can read-only
    // (the UI already hides controls, this is defense in depth)
    if (scope !== "founder") {
      return NextResponse.json(
        { error: "Seul le fondateur peut modifier les agents" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { agentName, isActive, confidenceThreshold, escalationWhatsappNumber } =
      parsed.data;
    const adminSupabase = createAdminClient();

    const { data: before } = await adminSupabase
      .from("agent_config")
      .select("*")
      .eq("agent_name", agentName)
      .maybeSingle();

    if (!before) {
      return NextResponse.json(
        { error: "Agent introuvable" },
        { status: 404 }
      );
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (isActive !== undefined) update.is_active = isActive;
    if (confidenceThreshold !== undefined)
      update.confidence_threshold = confidenceThreshold;
    if (escalationWhatsappNumber !== undefined)
      update.escalation_whatsapp_number = escalationWhatsappNumber;

    const { data: after, error: updateError } = await adminSupabase
      .from("agent_config")
      .update(update)
      .eq("agent_name", agentName)
      .select("*")
      .maybeSingle();

    if (updateError || !after) {
      console.error("[agents/config] update failed:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    await logAdminAction({
      actorId: user.id,
      actorScope: scope,
      action: "agent.config_update",
      targetTable: "agent_config",
      targetId: after.id as string,
      before,
      after,
    });

    return NextResponse.json({ data: after });
  } catch (err) {
    const e = err as Error;
    console.error("[agents/config PATCH]:", e.name, e.message);
    return NextResponse.json(
      { error: "Erreur interne du serveur", hint: e.message },
      { status: 500 }
    );
  }
}
