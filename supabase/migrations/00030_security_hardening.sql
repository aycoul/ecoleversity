-- Security hardening pass before public launch
-- Closes findings from the pre-launch RLS / auth / OWASP audit:
--   * P0-2  transactions INSERT money-forge gap
--   * P0-1  teacher-documents bucket public exposure (CNI / diploma)
--   * P1-7  profiles.phone enumeration via anon key
--   * P1-13 broken debit_wallet function (referenced non-existent table)
--   * P1-14 enroll_learner_atomic missed parent-ownership check
--   * P1-15 conversations INSERT allowed unsolicited cold-DMs

-- =============================================================================
-- P0-2 — transactions INSERT: parents may only insert pending, zero-fee rows
-- =============================================================================
-- Old policy let any logged-in parent insert a row with status='confirmed',
-- arbitrary commission/teacher_amount, and any payment_reference. That meant
-- a forged "paid" booking with zero money moved. Now parents may only
-- create pending rows seeded with zeroed commission split; the server-side
-- payment code (admin client, bypasses RLS) is the only path to confirmed.
drop policy if exists "transactions_insert" on transactions;

create policy "transactions_insert"
  on transactions for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      parent_id = auth.uid()
      and status = 'pending'
      and coalesce(commission_amount, 0) = 0
      and coalesce(teacher_amount, 0) = 0
      and coalesce(amount_xof, 0) > 0
    )
  );

-- =============================================================================
-- P1-7 — Stop profiles.phone enumeration via anon key
-- =============================================================================
-- The profiles SELECT policy is intentionally `using (true)` so display_name
-- and avatar_url stay browseable for chat / teacher cards. We keep the
-- policy but revoke column-level access to phone fields, so cross-user
-- queries cannot dump WhatsApp numbers. Server code that legitimately
-- needs phone (notifications, payouts) reads via the service-role admin
-- client, which is unaffected by these GRANTs.
revoke select (phone, phone_verified) on profiles from anon, authenticated;

-- =============================================================================
-- P1-13 — Drop broken debit_wallet function
-- =============================================================================
-- The function references a non-existent `wallets` table (the actual table
-- is platform_wallet) and inserts a `'debit'` value into wallet_tx_type
-- which the enum doesn't accept. Every call would throw at runtime.
-- Drop until a correctly-typed implementation lands.
drop function if exists public.debit_wallet(uuid, int, text);

