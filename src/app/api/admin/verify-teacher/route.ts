import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { sendNotification } from "@/lib/notifications/service";

const bodySchema = z.object({
  teacherId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Authenticate the caller
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "school_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { teacherId, action, reason } = parsed.data;

    // Use admin client for the update (bypasses RLS)
    const admin = createAdminClient();

    const newStatus = action === "approve" ? "fully_verified" : "rejected";

    const { error: updateError } = await admin
      .from("teacher_profiles")
      .update({
        verification_status: newStatus,
        ...(action === "reject" && reason ? { rejection_reason: reason } : {}),
      })
      .eq("id", teacherId);

    if (updateError) {
      console.error("Failed to update teacher verification:", updateError);
      return NextResponse.json(
        { error: "Failed to update verification status" },
        { status: 500 }
      );
    }

    // Also update the profiles table verification_status to keep in sync
    const { data: teacherProfile } = await admin
      .from("teacher_profiles")
      .select("user_id")
      .eq("id", teacherId)
      .single();

    if (teacherProfile) {
      await admin
        .from("profiles")
        .update({ verification_status: newStatus })
        .eq("id", teacherProfile.user_id);
    }

    // Fire notification to the teacher
    if (teacherProfile) {
      const event = action === 'approve' ? 'teacher_verified' : 'teacher_rejected';
      sendNotification({
        event,
        userId: teacherProfile.user_id,
        data: {
          ...(reason ? { reason } : {}),
        },
      }).catch((err) => console.error(`[notifications] ${event} error:`, err));
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error("verify-teacher error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
