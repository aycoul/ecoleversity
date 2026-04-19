import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { logAdminAction } from "@/lib/admin/audit";

const actionSchema = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["dismiss", "action_taken"]),
  adminNotes: z.string().max(2000).nullable().optional(),
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
    if (!profile || profile.role !== "admin" || !canAccess(scope, "reports")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { reportId, action, adminNotes } = parsed.data;
    const adminSupabase = createAdminClient();

    const { data: before } = await adminSupabase
      .from("content_reports")
      .select("id, status, admin_notes")
      .eq("id", reportId)
      .maybeSingle();

    if (!before) {
      return NextResponse.json(
        { error: "Signalement introuvable" },
        { status: 404 }
      );
    }

    const nextStatus = action === "dismiss" ? "dismissed" : "action_taken";
    const { data: after, error: updateError } = await adminSupabase
      .from("content_reports")
      .update({
        status: nextStatus,
        admin_notes: adminNotes ?? before.admin_notes ?? null,
      })
      .eq("id", reportId)
      .select("*")
      .maybeSingle();

    if (updateError || !after) {
      console.error("[admin/reports] update failed:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    await logAdminAction({
      actorId: user.id,
      actorScope: scope,
      action: `report.${action}`,
      targetTable: "content_reports",
      targetId: reportId,
      before,
      after,
    });

    return NextResponse.json({ data: after });
  } catch (err) {
    const e = err as Error;
    console.error("[admin/reports] error:", e.name, e.message);
    return NextResponse.json(
      { error: "Erreur interne du serveur", hint: e.message },
      { status: 500 }
    );
  }
}
