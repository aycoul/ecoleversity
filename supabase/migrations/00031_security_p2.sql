-- P2 cleanup pass — locks AI twins to admins per project memo and tightens
-- referrals so no user can claim another user as their referee for a credit.

-- =============================================================================
-- P2-3 — ai_teacher_twins SELECT: admin-only at MVP
-- =============================================================================
-- The original policy let any authenticated user read any twin where
-- is_active=true. Per project_twin_admin_only memory the twin surface is
-- locked to admins until the founder explicitly clears it.
drop policy if exists "ai_teacher_twins_select" on ai_teacher_twins;

create policy "ai_teacher_twins_select"
  on ai_teacher_twins for select
  to authenticated
  using (
    teacher_id = auth.uid()
    or public.is_admin()
  );

-- =============================================================================
-- P2-8 — referrals INSERT: server-side claim only
-- =============================================================================
-- Old policy let `referrer_id = auth.uid()` insert with any `referred_id`.
-- A user could claim any other user as their referee and trigger a wallet
-- credit. Tighten to admin-only writes — the legitimate signup hook uses
-- the service-role client and is unaffected.
drop policy if exists "referrals_insert" on referrals;

create policy "referrals_insert"
  on referrals for insert
  to authenticated
  with check (public.is_admin());
