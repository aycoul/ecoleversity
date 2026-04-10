import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { generateCertificateId, generateCertificatePdf } from "@/lib/certificate";

const certSchema = z.object({
  enrollmentId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = certSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Fetch enrollment with course and learner info
    const { data: enrollment } = await adminSupabase
      .from("enrollments")
      .select("id, progress_pct, completed_at, certificate_url, learner_id, course_id")
      .eq("id", parsed.data.enrollmentId)
      .single();

    if (!enrollment) {
      return NextResponse.json({ error: "Inscription non trouvée" }, { status: 404 });
    }

    // Verify parent owns the learner
    const { data: learner } = await adminSupabase
      .from("learner_profiles")
      .select("id, first_name, last_name, parent_id")
      .eq("id", enrollment.learner_id)
      .single();

    if (!learner || learner.parent_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Must be 100% complete
    if (enrollment.progress_pct < 100) {
      return NextResponse.json({ error: "Le cours n'est pas encore terminé" }, { status: 400 });
    }

    // Already has certificate
    if (enrollment.certificate_url) {
      return NextResponse.json({ data: { url: enrollment.certificate_url } });
    }

    // Fetch course + teacher info
    const { data: course } = await adminSupabase
      .from("courses")
      .select("title, teacher_id")
      .eq("id", enrollment.course_id)
      .single();

    const { data: teacher } = await adminSupabase
      .from("profiles")
      .select("display_name")
      .eq("id", course?.teacher_id)
      .single();

    const certificateId = generateCertificateId();
    const studentName = `${learner.first_name} ${learner.last_name ?? ""}`.trim();

    // Generate PDF
    const pdfBuffer = await generateCertificatePdf({
      studentName,
      courseName: course?.title ?? "Cours",
      teacherName: teacher?.display_name ?? "Enseignant",
      completionDate: enrollment.completed_at ?? new Date().toISOString(),
      certificateId,
    });

    // Upload to Supabase Storage
    const fileName = `certificates/${certificateId}.pdf`;
    const { error: uploadError } = await adminSupabase.storage
      .from("certificates")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("[certificates] Upload error:", uploadError);
      return NextResponse.json({ error: "Erreur lors du téléchargement" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = adminSupabase.storage
      .from("certificates")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Save URL to enrollment
    await adminSupabase
      .from("enrollments")
      .update({ certificate_url: publicUrl })
      .eq("id", enrollment.id);

    return NextResponse.json({ data: { url: publicUrl, certificateId } });
  } catch (err) {
    console.error("[certificates] Error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
