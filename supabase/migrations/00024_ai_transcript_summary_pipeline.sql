-- Phase 7 (moved forward): AI transcript + session summary + parent-email pipeline.
--
-- The existing `ai_training_content` table already has `transcription` and
-- `extracted_topics` columns, but lacks a structured, twin-ready payload we
-- can hand to the eventual training job without re-parsing Whisper output.
-- We also need a place to store the parent-facing session summary + the
-- status of post-processing on each recording.

-- 1) session_recordings: consumer-facing summary + pipeline state.
alter table public.session_recordings
  add column if not exists summary text,
  add column if not exists ai_status text default 'pending'
    check (ai_status in ('pending','processing','done','failed')),
  add column if not exists ai_status_error text,
  add column if not exists ai_processed_at timestamptz,
  add column if not exists parent_email_sent_at timestamptz;

comment on column public.session_recordings.summary is
  'French-language parent-facing session summary (~200 words, 4 sections).';
comment on column public.session_recordings.ai_status is
  'Post-processing pipeline state: pending → processing → done | failed.';

-- 2) ai_training_content: structured twin-training payload + stats.
--
-- `training_payload` holds the twin-ready JSON (segments, speakers, topics,
-- teacher-style signals). The downstream training job only needs to read
-- this column — no re-parsing of raw transcript required.
alter table public.ai_training_content
  add column if not exists training_payload jsonb,
  add column if not exists language text default 'fr',
  add column if not exists duration_seconds integer,
  add column if not exists segment_count integer,
  add column if not exists payload_version integer default 1,
  add column if not exists processed_at timestamptz;

comment on column public.ai_training_content.training_payload is
  'Twin-ready structured payload: segments (timestamped + speaker-labeled), '
  'topics, Q&A pairs, teacher-style signals. See docs/ai/twin-payload-schema.md.';

-- 3) Helpful index for the backfill + re-processing jobs.
create index if not exists idx_session_recordings_ai_status
  on public.session_recordings (ai_status)
  where ai_status in ('pending','failed');

create index if not exists idx_ai_training_content_twin
  on public.ai_training_content (twin_id, created_at desc);
