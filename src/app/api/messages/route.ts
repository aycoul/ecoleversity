import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { detectPII, blockReasonMessage } from "@/lib/moderation/pii-detector";
import { sendNotification } from "@/lib/notifications/service";

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  // No attachments per spec — no image uploads in DMs.
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50", 10),
      100
    );

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId requis" },
        { status: 400 }
      );
    }

    // Verify user is a participant (RLS would also enforce this, but we
    // want a clean 404 not an empty result)
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .maybeSingle();

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation non trouvée" },
        { status: 404 }
      );
    }

    let query = supabase
      .from("messages")
      .select(
        "id, sender_id, content, moderation_status, blocked_reason, attachments, read_at, created_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark unread messages as read
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);

    return NextResponse.json({
      messages: messages ?? [],
      nextCursor:
        messages && messages.length === limit
          ? messages[messages.length - 1].created_at
          : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { conversationId, content } = parsed.data;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Verify user is a participant
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, participant_1, participant_2")
      .eq("id", conversationId)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .maybeSingle();

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation non trouvée" },
        { status: 404 }
      );
    }

    // Run PII detection — hard-block on any violation per spec
    const detection = detectPII(content);

    if (!detection.allowed && detection.blockReason) {
      // Log the attempt for admin review
      await supabase.from("message_moderation_log").insert({
        sender_id: user.id,
        conversation_id: conversationId,
        attempted_body: content,
        block_reason: detection.blockReason,
        matched_pattern: detection.matchedPattern ?? null,
      });

      return NextResponse.json(
        {
          error: "pii_blocked",
          reason: detection.blockReason,
          message: blockReasonMessage(detection.blockReason),
        },
        { status: 422 }
      );
    }

    // Insert the clean message
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        moderation_status: "clean",
      })
      .select(
        "id, sender_id, content, moderation_status, attachments, created_at"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Bump conversation updated_at for inbox sorting
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Notify the recipient (other participant) asynchronously
    const recipientId =
      conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    sendNotification({
      event: "new_message",
      userId: recipientId,
      data: {
        senderName: senderProfile?.display_name ?? "Quelqu'un",
        preview: content.slice(0, 100),
        conversationId,
      },
    }).catch((err) =>
      console.error("[notifications] new_message error:", err)
    );

    return NextResponse.json({ message });
  } catch (err) {
    console.error("[messages POST] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
