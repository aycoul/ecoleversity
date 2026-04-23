-- Featured tutor listings (paid promotion)
-- Teachers can pay to be featured on the homepage/marketplace.

create table if not exists featured_teachers (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  amount_paid_xof int not null default 0,
  placement text not null default 'homepage' check (placement in ('homepage', 'marketplace', 'both')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint chk_featured_dates check (end_date >= start_date)
);

create index if not exists idx_featured_teachers_teacher on featured_teachers (teacher_id);
create index if not exists idx_featured_teachers_active on featured_teachers (active, start_date, end_date);

-- RLS: public can see currently-active placements (needed for homepage/marketplace);
-- admins manage all rows.
alter table featured_teachers enable row level security;

drop policy if exists "featured_teachers_public_read_active" on featured_teachers;
create policy "featured_teachers_public_read_active"
  on featured_teachers for select
  using (active = true and current_date between start_date and end_date);

drop policy if exists "featured_teachers_admin_all" on featured_teachers;
create policy "featured_teachers_admin_all"
  on featured_teachers for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'school_admin')
    )
  );
