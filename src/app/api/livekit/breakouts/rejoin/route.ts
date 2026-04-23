import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateAccessToken, getRoomName } from "@/lib/video/livekit";

const schema = z.object({
  liveClassId: z.string().uuid(),
});

// Mints a fresh token for the MAIN room for the current user. Called
// when a breakout ends and clients need to rejoin the main room.
// Reuses the same permission logic as /api/livekit/token (teacher of
// the class, or parent of any enrolled learner).
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { liveClassId } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });
  }

  const { data: liveClass } = await supabase
    .from("live_classes")
    .select("teacher_id")
    .eq("id", liveClassId)
    .single();
  if (!liveClass) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  }

  // Minimum auth re-check: teacher of this class, or a parent with any
  // learner enrolled. (Mirrors /api/livekit/token.)
  const role = profile.role as "teacher" | "parent" | "admin";
  let authorized = role === "admin";
  if (!authorized && role === "teacher" && liveClass.teacher_id === user.id) {
    authorized = true;
  }
  if (!authorized && role === "parent") {
    const { data: enrolled } = await supabase
      .from("enrollments")
      .select("learner_id")
      .eq("live_class_id", liveClassId);
    const learnerIds = (enrolled ?? [])
      .map((e) => e.learner_id as string | null)
      .filter((v): v is string => !!v);
    if (learnerIds.length > 0) {
      const { count } = await supabase
        .from("learner_profiles")
        .select("id", { count: "exact", head: true })
        .in("id", learnerIds)
        .eq("parent_id", user.id);
      authorized = (count ?? 0) > 0;
    }
  }
  if (!authorized) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const token = await generateAccessToken({
    roomName: getRoomName(liveClassId),
    userId: user.id,
    displayName: profile.display_name ?? "Utilisateur",
    userEmail: user.email ?? null,
    role,
  });

  return NextResponse.json({ token, roomName: getRoomName(liveClassId) });
}
