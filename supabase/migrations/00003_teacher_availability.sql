-- Teacher Availability
-- Weekly recurring time slots for tutoring availability

create table public.teacher_availability (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week >= 0 and day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint valid_time_range check (start_time < end_time)
);

create index idx_availability_teacher on public.teacher_availability(teacher_id);

alter table public.teacher_availability enable row level security;

create policy "Teachers manage own availability"
  on public.teacher_availability for all using (teacher_id = auth.uid());

create policy "Anyone can view active availability"
  on public.teacher_availability for select using (is_active = true);

create policy "Admins manage all availability"
  on public.teacher_availability for all using (public.is_admin());
