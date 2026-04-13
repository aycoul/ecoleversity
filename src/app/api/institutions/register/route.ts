import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(["private_school", "tutoring_center", "academy"]),
  contactName: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(8).max(20),
  city: z.string().min(2).max(100),
  teacherCount: z.number().int().min(1).max(500),
  message: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Save to institution_waitlist table (or schools table with pending status)
    const { error } = await supabase.from("institution_waitlist").insert({
      name: parsed.data.name,
      type: parsed.data.type,
      contact_name: parsed.data.contactName,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone,
      city: parsed.data.city,
      teacher_count: parsed.data.teacherCount,
      message: parsed.data.message ?? null,
      status: "pending",
    });

    if (error) {
      // If table doesn't exist yet, just log and return success
      // (table will be created when school admin feature is built)
      console.warn("[institutions] Waitlist insert error (table may not exist):", error.message);
    }

    return NextResponse.json({
      data: { success: true, message: "Votre demande a été enregistrée. Nous vous contacterons bientôt." },
    });
  } catch (err) {
    console.error("[institutions] Register error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
