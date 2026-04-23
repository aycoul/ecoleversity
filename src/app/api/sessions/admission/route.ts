import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const admitSchema = z.object({
  liveClassId: z.string().uuid(),
  userId: z.string().uuid().optional(), // if omitted, admit self
});

/** POST /api/sessions/admission — admit a learner (or self) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = admitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch class to verify teacher
    const { data: liveClass } = await admin
      .from("live_classes")
      .select("teacher_id")
      .eq("id", parsed.data.liveClassId)
      .single();

    if (!liveClass) {
      return NextResponse.json(
        { error: "Cours introuvable" },
        { status: 404 }
      );
    }

    const isTeacher = liveClass.teacher_id === user.id;
    const targetUserId = parsed.data.userId ?? user.id;

    // Only teachers can admit others; anyone can admit themselves
    if (targetUserId !== user.id && !isTeacher) {
      return NextResponse.json(
        { error: "Non autorise" },
        { status: 403 }
      );
    }

    // Upsert admission
    const { data, error } = await admin
      .from("session_admissions")
      .upsert(
        {
          live_class_id: parsed.data.liveClassId,
          user_id: targetUserId,
          admitted_at: new Date().toISOString(),
        },
        { onConflict: "live_class_id, user_id" }
      )
      .select("admitted_at")
      .single();

    if (error) {
      console.error("Admission error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'admission" },
        { status: 500 }
      );
    }

    return NextResponse.json({ admittedAt: data.admitted_at });
  } catch (err) {
    console.error("Admission error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}

/** GET /api/sessions/admission?liveClassId=<uuid> — list admissions */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const liveClassId = searchParams.get("liveClassId");

  if (!liveClassId) {
    return NextResponse.json(
      { error: "liveClassId requis" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: admissions } = await admin
    .from("session_admissions")
    .select("user_id, admitted_at, profiles!inner(display_name)")
    .eq("live_class_id", liveClassId);

  return NextResponse.json({ admissions: admissions ?? [] });
}
