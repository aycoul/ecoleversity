-- Notification preferences per user
create table public.notification_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  whatsapp_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  preferred_channel text not null default 'whatsapp'
    check (preferred_channel in ('whatsapp', 'email', 'push')),
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users manage own preferences"
  on public.notification_preferences
  for all
  using (user_id = auth.uid());
