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
  // When the session was joined from /k/[learner_id]/* the client
  // includes the learner ID. We swap the participant display name to
  // the kid's first name and tag the token metadata so the teacher
  // sees "Awa" in the video tile + chat instead of "Test Parent".
  learnerId: z.string().uuid().optional(),
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
    const { liveClassId, learnerId } = parsed.data;

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
      // enrollments hangs off learner_id, not parent_id. Authorize if any
      // of this parent's learners is enrolled in this live_class.
      const { data: enrolledRows } = await supabase
        .from("enrollments")
        .select("learner_id")
        .eq("live_class_id", liveClassId);
      const learnerIds = (enrolledRows ?? [])
        .map((e) => e.learner_id as string | null)
        .filter((lid): lid is string => !!lid);
      if (learnerIds.length > 0) {
        const { count } = await supabase
          .from("learner_profiles")
          .select("id", { count: "exact", head: true })
          .in("id", learnerIds)
          .eq("parent_id", user.id);
        authorized = (count ?? 0) > 0;
      }
    } else if (role === "admin") {
      authorized = true;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // If joining from kid mode, substitute the learner's first name so
    // teachers see "Awa" on the video tile + chat. We still ship the
    // parent UUID as the LiveKit identity (one auth per family), but
    // the display layer swaps. Validate the learner belongs to this
    // parent so a malicious client can't impersonate another family's
    // kid.
    let displayName = profile.display_name ?? user.email ?? "Utilisateur";
    let actingLearner: { id: string; first_name: string } | null = null;
    if (learnerId && role === "parent") {
      const { data: learner } = await supabase
        .from("learner_profiles")
        .select("id, first_name")
        .eq("id", learnerId)
        .eq("parent_id", user.id)
        .maybeSingle();
      if (learner) {
        actingLearner = {
          id: learner.id as string,
          first_name: learner.first_name as string,
        };
        displayName = actingLearner.first_name;
      }
    }

    const token = await generateAccessToken({
      roomName: getRoomName(liveClassId),
      userId: user.id,
      displayName,
      userEmail: user.email ?? null,
      role,
      actingAsLearnerId: actingLearner?.id ?? null,
      actingAsLearnerName: actingLearner?.first_name ?? null,
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