-- =============================================================================
-- P1-14 — enroll_learner_atomic: verify caller owns the learner
-- =============================================================================
-- The function is SECURITY DEFINER, so a direct call via the anon key would
-- bypass RLS. The API route already gates ownership, but defense-in-depth
-- belongs inside the function too — anyone calling the RPC must either own
-- the learner or be an admin.
create or replace function public.enroll_learner_atomic(
  p_learner_id uuid,
  p_live_class_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_students int;
  v_current_count int;
  v_class_status text;
  v_enrollment_id uuid;
  v_parent_id uuid;
begin
  -- Ownership check (defense-in-depth — API also enforces)
  select parent_id into v_parent_id
  from public.learner_profiles
  where id = p_learner_id;

  if v_parent_id is null then
    return json_build_object('error', 'learner_not_found');
  end if;

  if v_parent_id <> auth.uid() and not public.is_admin() then
    return json_build_object('error', 'unauthorized');
  end if;

  -- Lock the live_class row to prevent concurrent enrollment
  select max_students, status into v_max_students, v_class_status
  from public.live_classes
  where id = p_live_class_id
  for update;

  if not found then
    return json_build_object('error', 'class_not_found');
  end if;

  if v_class_status <> 'scheduled' then
    return json_build_object('error', 'class_not_available');
  end if;

  if exists (
    select 1 from public.enrollments
    where live_class_id = p_live_class_id and learner_id = p_learner_id
  ) then
    return json_build_object('error', 'already_enrolled');
  end if;

  select count(*) into v_current_count
  from public.enrollments
  where live_class_id = p_live_class_id;

  if v_current_count >= v_max_students then
    return json_build_object('error', 'class_full', 'current_count', v_current_count);
  end if;

  insert into public.enrollments (learner_id, live_class_id)
  values (p_learner_id, p_live_class_id)
  returning id into v_enrollment_id;

  return json_build_object('success', true, 'enrollment_id', v_enrollment_id);
end;
$$;

-- =============================================================================
-- P1-15 — conversations INSERT: require an existing teacher↔parent engagement
-- =============================================================================
-- Old policy only required the caller to be one of the participants. That
-- let any teacher (or anyone with a teacher account) cold-DM any parent.
-- New policy demands either admin override OR an existing enrollment that
-- links the two participants through a learner.
drop policy if exists "conversations_insert" on conversations;

create policy "conversations_insert"
  on conversations for insert
  to authenticated
  with check (
    (participant_1 = auth.uid() or participant_2 = auth.uid())
    and (
      public.is_admin()
      or exists (
        select 1
        from public.enrollments e
        join public.learner_profiles lp on lp.id = e.learner_id
        join public.live_classes lc on lc.id = e.live_class_id
        where (
          (lp.parent_id = participant_1 and lc.teacher_id = participant_2)
          or (lp.parent_id = participant_2 and lc.teacher_id = participant_1)
        )
      )
      or exists (
        select 1
        from public.enrollments e
        join public.learner_profiles lp on lp.id = e.learner_id
        join public.courses c on c.id = e.course_id
        where (
          (lp.parent_id = participant_1 and c.teacher_id = participant_2)
          or (lp.parent_id = participant_2 and c.teacher_id = participant_1)
        )
      )
    )
  );

-- =============================================================================
-- P0-1 — Lock down teacher-documents bucket (CNI, diploma, intro video)
-- =============================================================================
-- Old setup: client-side `getPublicUrl` exposed national IDs at guessable
-- public URLs. Make the bucket private; uploads now go through a server
-- route that uses the service-role client; reads happen via signed URLs
-- minted by the same admin path.
update storage.buckets
set public = false
where id = 'teacher-documents';

-- Remove any pre-existing permissive policies created in the dashboard.
-- (Names match Supabase dashboard defaults; safe-no-op if absent.)
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname ilike '%teacher-documents%'
        or policyname ilike '%teacher_documents%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- After this migration, no `authenticated` or `anon` policy permits access
-- to teacher-documents objects. The service-role client (used by the new
-- /api/teacher/upload-document route and by signed-URL generation) bypasses
-- RLS and remains fully functional.

-- =============================================================================
-- Rate limit counters
-- =============================================================================
-- Backing store for /api/messages, /api/support/chat, /api/twins/*/chat.
-- Each row is one (bucket, identity) pair with a rolling window count.
-- A small RPC does atomic increment+check so racing requests can't
-- both squeak under the cap.
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  identity text not null,
  window_started_at timestamptz not null default now(),
  hit_count int not null default 0,
  unique (bucket, identity)
);

alter table public.rate_limits enable row level security;
-- Only the service role uses this table — no app-side policies.

create or replace function public.rate_limit_hit(
  p_bucket text,
  p_identity text,
  p_max int,
  p_window_seconds int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.rate_limits;
  v_window_start timestamptz;
begin
  v_window_start := now() - make_interval(secs => p_window_seconds);

  insert into public.rate_limits (bucket, identity, window_started_at, hit_count)
  values (p_bucket, p_identity, now(), 1)
  on conflict (bucket, identity) do update
    set
      window_started_at = case
        when public.rate_limits.window_started_at < v_window_start then now()
        else public.rate_limits.window_started_at
      end,
      hit_count = case
        when public.rate_limits.window_started_at < v_window_start then 1
        else public.rate_limits.hit_count + 1
      end
  returning * into v_row;

  if v_row.hit_count > p_max then
    return json_build_object(
      'allowed', false,
      'count', v_row.hit_count,
      'reset_at', v_row.window_started_at + make_interval(secs => p_window_seconds)
    );
  end if;

  return json_build_object(
    'allowed', true,
    'count', v_row.hit_count,
    'reset_at', v_row.window_started_at + make_interval(secs => p_window_seconds)
  );
end;
$$;

revoke all on function public.rate_limit_hit(text, text, int, int) from public;
grant execute on function public.rate_limit_hit(text, text, int, int) to service_role;
