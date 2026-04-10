-- Exam preparation: questions bank + student attempts

CREATE TABLE exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('CEPE', 'BEPC', 'BAC', 'CONCOURS_6EME')),
  subject TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INT NOT NULL CHECK (correct_answer >= 0),
  explanation TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL REFERENCES learner_profiles(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL,
  duration_seconds INT,
  answers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exam_questions_type_subject ON exam_questions(exam_type, subject);
CREATE INDEX idx_exam_attempts_learner ON exam_attempts(learner_id, exam_type, created_at DESC);

-- RLS
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

-- Questions: anyone authenticated can read
CREATE POLICY "exam_questions_read" ON exam_questions
  FOR SELECT TO authenticated USING (true);

-- Questions: only admin can insert/update/delete
CREATE POLICY "exam_questions_admin_write" ON exam_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Attempts: parents can read their children's attempts
CREATE POLICY "exam_attempts_parent_read" ON exam_attempts
  FOR SELECT TO authenticated
  USING (
    learner_id IN (SELECT id FROM learner_profiles WHERE parent_id = auth.uid())
  );

-- Attempts: parents can create attempts for their children
CREATE POLICY "exam_attempts_parent_insert" ON exam_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    learner_id IN (SELECT id FROM learner_profiles WHERE parent_id = auth.uid())
  );
