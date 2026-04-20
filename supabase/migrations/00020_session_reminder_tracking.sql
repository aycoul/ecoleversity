-- Track when a reminder has been sent for a session so the 5-minute
-- cron can be idempotent — it picks up every session starting in the
-- next 10–20 min window, but only fires a reminder once.
alter table live_classes
  add column if not exists reminder_sent_at timestamptz;

comment on column live_classes.reminder_sent_at is
  'Timestamp the 15-min pre-session reminder was sent to all enrolled parents + the teacher. Null = not yet sent.';

create index if not exists idx_live_classes_reminder_due
  on live_classes (scheduled_at)
  where reminder_sent_at is null and status = 'scheduled';
