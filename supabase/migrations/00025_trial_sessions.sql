-- Trial session support
-- Teachers can offer a free 30-min trial session (1-on-1 only, no payment).
-- Each parent gets at most 1 trial per teacher.

-- 1. Add is_trial flag to live_classes (idempotent)
alter table live_classes add column if not exists is_trial boolean not null default false;

-- 2. Track trial usage per parent per teacher
create table if not exists trial_eligibilities (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references profiles (id) on delete cascade,
  teacher_id uuid not null references profiles (id) on delete cascade,
  used_at timestamptz not null default now(),
  constraint uq_trial_eligibilities unique (parent_id, teacher_id)
);

create index if not exists idx_trial_eligibilities_parent on trial_eligibilities (parent_id);
create index if not exists idx_trial_eligibilities_teacher on trial_eligibilities (teacher_id);

-- 3. RLS policies
alter table trial_eligibilities enable row level security;

-- Parents can see their own eligibility rows
drop policy if exists "trial_eligibilities_parent_read_own" on trial_eligibilities;
create policy "trial_eligibilities_parent_read_own"
  on trial_eligibilities for select
  using (parent_id = auth.uid());

-- Teachers can see their own rows (to know who used trials with them)
drop policy if exists "trial_eligibilities_teacher_read_own" on trial_eligibilities;
create policy "trial_eligibilities_teacher_read_own"
  on trial_eligibilities for select
  using (teacher_id = auth.uid());

-- Admins see everything
drop policy if exists "trial_eligibilities_admin_all" on trial_eligibilities;
create policy "trial_eligibilities_admin_all"
  on trial_eligibilities for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'school_admin')
    )
  );

-- Writes go through the service role (enroll endpoint), so no public insert/update/delete policies.

-- 4. Keep enroll_learner_atomic aware of is_trial so callers can branch on the result.
-- Trial classes always have max_students=1 (enforced by API), so the existing capacity
-- check already prevents double-booking a trial slot.
CREATE OR REPLACE FUNCTION enroll_learner_atomic(
  p_learner_id UUID,
  p_live_class_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_students INT;
  v_current_count INT;
  v_class_status TEXT;
  v_is_trial BOOLEAN;
  v_enrollment_id UUID;
BEGIN
  -- Lock the live_class row to prevent concurrent enrollment
  SELECT max_students, status, is_trial
  INTO v_max_students, v_class_status, v_is_trial
  FROM live_classes
  WHERE id = p_live_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'class_not_found');
  END IF;

  IF v_class_status != 'scheduled' THEN
    RETURN json_build_object('error', 'class_not_available');
  END IF;

  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM enrollments
    WHERE live_class_id = p_live_class_id AND learner_id = p_learner_id
  ) THEN
    RETURN json_build_object('error', 'already_enrolled');
  END IF;

  -- Count current enrollments (within the lock)
  SELECT COUNT(*) INTO v_current_count
  FROM enrollments
  WHERE live_class_id = p_live_class_id;

  IF v_current_count >= v_max_students THEN
    RETURN json_build_object('error', 'class_full', 'current_count', v_current_count);
  END IF;

  -- Insert enrollment atomically
  INSERT INTO enrollments (learner_id, live_class_id)
  VALUES (p_learner_id, p_live_class_id)
  RETURNING id INTO v_enrollment_id;

  RETURN json_build_object('success', true, 'enrollment_id', v_enrollment_id, 'is_trial', v_is_trial);
END;
$$;
