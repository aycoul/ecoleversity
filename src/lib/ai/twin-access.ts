/**
 * Global kill-switch for learner/teacher-facing AI twin surfaces.
 *
 * The transcript + summary pipeline runs regardless — that's internal
 * data collection. This flag governs whether NON-ADMIN users can see
 * any UI element that references, mentions, or interacts with a twin
 * (learner "chat with AI teacher", teacher "my twin" management page,
 * marketing mentions, etc.).
 *
 * Default: disabled. Flip the TWIN_PUBLIC_ACCESS env var to "true" on
 * Vercel + .env.local when the twin product is cleared for public use.
 * Individual twins also carry `ai_teacher_twins.is_active` — both flags
 * must be true for public exposure.
 */
export function isTwinPublicAccessEnabled(): boolean {
  return process.env.TWIN_PUBLIC_ACCESS === "true";
}
