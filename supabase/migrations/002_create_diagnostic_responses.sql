-- Diagnostic Responses 테이블 생성
DROP TABLE IF EXISTS diagnostic_responses CASCADE;

CREATE TABLE diagnostic_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  question_id TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  weight DECIMAL(3,2) DEFAULT 1.0,
  risk_factor TEXT CHECK (risk_factor IN ('Fp', 'Oc', 'Ch')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, question_id)
);

-- RLS 비활성화 (개발용)
ALTER TABLE diagnostic_responses DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_diagnostic_responses_project ON diagnostic_responses(project_id);
