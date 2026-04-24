-- Waiting room support
-- Tracks admission status per participant per session.
-- Teachers auto-admit themselves when they join; learners wait until the teacher
-- (or a prior admission) lets them in.

create table if not exists session_admissions (
  id uuid primary key default uuid_generate_v4(),
  live_class_id uuid not null references live_classes (id) on delete cascade,
  -- LiveKit participant identity. Either a profiles.id (teacher / parent
  -- in parent mode) or a learner_profiles.id (parent acting-as-learner).
  -- Not FK-constrained because PG can't express "this column references
  -- either table A or table B". Validated at the API layer instead.
  user_id uuid not null,
  admitted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_session_admissions unique (live_class_id, user_id)
);

create index if not exists idx_session_admissions_class on session_admissions (live_class_id);
create index if not exists idx_session_admissions_user on session_admissions (user_id);

-- RLS: enrolled participants and the teacher can read admissions for their class.
-- Writes go through the service role (admission endpoint), which enforces that only
-- the teacher can admit someone else, or a user can admit themselves.
alter table session_admissions enable row level security;

-- Teacher of the class can see all admissions
drop policy if exists "session_admissions_teacher_read" on session_admissions;
create policy "session_admissions_teacher_read"
  on session_admissions for select
  using (
    exists (
      select 1 from live_classes
      where id = session_admissions.live_class_id
        and teacher_id = auth.uid()
    )
  );

-- Any user can see their own admission row
drop policy if exists "session_admissions_user_read_own" on session_admissions;
create policy "session_admissions_user_read_own"
  on session_admissions for select
  using (user_id = auth.uid());

-- Admins see everything
drop policy if exists "session_admissions_admin_all" on session_admissions;
create policy "session_admissions_admin_all"
  on session_admissions for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'school_admin')
    )
  );
