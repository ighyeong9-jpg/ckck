-- Reports 테이블 생성 (리포트 이력)
DROP TABLE IF EXISTS reports CASCADE;

CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'summary',
  title TEXT NOT NULL,
  -- 스냅샷 데이터
  diagnostic_score INTEGER,
  diagnostic_data JSONB,
  quote_subtotal INTEGER,
  quote_vat INTEGER,
  quote_total INTEGER,
  quote_item_count INTEGER,
  cost_base INTEGER,
  cost_adjusted INTEGER,
  cost_difference INTEGER,
  -- 메타데이터
  generated_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_reports_project ON reports(project_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
