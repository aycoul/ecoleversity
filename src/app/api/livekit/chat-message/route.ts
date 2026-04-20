import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectPII, blockReasonMessage } from "@/lib/moderation/pii-detector";

const schema = z.object({
  liveClassId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

/**
 * Gate every in-session chat message through PII detection, then log the
 * outcome (allowed OR blocked) to live_class_chat_messages for admin
 * review. The client only actually broadcasts via LiveKit's DataChannel
 * after this endpoint returns 200.
 *
 * Rationale: LiveKit chat is a peer-to-peer data channel by default.
 * Without this gate a teacher or parent could leak phone numbers /
 * emails / WhatsApp links and we'd have no record of the conversation.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides" },
        { status: 400 }
      );
    }
    const { liveClassId, content } = parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Role — needed both for authorization and for the audit log
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });
    }
    const role = profile.role as "parent" | "teacher" | "admin";

    const admin = createAdminClient();

    // Authorization: teacher must own the class OR parent must have a
    // learner enrolled. Admin always passes.
    const { data: liveClass } = await admin
      .from("live_classes")
      .select("id, teacher_id")
      .eq("id", liveClassId)
      .maybeSingle();
    if (!liveClass) {
      return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
    }

    let authorized = role === "admin";
    if (!authorized && role === "teacher" && liveClass.teacher_id === user.id) {
      authorized = true;
    }
    if (!authorized && role === "parent") {
      const { data: enrolled } = await admin
        .from("enrollments")
        .select("learner_id")
        .eq("live_class_id", liveClassId);
      const learnerIds = (enrolled ?? [])
        .map((e) => e.learner_id as string | null)
        .filter((v): v is string => !!v);
      if (learnerIds.length > 0) {
        const { count } = await admin
          .from("learner_profiles")
          .select("id", { count: "exact", head: true })
          .in("id", learnerIds)
          .eq("parent_id", user.id);
        if (count && count > 0) authorized = true;
      }
    }
    if (!authorized) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // PII scan — phone, email, WhatsApp link, social handle, spelled-out phone
    const moderation = detectPII(content);
    const blocked = !moderation.allowed;

    // Log (audit). Graceful degrade if the migration hasn't landed yet:
    // we still block on PII, we just skip the persistent record.
    const { error: logError } = await admin
      .from("live_class_chat_messages")
      .insert({
        live_class_id: liveClassId,
        sender_id: user.id,
        sender_role: role,
        content,
        blocked,
        block_reason: blocked ? moderation.blockReason : null,
        matched_pattern: blocked ? moderation.matchedPattern ?? null : null,
      });
    if (logError && logError.code !== "42P01") {
      // 42P01 = table doesn't exist yet (migration pending). Any other
      // error is worth surfacing for debug.
      console.warn("[chat-message] audit log failed:", logError.message);
    }

    if (blocked) {
      return NextResponse.json(
        {
          allowed: false,
          reason: moderation.blockReason,
          message: blockReasonMessage(moderation.blockReason!),
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ allowed: true });
  } catch (err) {
    const e = err as Error;
    console.error("[chat-message]", e.name, e.message);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
