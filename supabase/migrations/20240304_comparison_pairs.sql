-- 공사 전후 비교 테이블
CREATE TABLE IF NOT EXISTS comparison_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  before_photo_id UUID NOT NULL REFERENCES evidence_files(id) ON DELETE CASCADE,
  after_photo_id UUID NOT NULL REFERENCES evidence_files(id) ON DELETE CASCADE,

  -- 기본 정보
  title TEXT NOT NULL,
  change_note TEXT,

  -- 승인 정보
  client_approved BOOLEAN DEFAULT FALSE,
  client_approved_at TIMESTAMPTZ,
  client_signature TEXT,

  contractor_approved BOOLEAN DEFAULT FALSE,
  contractor_approved_at TIMESTAMPTZ,
  contractor_signature TEXT,

  supervisor_approved BOOLEAN DEFAULT FALSE,
  supervisor_approved_at TIMESTAMPTZ,

  -- 주석 정보 (JSON)
  annotations JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_comparison_pairs_project ON comparison_pairs(project_id);
CREATE INDEX IF NOT EXISTS idx_comparison_pairs_created ON comparison_pairs(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE comparison_pairs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 프로젝트 소유자만 접근 가능
CREATE POLICY "Users can view their own comparison pairs"
  ON comparison_pairs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own comparison pairs"
  ON comparison_pairs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comparison pairs"
  ON comparison_pairs FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comparison pairs"
  ON comparison_pairs FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_comparison_pairs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comparison_pairs_updated_at
  BEFORE UPDATE ON comparison_pairs
  FOR EACH ROW
  EXECUTE FUNCTION update_comparison_pairs_updated_at();
