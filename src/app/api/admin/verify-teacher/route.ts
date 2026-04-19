import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { sendNotification } from "@/lib/notifications/service";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { logAdminAction } from "@/lib/admin/audit";

const bodySchema = z.object({
  teacherId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
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
    if (
      !profile ||
      profile.role !== "admin" ||
      !canAccess(scope, "verification")
    ) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { teacherId, action, reason } = parsed.data;
    const admin = createAdminClient();

    const { data: before } = await admin
      .from("teacher_profiles")
      .select("id, verification_status, rejection_reason")
      .eq("id", teacherId)
      .maybeSingle();

    if (!before) {
      return NextResponse.json(
        { error: "Enseignant introuvable" },
        { status: 404 }
      );
    }

    const newStatus = action === "approve" ? "fully_verified" : "rejected";
    const update: Record<string, unknown> = {
      verification_status: newStatus,
    };
    if (action === "reject" && reason) {
      update.rejection_reason = reason;
    }

    const { data: after, error: updateError } = await admin
      .from("teacher_profiles")
      .update(update)
      .eq("id", teacherId)
      .select("id, verification_status, rejection_reason")
      .maybeSingle();

    if (updateError || !after) {
      console.error("[verify-teacher] update failed:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    // Audit
    await logAdminAction({
      actorId: user.id,
      actorScope: scope,
      action: `teacher.${action}`,
      targetTable: "teacher_profiles",
      targetId: teacherId,
      before,
      after,
      notes: reason ?? null,
    });

    // Notify the teacher — teacher_profiles.id === profiles.id === auth user id
    const event = action === "approve" ? "teacher_verified" : "teacher_rejected";
    sendNotification({
      event,
      userId: teacherId,
      data: reason ? { reason } : {},
    }).catch((err) => console.error(`[notifications] ${event} error:`, err));

    return NextResponse.json({ data: { status: newStatus } });
  } catch (err) {
    const e = err as Error;
    console.error("[verify-teacher] error:", e.name, e.message);
    return NextResponse.json(
      { error: "Erreur interne du serveur", hint: e.message },
      { status: 500 }
    );
  }
}
