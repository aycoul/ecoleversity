-- Session recordings from LiveKit egress, stored on Cloudflare R2
-- Phase 6, Task 39

create table if not exists session_recordings (
  id bigint primary key generated always as identity,
  live_class_id uuid not null references live_classes(id) on delete cascade,
  egress_id text unique not null,
  r2_key text,
  r2_url text,
  cloudflare_stream_id text,
  duration_seconds integer,
  file_size_bytes bigint,
  started_at timestamptz,
  ended_at timestamptz,
  status text not null default 'starting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_recordings_status_check check (
    status in ('starting', 'active', 'completed', 'failed', 'aborted')
  )
);

create index idx_session_recordings_class on session_recordings(live_class_id);
create index idx_session_recordings_egress on session_recordings(egress_id);
create index idx_session_recordings_status on session_recordings(status);

alter table session_recordings enable row level security;

-- Teachers see recordings of their own classes
create policy "Teachers view own session recordings"
  on session_recordings for select
  using (
    exists (
      select 1 from live_classes
      where live_classes.id = session_recordings.live_class_id
        and live_classes.teacher_id = auth.uid()
    )
  );

-- Parents see recordings of classes their children are enrolled in
create policy "Parents view enrolled session recordings"
  on session_recordings for select
  using (
    exists (
      select 1 from enrollments
      where enrollments.live_class_id = session_recordings.live_class_id
        and enrollments.parent_id = auth.uid()
    )
  );

-- Admins see everything
create policy "Admins view all session recordings"
  on session_recordings for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- updated_at trigger
create or replace function set_session_recordings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger session_recordings_updated_at
  before update on session_recordings
  for each row
  execute function set_session_recordings_updated_at();
