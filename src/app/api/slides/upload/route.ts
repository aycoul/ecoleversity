import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Accepts multipart/form-data with "file" (PDF) and "liveClassId".
// Only the class's teacher can upload. Files go to the public "slides"
// bucket at slides/{liveClassId}/{timestamp}.pdf — the public URL is
// returned to the client to then broadcast via LiveKit data channel.

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — generous for a slide deck

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const liveClassId = z.string().uuid().safeParse(form.get("liveClassId"));
  const file = form.get("file");

  if (!liveClassId.success) {
    return NextResponse.json({ error: "liveClassId invalide" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Seuls les PDF sont acceptés" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (25 Mo max)" },
      { status: 413 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: liveClass } = await supabase
    .from("live_classes")
    .select("teacher_id")
    .eq("id", liveClassId.data)
    .single();
  if (!liveClass || liveClass.teacher_id !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const admin = createAdminClient();
  const path = `${liveClassId.data}/${Date.now()}.pdf`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("slides")
    .upload(path, bytes, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) {
    console.error("[slides/upload]", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = admin.storage.from("slides").getPublicUrl(path);
  return NextResponse.json({ ok: true, url: publicData.publicUrl, path });
}
