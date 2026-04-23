import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateJitsiRoomId } from "@/lib/booking";

const createClassSchema = z.object({
  format: z.enum(["group", "one_on_one"]).default("group"),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  subject: z.string().min(1),
  gradeLevel: z.string().min(1),
  maxStudents: z.number().int().min(1).max(15),
  priceXof: z.number().int().min(0),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().refine((v) => [30, 60, 90].includes(v), {
    message: "Duration must be 30, 60, or 90 minutes",
  }),
  recurrence: z.enum(["one_time", "weekly"]),
  // How many weekly sessions to generate when recurrence=weekly.
  // Ignored for one_time. Capped at 52 to prevent runaway series.
  sessionsCount: z.number().int().min(1).max(52).default(4),
  isTrial: z.boolean().default(false),
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
      format,
      title,
      description,
      subject,
      gradeLevel,
      maxStudents,
      priceXof,
      scheduledAt,
      durationMinutes,
      recurrence,
      sessionsCount,
      isTrial,
    } = parsed.data;

    // Trial session rules
    if (isTrial) {
      if (format !== "one_on_one") {
        return NextResponse.json(
          { error: "Les sessions d'essai sont uniquement en 1-to-1" },
          { status: 400 }
        );
      }
      if (recurrence !== "one_time") {
        return NextResponse.json(
          { error: "Les sessions d'essai sont uniquement ponctuelles" },
          { status: 400 }
        );
      }
      if (durationMinutes !== 30) {
        return NextResponse.json(
          { error: "Les sessions d'essai durent exactement 30 minutes" },
          { status: 400 }
        );
      }
    }

    // Enforce invariant: 1-to-1 format = exactly 1 student slot
    const effectiveMaxStudents = format === "one_on_one" ? 1 : maxStudents;
    const effectivePrice = isTrial ? 0 : priceXof;

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

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

    // Build the classes to insert. For weekly: N sessions spaced 7 days apart.
    // For one_time: exactly 1 session.
    const totalSessions = recurrence === "weekly" ? sessionsCount : 1;
    const baseDate = new Date(scheduledAt);

    const classRecords = Array.from({ length: totalSessions }, (_, i) => {
      const sessionDate = new Date(baseDate);
      sessionDate.setDate(sessionDate.getDate() + i * 7);

      return {
        teacher_id: user.id,
        title,
        description: description ?? null,
        subject,
        grade_level: gradeLevel,
        format,
        max_students: effectiveMaxStudents,
        price_xof: effectivePrice,
        is_trial: isTrial,
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
      console.error("Error creating class:", insertError);
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
