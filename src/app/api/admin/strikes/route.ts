import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { canAccess, type AdminScope } from "@/lib/admin/scopes";
import { logAdminAction } from "@/lib/admin/audit";

const strikeLevels = ["warning", "strike_1", "strike_2", "strike_3"] as const;

const createSchema = z.object({
  teacherId: z.string().uuid(),
  level: z.enum(strikeLevels),
  reason: z.string().min(1).max(1000),
  reportId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

const patchSchema = z.object({
  strikeId: z.string().uuid(),
  action: z.enum(["revoke", "mark_appealed", "mark_expired"]),
  note: z.string().max(1000).optional(),
});

/** Default strike durations by level. strike_3 is permanent (null). */
function defaultExpiresAt(level: (typeof strikeLevels)[number]): string | null {
  const days = {
    warning: 30,
    strike_1: 90,
    strike_2: 180,
    strike_3: null,
  }[level];
  if (days === null) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function assertAdminScope(
  user: { id: string },
): Promise<{ scope: AdminScope } | NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, admin_scope")
    .eq("id", user.id)
    .single();
  const scope = (profile?.admin_scope as AdminScope | null) ?? null;
  if (!profile || profile.role !== "admin" || !canAccess(scope, "strikes")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  return { scope: scope! };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const gate = await assertAdminScope(user);
    if (gate instanceof NextResponse) return gate;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { teacherId, level, reason, reportId, expiresAt } = parsed.data;
    const adminSupabase = createAdminClient();

    const evidence = reportId ? { report_id: reportId } : {};

    const { data: strike, error: insertError } = await adminSupabase
      .from("teacher_strikes")
      .insert({
        teacher_id: teacherId,
        strike_level: level,
        reason,
        evidence,
        issued_by: user.id,
        expires_at: expiresAt === undefined ? defaultExpiresAt(level) : expiresAt,
      })
      .select("*")
      .single();

    if (insertError || !strike) {
      console.error("[admin/strikes] insert failed:", insertError);
      return NextResponse.json(
        { error: "Erreur lors de la création de la sanction" },
        { status: 500 }
      );
    }

    // strike_3 → ban the teacher from the catalog
    let teacherBefore: { verification_status: string } | null = null;
    let teacherAfter: { verification_status: string } | null = null;
    if (level === "strike_3") {
      const { data: before } = await adminSupabase
        .from("teacher_profiles")
        .select("verification_status")
        .eq("id", teacherId)
        .maybeSingle();
      teacherBefore = before as typeof teacherBefore;

      const { data: after } = await adminSupabase
        .from("teacher_profiles")
        .update({ verification_status: "banned" })
        .eq("id", teacherId)
        .select("verification_status")
        .maybeSingle();
      teacherAfter = after as typeof teacherAfter;
    }

    // If reportId provided — mark the source report as action_taken
    if (reportId) {
      await adminSupabase
        .from("content_reports")
        .update({ status: "action_taken" })
        .eq("id", reportId);
    }

    await logAdminAction({
      actorId: user.id,
      actorScope: gate.scope,
      action: "strike.create",
      targetTable: "teacher_strikes",
      targetId: strike.id as string,
      before: null,
      after: strike,
      notes: level === "strike_3" ? "Teacher banned from catalog" : null,
    });
    if (level === "strike_3" && teacherBefore && teacherAfter) {
      await logAdminAction({
        actorId: user.id,
        actorScope: gate.scope,
        action: "teacher.ban",
        targetTable: "teacher_profiles",
        targetId: teacherId,
        before: teacherBefore,
        after: teacherAfter,
        notes: `Via strike ${strike.id}`,
      });
    }

    return NextResponse.json({ data: strike });
  } catch (err) {
    const e = err as Error;
    console.error("[admin/strikes POST]:", e.name, e.message);
    return NextResponse.json(
      { error: "Erreur interne du serveur", hint: e.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const gate = await assertAdminScope(user);
    if (gate instanceof NextResponse) return gate;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { strikeId, action, note } = parsed.data;
    const adminSupabase = createAdminClient();

    const { data: before } = await adminSupabase
      .from("teacher_strikes")
      .select("*")
      .eq("id", strikeId)
      .maybeSingle();

    if (!before) {
      return NextResponse.json(
        { error: "Sanction introuvable" },
        { status: 404 }
      );
    }

    const nextStatus =
      action === "revoke"
        ? "revoked"
        : action === "mark_appealed"
          ? "appealed"
          : "expired";

    const { data: after, error: updateError } = await adminSupabase
      .from("teacher_strikes")
      .update({ status: nextStatus })
      .eq("id", strikeId)
      .select("*")
      .maybeSingle();

    if (updateError || !after) {
      console.error("[admin/strikes] patch failed:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    await logAdminAction({
      actorId: user.id,
      actorScope: gate.scope,
      action: `strike.${action}`,
      targetTable: "teacher_strikes",
      targetId: strikeId,
      before,
      after,
      notes: note ?? null,
    });

    return NextResponse.json({ data: after });
  } catch (err) {
    const e = err as Error;
    console.error("[admin/strikes PATCH]:", e.name, e.message);
    return NextResponse.json(
      { error: "Erreur interne du serveur", hint: e.message },
      { status: 500 }
    );
  }
}
