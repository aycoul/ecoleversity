import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  generateAccessToken,
  getLiveKitUrl,
  getRoomName,
} from "@/lib/video/livekit";

const schema = z.object({
  liveClassId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 }
      );
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
      return NextResponse.json({ error: "Profil non trouvé" }, { status: 403 });
    }

    const { data: liveClass } = await supabase
      .from("live_classes")
      .select("id, teacher_id, status")
      .eq("id", liveClassId)
      .single();

    if (!liveClass) {
      return NextResponse.json({ error: "Cours non trouvé" }, { status: 404 });
    }

    const role = profile.role as "teacher" | "parent" | "admin";
    let authorized = false;

    if (role === "teacher" && liveClass.teacher_id === user.id) {
      authorized = true;
    } else if (role === "parent") {
      const { count } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("live_class_id", liveClassId)
        .eq("parent_id", user.id);
      authorized = (count ?? 0) > 0;
    } else if (role === "admin") {
      authorized = true;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const token = await generateAccessToken({
      roomName: getRoomName(liveClassId),
      userId: user.id,
      displayName: profile.display_name ?? user.email ?? "Utilisateur",
      userEmail: user.email ?? null,
      role,
    });

    return NextResponse.json({
      token,
      url: getLiveKitUrl(),
      roomName: getRoomName(liveClassId),
    });
  } catch (err) {
    console.error("LiveKit token error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
