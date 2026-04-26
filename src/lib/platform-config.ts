import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Read a single platform_config value. Falls back when the row is
 * missing — the migration seeds defaults but reads happen against the
 * live row, so the fallback is the safety net while migrations propagate.
 */
export async function getPlatformConfig<T>(key: string, fallback: T): Promise<T> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("platform_config")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (data?.value === undefined || data.value === null) return fallback;
    return data.value as T;
  } catch (err) {
    console.error(`[platform-config] read ${key} failed:`, err);
    return fallback;
  }
}

export type RecordingVisibility = {
  teacher: boolean;
  parent: boolean;
};

export async function getRecordingVisibility(): Promise<RecordingVisibility> {
  const [teacher, parent] = await Promise.all([
    getPlatformConfig<boolean>("recording_visibility_teacher", false),
    getPlatformConfig<boolean>("recording_visibility_parent", false),
  ]);
  return { teacher: !!teacher, parent: !!parent };
}

export type TranscriptReviewMode = "auto" | "teacher_review" | "admin_review";

export async function getTranscriptReviewMode(): Promise<TranscriptReviewMode> {
  const value = await getPlatformConfig<string>("transcript_review_mode", "auto");
  if (value === "teacher_review" || value === "admin_review") return value;
  return "auto";
}
