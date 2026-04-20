-- Audit log for in-session (LiveKit) chat messages.
-- Every message attempt is logged whether it was published or blocked so
-- moderators can review the full conversation later, investigate PII
-- breaches, and prove compliance when a parent asks what was said.

CREATE TABLE IF NOT EXISTS live_class_chat_messages (
  id            BIGSERIAL PRIMARY KEY,
  live_class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role   TEXT NOT NULL CHECK (sender_role IN ('teacher', 'parent', 'admin')),
  content       TEXT NOT NULL,
  -- Moderation
  blocked         BOOLEAN NOT NULL DEFAULT FALSE,
  block_reason    TEXT,
  matched_pattern TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Common query: fetch the transcript of a class in order.
CREATE INDEX IF NOT EXISTS idx_live_class_chat_messages_class_time
  ON live_class_chat_messages (live_class_id, created_at);

-- Admin-only review: any query on blocked messages for a moderation queue.
CREATE INDEX IF NOT EXISTS idx_live_class_chat_messages_blocked
  ON live_class_chat_messages (blocked, created_at DESC)
  WHERE blocked = TRUE;

-- RLS — only the class participants and admins can read the transcript.
ALTER TABLE live_class_chat_messages ENABLE ROW LEVEL SECURITY;

-- Teachers can read their own class transcripts.
CREATE POLICY "teachers_read_own_class_chat"
  ON live_class_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM live_classes
      WHERE live_classes.id = live_class_chat_messages.live_class_id
        AND live_classes.teacher_id = auth.uid()
    )
  );

-- Enrolled parents can read their class's transcript (via learner_profiles).
CREATE POLICY "parents_read_enrolled_class_chat"
  ON live_class_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM enrollments e
      JOIN learner_profiles l ON l.id = e.learner_id
      WHERE e.live_class_id = live_class_chat_messages.live_class_id
        AND l.parent_id = auth.uid()
    )
  );

-- Writes happen via the service-role server route only; no INSERT policy
-- for regular users. The route does its own auth + PII scan.

COMMENT ON TABLE live_class_chat_messages IS
  'Audit log for LiveKit in-session chat. Every message attempt (allowed or blocked) is persisted for moderator review and compliance.';
