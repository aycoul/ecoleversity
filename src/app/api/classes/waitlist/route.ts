import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const waitlistSchema = z.object({
  classId: z.string().uuid(),
  learnerId: z.string().uuid(),
});

/** POST — join waitlist */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides" },
        { status: 400 }
      );
    }

    const { classId, learnerId } = parsed.data;
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    // Verify learner belongs to parent
    const { data: learner } = await supabase
      .from("learner_profiles")
      .select("id")
      .eq("id", learnerId)
      .eq("parent_id", user.id)
      .single();

    if (!learner) {
      return NextResponse.json(
        { error: "Eleve non autorise" },
        { status: 403 }
      );
    }

    // Get current max position
    const { data: maxPos } = await supabase
      .from("waitlists")
      .select("position")
      .eq("live_class_id", classId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (maxPos?.position ?? 0) + 1;

    const { error: insertError } = await supabase.from("waitlists").insert({
      live_class_id: classId,
      parent_id: user.id,
      learner_id: learnerId,
      position: nextPosition,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Deja sur la liste d'attente" },
          { status: 409 }
        );
      }
      console.error("Error joining waitlist:", insertError);
      return NextResponse.json(
        { error: "Erreur lors de l'ajout" },
        { status: 500 }
      );
    }

    return NextResponse.json({ position: nextPosition });
  } catch (err) {
    console.error("Waitlist join error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/** GET — check waitlist position */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const learnerId = searchParams.get("learnerId");

    if (!classId || !learnerId) {
      return NextResponse.json(
        { error: "classId and learnerId required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    // Check if on waitlist
    const { data: waitlistEntry } = await supabase
      .from("waitlists")
      .select("position, notified")
      .eq("live_class_id", classId)
      .eq("learner_id", learnerId)
      .eq("parent_id", user.id)
      .maybeSingle();

    if (!waitlistEntry) {
      return NextResponse.json({ onWaitlist: false });
    }

    // Check if a spot opened (enrollment count < max_students)
    const { data: liveClass } = await supabase
      .from("live_classes")
      .select("max_students")
      .eq("id", classId)
      .single();

    const { count: enrollmentCount } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("live_class_id", classId);

    const spotAvailable =
      liveClass && (enrollmentCount ?? 0) < liveClass.max_students;

    return NextResponse.json({
      onWaitlist: true,
      position: waitlistEntry.position,
      notified: waitlistEntry.notified,
      spotAvailable: spotAvailable && waitlistEntry.position === 1,
    });
  } catch (err) {
    console.error("Waitlist check error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
