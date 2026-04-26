import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEACHER_DOCUMENTS_BUCKET } from "@/lib/storage/teacher-documents";

/**
 * POST /api/teacher/upload-document
 *
 * Server-side replacement for the previous client-direct Supabase Storage
 * upload that landed CNIs and diplomas in a public bucket. The bucket is
 * now private (00030_security_hardening.sql); this route is the only
 * authenticated path that writes to it. Admins read via signed URLs
 * (signTeacherDocPath helper).
 *
 * multipart/form-data fields:
 *   - file: the actual upload
 *   - docType: "cni" | "diploma" | "video"
 *
 * The DB column on teacher_profiles is updated with the storage PATH,
 * not a URL — old rows that still hold full URLs are treated as
 * needs-re-upload by the signing helper.
 */

const MAX_BYTES_BY_TYPE: Record<string, number> = {
  cni: 8 * 1024 * 1024, // 8 MB
  diploma: 8 * 1024 * 1024, // 8 MB
  video: 80 * 1024 * 1024, // 80 MB
};

const ALLOWED_EXTENSIONS_BY_TYPE: Record<string, string[]> = {
  cni: ["jpg", "jpeg", "png", "webp", "pdf"],
  diploma: ["jpg", "jpeg", "png", "webp", "pdf"],
  video: ["mp4", "mov", "webm", "m4v"],
};

const COLUMN_BY_TYPE: Record<string, string> = {
  cni: "id_document_url",
  diploma: "diploma_url",
  video: "video_intro_url",
};

export async function POST(request: NextRequest) {
  try {
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
      .maybeSingle();
    if (!profile || profile.role !== "teacher") {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const docType = String(form.get("docType") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }
    if (!ALLOWED_EXTENSIONS_BY_TYPE[docType]) {
      return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXTENSIONS_BY_TYPE[docType].includes(ext)) {
      return NextResponse.json(
        { error: `Extension non autorisee. Acceptees: ${ALLOWED_EXTENSIONS_BY_TYPE[docType].join(", ")}` },
        { status: 400 }
      );
    }
    const maxBytes = MAX_BYTES_BY_TYPE[docType];
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${Math.round(maxBytes / 1024 / 1024)} Mo)` },
        { status: 413 }
      );
    }

    // Path is `<userId>/<docType>.<ext>`. Putting the user UUID first lets
    // a future "list my own files" RLS policy use storage.foldername()[1].
    // Today the bucket is private and writes go through service role only.
    const path = `${user.id}/${docType}.${ext}`;

    const admin = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(TEACHER_DOCUMENTS_BUCKET)
      .upload(path, buffer, {
        contentType: file.type || undefined,
        upsert: true,
      });
    if (uploadError) {
      console.error("[upload-document] storage upload failed:", uploadError.message);
      return NextResponse.json({ error: "Echec du telechargement" }, { status: 500 });
    }

    const column = COLUMN_BY_TYPE[docType];
    const { error: updateError } = await admin
      .from("teacher_profiles")
      .update({ [column]: path })
      .eq("user_id", user.id);
    if (updateError) {
      console.error("[upload-document] db update failed:", updateError.message);
      return NextResponse.json({ error: "Echec de la mise a jour" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, path });
  } catch (err) {
    console.error("[upload-document] threw:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
