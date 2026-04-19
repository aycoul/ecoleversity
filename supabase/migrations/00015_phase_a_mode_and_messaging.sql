-- Phase A — Parent + Kid mode + Triad messaging
--
-- Adds:
--   1. profiles.active_learner_id — durable mirror of ev_active_learner_id
--      cookie; tells us which kid profile the parent last viewed
--   2. conversations.learner_id — makes parent↔teacher conversations
--      triad-aware so kid mode can filter to their own threads only
--   3. messages.moderation_status + blocked_reason — tracks PII scrub
--      results per message
--   4. message_moderation_log — audit of every blocked-send attempt,
--      viewable by admins for abuse investigation
--
-- RLS on conversations stays 2-participant (parent + teacher). Kid sees
-- conversations because kid mode shares the parent's auth session —
-- auth.uid() matches parent's participant_X. Kid-mode filtering happens
-- client-side by matching conversations.learner_id to the active learner.

begin;

-- 1. active_learner_id on profiles
alter table profiles
  add column if not exists active_learner_id uuid
    references learner_profiles(id) on delete set null;

-- 2. learner_id on conversations (nullable — existing rows stay compatible)
alter table conversations
  add column if not exists learner_id uuid
    references learner_profiles(id) on delete set null;

create index if not exists idx_conversations_learner
  on conversations(learner_id)
  where learner_id is not null;

create index if not exists idx_conversations_participant_1
  on conversations(participant_1);

create index if not exists idx_conversations_participant_2
  on conversations(participant_2);

-- 3. moderation columns on messages
alter table messages
  add column if not exists moderation_status text
    not null
    default 'clean';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_moderation_status_check'
  ) then
    alter table messages
      add constraint messages_moderation_status_check
      check (moderation_status in ('clean', 'blocked', 'flagged'));
  end if;
end $$;

alter table messages
  add column if not exists blocked_reason text;

-- 4. Moderation log table
create table if not exists message_moderation_log (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references profiles(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  attempted_body text not null,
  block_reason text not null,
  matched_pattern text,
  created_at timestamptz not null default now()
);

create index if not exists idx_message_moderation_log_created
  on message_moderation_log(created_at desc);

create index if not exists idx_message_moderation_log_sender
  on message_moderation_log(sender_id, created_at desc);

-- RLS on moderation log — admins can read all, senders can read their own
alter table message_moderation_log enable row level security;

drop policy if exists "moderation_log_select_admin_or_sender" on message_moderation_log;
create policy "moderation_log_select_admin_or_sender"
  on message_moderation_log for select
  to authenticated
  using (public.is_admin() or sender_id = auth.uid());

-- Senders insert their own block records via the send-message API
drop policy if exists "moderation_log_insert_own" on message_moderation_log;
create policy "moderation_log_insert_own"
  on message_moderation_log for insert
  to authenticated
  with check (sender_id = auth.uid());

-- Admins can delete (for GDPR-style requests)
drop policy if exists "moderation_log_delete_admin" on message_moderation_log;
create policy "moderation_log_delete_admin"
  on message_moderation_log for delete
  to authenticated
  using (public.is_admin());

commit;
