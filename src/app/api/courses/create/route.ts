import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const createCourseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  subject: z.string().min(1),
  gradeLevel: z.string().min(1),
  examType: z.string().optional(),
  language: z.string().default("fr"),
  priceXof: z.number().int().min(0),
  status: z.enum(["draft", "published"]).default("draft"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { title, description, subject, gradeLevel, examType, language, priceXof, status } =
      parsed.data;

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

    // If publishing, we cannot validate lessons here (course is new, no lessons yet)
    // So force draft on creation — publish is done via PUT
    const { data: course, error: insertError } = await supabase
      .from("courses")
      .insert({
        teacher_id: user.id,
        title,
        description: description ?? null,
        subject,
        grade_level: gradeLevel,
        exam_type: examType || null,
        language,
        price_xof: priceXof,
        status: status === "published" ? "draft" : "draft", // Always draft on create
      })
      .select("id, title, status")
      .single();

    if (insertError || !course) {
      console.error("Error creating course:", insertError);
      return NextResponse.json(
        { error: "Erreur lors de la creation du cours" },
        { status: 500 }
      );
    }

    return NextResponse.json({ course });
  } catch (err) {
    console.error("Course creation error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
