import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateJitsiRoomId } from "@/lib/booking";

const createClassSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  subject: z.string().min(1),
  gradeLevel: z.string().min(1),
  maxStudents: z.number().int().min(2).max(15),
  priceXof: z.number().int().min(500),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().refine((v) => [30, 60, 90].includes(v), {
    message: "Duration must be 30, 60, or 90 minutes",
  }),
  recurrence: z.enum(["one_time", "weekly"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createClassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      subject,
      gradeLevel,
      maxStudents,
      priceXof,
      scheduledAt,
      durationMinutes,
      recurrence,
    } = parsed.data;

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    // Verify user is a teacher
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Seuls les enseignants peuvent creer des cours" },
        { status: 403 }
      );
    }

    // Build the classes to insert (1 for one_time, 4 for weekly)
    const sessionsCount = recurrence === "weekly" ? 4 : 1;
    const baseDate = new Date(scheduledAt);

    const classRecords = Array.from({ length: sessionsCount }, (_, i) => {
      const sessionDate = new Date(baseDate);
      sessionDate.setDate(sessionDate.getDate() + i * 7);

      return {
        teacher_id: user.id,
        title,
        description: description ?? null,
        subject,
        grade_level: gradeLevel,
        format: "group" as const,
        max_students: maxStudents,
        price_xof: priceXof,
        scheduled_at: sessionDate.toISOString(),
        duration_minutes: durationMinutes,
        recurrence,
        jitsi_room_id: generateJitsiRoomId(),
        status: "scheduled" as const,
      };
    });

    const { data: classes, error: insertError } = await supabase
      .from("live_classes")
      .insert(classRecords)
      .select("id, scheduled_at");

    if (insertError || !classes) {
      console.error("Error creating group class:", insertError);
      return NextResponse.json(
        { error: "Erreur lors de la creation du cours" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      classes,
      count: classes.length,
    });
  } catch (err) {
    console.error("Class creation error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
