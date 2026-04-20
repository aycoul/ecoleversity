-- The admin verification UI and /api/admin/verify-teacher both reference
-- teacher_profiles.rejection_reason — the text an admin leaves when
-- rejecting a teacher's documents. The column was never added, so the
-- verification queue silently returned zero rows (column error surfaced
-- only when an inline debug line was added to the page).
alter table teacher_profiles add column if not exists rejection_reason text;
comment on column teacher_profiles.rejection_reason is
  'Reason given by admin when verification_status is set to rejected. Null otherwise.';
