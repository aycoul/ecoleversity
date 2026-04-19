// Server-side helpers for reading the active learner (kid mode).
//
// The active learner is tracked in two places:
//   1. HTTP cookie `ev_active_learner_id` — fast read, session scoped
//   2. profiles.active_learner_id — durable mirror for cross-device
//
// Cookie is the source of truth per request. DB is the fallback when
// cookie is missing (e.g. first request after login on a new device).

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ACTIVE_LEARNER_COOKIE = "ev_active_learner_id";

export type ActiveLearner = {
  id: string;
  first_name: string;
  grade_level: string;
  target_exam: string | null;
  avatar_url: string | null;
};

/**
 * Resolve the active learner for the current request. Returns null
 * when parent mode (no kid selected) or when the user is not a parent.
 *
 * Verifies ownership — a parent cannot activate a learner that isn't
 * theirs, even if their cookie says otherwise. Tampering falls back
 * to parent mode.
 */
export async function getActiveLearner(
  supabase: SupabaseClient
): Promise<ActiveLearner | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  let learnerId = cookieStore.get(ACTIVE_LEARNER_COOKIE)?.value ?? null;

  // Fallback to DB mirror if cookie missing
  if (!learnerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_learner_id")
      .eq("id", user.id)
      .single();
    learnerId = profile?.active_learner_id ?? null;
  }

  if (!learnerId) return null;

  // Verify ownership (parent_id = current user) — RLS enforces this too
  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id, first_name, grade_level, target_exam, avatar_url")
    .eq("id", learnerId)
    .eq("parent_id", user.id)
    .maybeSingle();

  return learner ?? null;
}

/**
 * Server-only helper to check if the current request is in kid mode.
 * Useful in layouts + middleware.
 */
export async function isKidMode(supabase: SupabaseClient): Promise<boolean> {
  const learner = await getActiveLearner(supabase);
  return learner !== null;
}
