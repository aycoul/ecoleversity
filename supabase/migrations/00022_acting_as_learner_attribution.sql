-- Attribution for kid-mode activity.
--
-- EcoleVersity has one Supabase auth user per family (the parent).
-- When the parent is "in kid mode" on /k/[learner_id]/* the same
-- auth.uid() still applies — but teachers and moderators need to tell
-- whether the message/chat came from the kid or the parent.
--
-- This column is non-null when the artifact was generated from a kid
-- URL; teacher-side UI displays the learner's first_name as the
-- attribution ("Awa via Test Parent").

ALTER TABLE live_class_chat_messages
  ADD COLUMN IF NOT EXISTS acting_as_learner_id UUID
  REFERENCES learner_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lccm_acting_as_learner
  ON live_class_chat_messages (acting_as_learner_id)
  WHERE acting_as_learner_id IS NOT NULL;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS acting_as_learner_id UUID
  REFERENCES learner_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_acting_as_learner
  ON messages (acting_as_learner_id)
  WHERE acting_as_learner_id IS NOT NULL;

COMMENT ON COLUMN live_class_chat_messages.acting_as_learner_id IS
  'When non-null: the message was sent while the parent was acting in kid mode for this learner. UI displays learner first_name for attribution.';

COMMENT ON COLUMN messages.acting_as_learner_id IS
  'Same attribution semantic — labels inbox entries "<learner first_name> via <parent>".';
