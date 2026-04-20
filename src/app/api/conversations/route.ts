import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const createConversationSchema = z.object({
  participantId: z.string().uuid(),
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

    // Kid mode passes ?learnerId=... so we only return conversations
    // tagged with that learner. Parent mode omits it and sees every
    // conversation they're a participant in.
    const learnerId = new URL(request.url).searchParams.get("learnerId");

    let query = supabase
      .from("conversations")
      .select(
        `
        id,
        participant_1,
        participant_2,
        learner_id,
        updated_at,
        p1:profiles!conversations_participant_1_fkey(id, display_name, avatar_url, role),
        p2:profiles!conversations_participant_2_fkey(id, display_name, avatar_url, role)
      `
      )
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (learnerId) {
      query = query.eq("learner_id", learnerId);
    }

    const { data: conversations, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const convIds = (conversations ?? []).map((c) => c.id);

    // Batch: get last message per conversation (1 query instead of N)
    const { data: allMessages } = convIds.length > 0
      ? await supabase
          .from("messages")
          .select("conversation_id, content, content_flagged, created_at, sender_id")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    // Build last-message map (first message per conversation_id due to DESC order)
    type MessageRow = { conversation_id: string; content: string; content_flagged: boolean; created_at: string; sender_id: string };
    const lastMessageMap = new Map<string, MessageRow>();
    for (const msg of allMessages ?? []) {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg);
      }
    }

    // Batch: count unread per conversation (1 query instead of N)
    const { data: unreadMessages } = convIds.length > 0
      ? await supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .is("read_at", null)
      : { data: [] };

    const unreadMap = new Map<string, number>();
    for (const msg of unreadMessages ?? []) {
      unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) ?? 0) + 1);
    }

    // Enrich conversations without additional queries
    const enriched = (conversations ?? []).map((conv) => {
      const other = conv.participant_1 === user.id ? conv.p2 : conv.p1;
      const lastMsg = lastMessageMap.get(conv.id);

      return {
        id: conv.id,
        other,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content_flagged
                ? "[contenu bloqué]"
                : lastMsg.content,
              createdAt: lastMsg.created_at,
              senderId: lastMsg.sender_id,
            }
          : null,
        unreadCount: unreadMap.get(conv.id) ?? 0,
        updatedAt: conv.updated_at,
      };
    });

    return NextResponse.json(enriched);
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
    const parsed = createConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { participantId } = parsed.data;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (user.id === participantId) {
      return NextResponse.json(
        { error: "Impossible de créer une conversation avec soi-même" },
        { status: 400 }
      );
    }

    // Fetch roles for both users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, role")
      .in("id", [user.id, participantId]);

    if (!profiles || profiles.length !== 2) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const currentRole = profiles.find((p) => p.id === user.id)?.role;
    const otherRole = profiles.find((p) => p.id === participantId)?.role;

    // INVARIANT: one must be teacher, other must be parent
    const roles = new Set([currentRole, otherRole]);
    if (!roles.has("teacher") || !roles.has("parent")) {
      return NextResponse.json(
        {
          error:
            "Les conversations ne sont autorisées qu'entre enseignants et parents",
        },
        { status: 403 }
      );
    }

    // Check if conversation already exists (either direction)
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${participantId}),and(participant_1.eq.${participantId},participant_2.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ id: existing.id, existing: true });
    }

    // Create new conversation
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        participant_1: user.id,
        participant_2: participantId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: conv.id, existing: false }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
