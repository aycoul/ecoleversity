-- Lesson-level progress tracking for course enrollments

create table public.lesson_progress (
  id uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  watch_position_seconds int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint unique_lesson_progress unique (enrollment_id, lesson_id)
);

create index idx_lesson_progress_enrollment on public.lesson_progress(enrollment_id);

alter table public.lesson_progress enable row level security;

create policy "Parents manage children lesson progress"
  on public.lesson_progress for all using (
    exists (
      select 1 from public.enrollments e
      join public.learner_profiles lp on lp.id = e.learner_id
      where e.id = lesson_progress.enrollment_id and lp.parent_id = auth.uid()
    )
  );

create policy "Teachers view progress in own courses"
  on public.lesson_progress for select using (
    exists (
      select 1 from public.enrollments e
      join public.courses c on c.id = e.course_id
      where e.id = lesson_progress.enrollment_id and c.teacher_id = auth.uid()
    )
  );

create policy "Admins manage all progress"
  on public.lesson_progress for all using (public.is_admin());
