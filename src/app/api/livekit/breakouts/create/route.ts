import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomServiceClient } from "livekit-server-sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateAccessToken, getRoomName } from "@/lib/video/livekit";

const schema = z.object({
  liveClassId: z.string().uuid(),
  groupSize: z.number().int().min(2).max(5),
});

// Teacher-only. Splits non-teacher participants in the main room into
// groups of ~groupSize, generates a LiveKit token per participant for
// their assigned breakout room (same room-name scheme: session-{id}-bo-{n}),
// and returns a map the client will broadcast.
//
// The teacher themselves get a token into group 0 by default — they can
// hop between groups by re-joining with a different token later (v2).
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { liveClassId, groupSize } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: liveClass } = await supabase
    .from("live_classes")
    .select("teacher_id")
    .eq("id", liveClassId)
    .single();
  if (!liveClass || liveClass.teacher_id !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const host = process.env.LIVEKIT_URL?.replace(/^wss?:\/\//, "https://");
  if (!apiKey || !apiSecret || !host) {
    return NextResponse.json({ error: "LiveKit non configuré" }, { status: 500 });
  }

  const client = new RoomServiceClient(host, apiKey, apiSecret);
  const mainRoom = getRoomName(liveClassId);
  const participants = await client.listParticipants(mainRoom);

  // Separate teacher from students and distribute students round-robin.
  const students = participants
    .filter((p) => p.identity !== liveClass.teacher_id)
    .map((p) => ({ identity: p.identity, name: p.name || p.identity }));

  if (students.length < 2) {
    return NextResponse.json(
      { error: "Au moins 2 élèves sont requis pour créer des salles" },
      { status: 400 }
    );
  }

  const groupCount = Math.max(1, Math.ceil(students.length / groupSize));
  const groups: { name: string; members: typeof students }[] = Array.from(
    { length: groupCount },
    (_, i) => ({ name: `${mainRoom}-bo-${i + 1}`, members: [] })
  );
  students.forEach((s, idx) => {
    groups[idx % groupCount].members.push(s);
  });

  // Mint tokens. Teacher gets a token for every breakout so they can pop
  // into whichever they want; each student gets one for their group.
  const assignments: Record<
    string,
    { room: string; token: string; groupIdx: number; members: string[] }
  > = {};
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    for (const m of g.members) {
      assignments[m.identity] = {
        room: g.name,
        token: await generateAccessToken({
          roomName: g.name,
          userId: m.identity,
          displayName: m.name,
          userEmail: null,
          role: "parent",
        }),
        groupIdx: i,
        members: g.members.map((x) => x.name),
      };
    }
  }
  // Teacher assignment → group 0
  assignments[liveClass.teacher_id as string] = {
    room: groups[0].name,
    token: await generateAccessToken({
      roomName: groups[0].name,
      userId: liveClass.teacher_id as string,
      displayName: "Enseignant",
      userEmail: null,
      role: "teacher",
    }),
    groupIdx: 0,
    members: groups[0].members.map((x) => x.name),
  };

  return NextResponse.json({
    ok: true,
    groups: groups.map((g, i) => ({
      idx: i,
      name: g.name,
      members: g.members.map((m) => m.name),
    })),
    assignments,
  });
}
