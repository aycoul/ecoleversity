import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/domain";

type RedirectResult = {
  path: string;
  role: UserRole | null;
};

export async function getAuthRedirect(
  supabase: SupabaseClient
): Promise<RedirectResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { path: "/login", role: null };
  }

  // Fetch profile role — verification_status lives on teacher_profiles,
  // not profiles (schema was refactored).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Profile not created yet — fallback based on user metadata
    const role = (user.user_metadata?.role as UserRole) ?? "parent";
    if (role === "teacher") {
      return { path: "/onboarding/teacher", role };
    }
    return { path: "/onboarding/parent", role };
  }

  const role = profile.role as UserRole;

  switch (role) {
    case "admin":
    case "school_admin":
      return { path: "/dashboard/admin", role };

    case "teacher": {
      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single();
      const vs = tp?.verification_status;
      if (!vs || vs === "pending" || vs === "id_submitted" || vs === "diploma_submitted" || vs === "video_submitted") {
        return { path: "/onboarding/teacher", role };
      }
      return { path: "/dashboard/teacher", role };
    }

    case "parent": {
      // Check if parent has learner profiles
      const { count } = await supabase
        .from("learner_profiles")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", user.id);

      if (!count || count === 0) {
        return { path: "/onboarding/parent", role };
      }
      return { path: "/dashboard/parent", role };
    }

    default:
      return { path: "/dashboard/parent", role };
  }
}
