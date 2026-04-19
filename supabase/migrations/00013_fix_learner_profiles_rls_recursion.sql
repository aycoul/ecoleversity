-- Fix infinite recursion in learner_profiles RLS policy (error 42P17).
--
-- Root cause: learner_profiles SELECT policy queried enrollments, and
-- enrollments SELECT policy queried learner_profiles. PostgreSQL detects
-- the cycle and throws 42P17 before executing, so even a parent's own
-- "select from learner_profiles where parent_id = auth.uid()" failed.
--
-- This blocked every parent signup at onboarding step 2 (add child).
--
-- Fix: extract the teacher-visibility cross-table check into a SECURITY
-- DEFINER helper that skips RLS on the inner enrollments query, then
-- rewrite the policy to call it. Same visibility semantics, no cycle.

create or replace function public.is_learner_visible_to_teacher(
  p_learner_id uuid,
  p_teacher_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from enrollments e
    left join courses c on e.course_id = c.id
    left join live_classes lc on e.live_class_id = lc.id
    where e.learner_id = p_learner_id
      and (c.teacher_id = p_teacher_id or lc.teacher_id = p_teacher_id)
  );
$$;

revoke all on function public.is_learner_visible_to_teacher(uuid, uuid) from public;
grant execute on function public.is_learner_visible_to_teacher(uuid, uuid) to authenticated;

drop policy if exists "learner_profiles_select_parent" on learner_profiles;

create policy "learner_profiles_select_parent"
  on learner_profiles for select
  to authenticated
  using (
    parent_id = auth.uid()
    or public.is_admin()
    or (
      public.get_role() = 'teacher'
      and public.is_learner_visible_to_teacher(id, auth.uid())
    )
  );
