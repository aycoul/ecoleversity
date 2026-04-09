import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { detectContactInfo } from "@/lib/contact-detector";
import { sendNotification } from "@/lib/notifications/service";

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  // No attachments allowed — spec: "No image attachments in DMs" (child safety)
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

    // Verify user is participant
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
        "id, sender_id, content, content_flagged, attachments, read_at, created_at"
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

    // Verify user is participant
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

    // Run contact detection
    const detection = detectContactInfo(content);
    const finalContent = detection.isClean
      ? content
      : detection.sanitizedContent;

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: finalContent,
        content_flagged: !detection.isClean,
      })
      .select("id, sender_id, content, content_flagged, attachments, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update conversation updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Notify the recipient asynchronously
    const { data: convData } = await supabase
      .from("conversations")
      .select("participant_1, participant_2")
      .eq("id", conversationId)
      .single();

    if (convData) {
      const recipientId = convData.participant_1 === user.id
        ? convData.participant_2
        : convData.participant_1;

      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      sendNotification({
        event: 'new_message',
        userId: recipientId,
        data: {
          senderName: senderProfile?.full_name ?? 'Quelqu\'un',
          preview: finalContent.slice(0, 100),
          conversationId,
        },
      }).catch((err) => console.error('[notifications] new_message error:', err));
    }

    return NextResponse.json({
      message,
      contactDetected: !detection.isClean,
      warning: !detection.isClean
        ? "Votre message contient des informations de contact. Pour la sécurité des élèves, les échanges de coordonnées sont interdits sur la plateforme."
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
