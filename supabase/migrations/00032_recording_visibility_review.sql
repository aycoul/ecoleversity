-- Recording visibility + transcript review controls
-- Founder-controlled switches that govern who can play session recordings
-- and who must approve AI summaries before parent emails are sent.

-- =============================================================================
-- Review status column on session_recordings
-- =============================================================================
alter table session_recordings
  add column if not exists summary_review_status text not null default 'pending';

comment on column session_recordings.summary_review_status is
  'pending | auto_sent | awaiting_teacher | awaiting_admin | approved_by_teacher | approved_by_admin | sent';

-- =============================================================================
-- platform_config rows — visibility + review mode
-- =============================================================================
insert into platform_config (key, value, label_fr, description_fr)
values
  (
    'recording_visibility_teacher',
    'false'::jsonb,
    'Visibilité enseignant — enregistrements',
    'Quand activé, les enseignants peuvent revoir leurs propres enregistrements de séances. Désactivé par défaut.'
  ),
  (
    'recording_visibility_parent',
    'false'::jsonb,
    'Visibilité parent — enregistrements',
    'Quand activé, les parents peuvent revoir les enregistrements des séances de leurs enfants. Désactivé par défaut.'
  ),
  (
    'transcript_review_mode',
    '"auto"'::jsonb,
    'Mode de relecture des résumés',
    'auto = envoi automatique au parent ; teacher_review = l''enseignant valide avant envoi ; admin_review = l''admin valide avant envoi.'
  )
on conflict (key) do nothing;

-- Backfill review_status for existing rows so they reflect what already happened.
-- ai_status='done' + parent_email_sent_at not null → already auto-sent.
update session_recordings
set summary_review_status = 'auto_sent'
where summary_review_status = 'pending'
  and ai_status = 'done'
  and parent_email_sent_at is not null;
