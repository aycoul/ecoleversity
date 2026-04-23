import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const patchSchema = z.object({
  active: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "school_admin") {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("featured_teachers")
      .update({ active: parsed.data.active })
      .eq("id", id);

    if (error) {
      console.error("Update featured teacher error:", error);
      return NextResponse.json(
        { error: "Erreur lors de la mise a jour" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Featured teacher update error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
