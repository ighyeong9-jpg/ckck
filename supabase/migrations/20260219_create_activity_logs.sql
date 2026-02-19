-- ============================================================
-- activity_logs 테이블 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,           -- 'project_created', 'process_completed', 'checklist_saved', etc.
  target_type TEXT,                    -- 'project', 'process', 'diagnostic', 'change_order', etc.
  target_id   TEXT,                    -- 대상 레코드 ID
  meta        JSONB DEFAULT '{}',      -- 추가 정보 (이름, 상태 변경 등)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user      ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project   ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created   ON activity_logs(created_at DESC);

-- RLS 설정
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- user_settings: subscription_plan 컬럼 추가
-- ============================================================

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';

-- ============================================================
-- notebooks 테이블 생성 (NotebookLM 기능)
-- ============================================================

CREATE TABLE IF NOT EXISTS notebooks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  file_name    TEXT NOT NULL,
  mime_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size    INTEGER,
  doc_type     TEXT NOT NULL DEFAULT 'other', -- 'contract', 'drawing', 'photo', 'report', 'estimate', 'other'
  user_note    TEXT,
  summary      TEXT,
  key_findings JSONB DEFAULT '[]',
  risk_flags   JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  confidence   REAL DEFAULT 0,
  model        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notebooks_user      ON notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_project   ON notebooks(project_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_created   ON notebooks(created_at DESC);

ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notebooks"
  ON notebooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notebooks"
  ON notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notebooks"
  ON notebooks FOR DELETE
  USING (auth.uid() = user_id);
