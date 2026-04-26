import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "teacher-documents";

/**
 * Mint a short-lived signed URL for a stored teacher-documents path.
 * Returns null when the input is null OR when the value is a legacy
 * full URL (those were generated before the bucket went private and
 * will 404 — the teacher must re-upload).
 */
export async function signTeacherDocPath(
  pathOrUrl: string | null,
  ttlSeconds: number = 60 * 10
): Promise<string | null> {
  if (!pathOrUrl) return null;
  // Legacy public URL — bucket is now private; return null so the
  // admin UI can prompt the teacher to re-upload.
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return null;
  }
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(pathOrUrl, ttlSeconds);
  return data?.signedUrl ?? null;
}

export const TEACHER_DOCUMENTS_BUCKET = BUCKET;
