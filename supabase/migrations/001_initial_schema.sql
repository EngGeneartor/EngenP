-- ============================================================
-- 001_initial_schema.sql
-- Initial schema for AI English Exam Question Generator
-- ============================================================

-- ============================================================
-- HELPER: updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- TABLE: passages
-- Uploaded and structurized passages
-- ============================================================
CREATE TABLE passages (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT,
  source              TEXT,                    -- e.g. "2024 수능특강 영어"
  original_file_url   TEXT,                    -- Supabase Storage URL
  original_file_name  TEXT,
  structured_data     JSONB,                   -- VLM-structurized passage JSON
  status              TEXT        DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_passages_user_id   ON passages (user_id);
CREATE INDEX idx_passages_status    ON passages (status);
CREATE INDEX idx_passages_created_at ON passages (created_at DESC);

ALTER TABLE passages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passages: users can read own rows"
  ON passages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "passages: users can insert own rows"
  ON passages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "passages: users can update own rows"
  ON passages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "passages: users can delete own rows"
  ON passages FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER passages_updated_at
  BEFORE UPDATE ON passages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- TABLE: question_sets
-- A set of generated questions for a passage
-- ============================================================
CREATE TABLE question_sets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  passage_id   UUID        NOT NULL REFERENCES passages(id)    ON DELETE CASCADE,
  title        TEXT,
  options      JSONB,       -- Generation options (types, difficulty, count)
  status       TEXT        DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_question_sets_user_id    ON question_sets (user_id);
CREATE INDEX idx_question_sets_passage_id ON question_sets (passage_id);
CREATE INDEX idx_question_sets_status     ON question_sets (status);
CREATE INDEX idx_question_sets_created_at ON question_sets (created_at DESC);

ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "question_sets: users can read own rows"
  ON question_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "question_sets: users can insert own rows"
  ON question_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "question_sets: users can update own rows"
  ON question_sets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "question_sets: users can delete own rows"
  ON question_sets FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER question_sets_updated_at
  BEFORE UPDATE ON question_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- TABLE: questions
-- Individual generated questions
-- ============================================================
CREATE TABLE questions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_set_id      UUID        NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  type                 TEXT        NOT NULL,   -- vocabulary_choice, grammar_choice, etc.
  question_number      INTEGER     NOT NULL,
  difficulty           INTEGER     CHECK (difficulty BETWEEN 1 AND 5),
  instruction          TEXT        NOT NULL,
  passage_with_markers TEXT,
  choices              JSONB,                  -- array of strings, or null for open-ended
  answer               TEXT        NOT NULL,
  explanation          TEXT,
  test_point           TEXT,
  is_validated         BOOLEAN     DEFAULT FALSE,
  validation_result    JSONB,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_question_set_id ON questions (question_set_id);
CREATE INDEX idx_questions_type            ON questions (type);
CREATE INDEX idx_questions_is_validated    ON questions (is_validated);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Questions are owned transitively through question_sets; join to verify ownership.
CREATE POLICY "questions: users can read own rows"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM question_sets qs
      WHERE qs.id = questions.question_set_id
        AND qs.user_id = auth.uid()
    )
  );

CREATE POLICY "questions: users can insert own rows"
  ON questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM question_sets qs
      WHERE qs.id = questions.question_set_id
        AND qs.user_id = auth.uid()
    )
  );

CREATE POLICY "questions: users can update own rows"
  ON questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM question_sets qs
      WHERE qs.id = questions.question_set_id
        AND qs.user_id = auth.uid()
    )
  );

CREATE POLICY "questions: users can delete own rows"
  ON questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM question_sets qs
      WHERE qs.id = questions.question_set_id
        AND qs.user_id = auth.uid()
    )
  );


-- ============================================================
-- TABLE: exports
-- Export history
-- ============================================================
CREATE TABLE exports (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  question_set_id  UUID        NOT NULL REFERENCES question_sets(id)   ON DELETE CASCADE,
  format           TEXT        DEFAULT 'docx'
                     CHECK (format IN ('docx', 'hwpx', 'pdf')),
  file_url         TEXT,
  options          JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exports_user_id         ON exports (user_id);
CREATE INDEX idx_exports_question_set_id ON exports (question_set_id);
CREATE INDEX idx_exports_created_at      ON exports (created_at DESC);

ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exports: users can read own rows"
  ON exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exports: users can insert own rows"
  ON exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exports: users can delete own rows"
  ON exports FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- TABLE: usage_logs
-- API usage tracking
-- ============================================================
CREATE TABLE usage_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action       TEXT        NOT NULL,   -- structurize | generate | export | validate
  tokens_used  INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_user_id    ON usage_logs (user_id);
CREATE INDEX idx_usage_logs_action     ON usage_logs (action);
CREATE INDEX idx_usage_logs_created_at ON usage_logs (created_at DESC);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_logs: users can read own rows"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "usage_logs: users can insert own rows"
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
