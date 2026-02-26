-- 프로젝트 테이블 신규 컬럼 추가
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS budget BIGINT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE;

COMMENT ON COLUMN projects.address IS '현장 주소';
COMMENT ON COLUMN projects.budget IS '예상 공사비 (원 단위)';
COMMENT ON COLUMN projects.description IS '현장 설명';
COMMENT ON COLUMN projects.actual_end_date IS '실제 완료일 (공사 완료 처리 시 자동 입력)';

-- 하자담보 테이블
CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trade_type TEXT NOT NULL,
  trade_label TEXT NOT NULL,
  duration_years INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS warranties_project_id_idx ON warranties(project_id);
CREATE INDEX IF NOT EXISTS warranties_end_date_idx ON warranties(end_date);
