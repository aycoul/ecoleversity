-- Allow anonymous visitors to browse the verified teacher catalog.
--
-- Rationale: the /teachers marketplace page is a public landing surface —
-- new parents need to see what EcoleVersity offers BEFORE they sign up.
-- Previously the SELECT policy was restricted to role=authenticated, which
-- made the catalog appear empty for anon users and killed pre-signup funnel.

drop policy if exists "teacher_profiles_select" on teacher_profiles;

-- Authenticated users keep the rich visibility (own profile, admin, school)
create policy "teacher_profiles_select"
  on teacher_profiles for select
  to authenticated
  using (
    verification_status = 'fully_verified'
    or id = auth.uid()
    or public.is_admin()
    or (
      public.get_role() = 'school_admin'
      and exists (
        select 1 from schools s
        where s.id = teacher_profiles.school_id
          and s.admin_user_id = auth.uid()
      )
    )
  );

-- Anon users can see ONLY fully verified teachers — no unverified drafts
create policy "teacher_profiles_select_anon"
  on teacher_profiles for select
  to anon
  using (verification_status = 'fully_verified');

-- profiles joined by the catalog also need anon read for verified teachers
-- (PostgREST embedding requires SELECT on the embedded resource too)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_verified_teachers_anon'
  ) then
    create policy "profiles_select_verified_teachers_anon"
      on profiles for select
      to anon
      using (
        role = 'teacher'
        and exists (
          select 1 from teacher_profiles tp
          where tp.id = profiles.id
            and tp.verification_status = 'fully_verified'
        )
      );
  end if;
end $$;
