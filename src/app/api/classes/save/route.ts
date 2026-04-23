import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const saveSchema = z.object({
  classId: z.string().uuid(),
});

/** POST /api/classes/save — bookmark a class */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = saveSchema.safeParse(body);
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

    const { error } = await supabase
      .from("saved_classes")
      .insert({ parent_id: user.id, live_class_id: parsed.data.classId });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ saved: true }); // already saved
      }
      console.error("Save class error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la sauvegarde" },
        { status: 500 }
      );
    }

    return NextResponse.json({ saved: true });
  } catch (err) {
    console.error("Save class error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}

/** DELETE /api/classes/save?classId=<uuid> — remove bookmark */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");

  if (!classId) {
    return NextResponse.json(
      { error: "classId requis" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { error } = await supabase
    .from("saved_classes")
    .delete()
    .eq("parent_id", user.id)
    .eq("live_class_id", classId);

  if (error) {
    console.error("Unsave class error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }

  return NextResponse.json({ saved: false });
}
