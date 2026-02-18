-- Cost Analysis 테이블 생성
DROP TABLE IF EXISTS cost_analysis CASCADE;

CREATE TABLE cost_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  base_cost INTEGER NOT NULL DEFAULT 0,
  -- 위험 요인별 가중치 (0~1 사이 값)
  complexity_weight DECIMAL(3,2) DEFAULT 0.15,
  complexity_factor DECIMAL(3,2) DEFAULT 0,
  timeline_weight DECIMAL(3,2) DEFAULT 0.10,
  timeline_factor DECIMAL(3,2) DEFAULT 0,
  material_weight DECIMAL(3,2) DEFAULT 0.12,
  material_factor DECIMAL(3,2) DEFAULT 0,
  labor_weight DECIMAL(3,2) DEFAULT 0.08,
  labor_factor DECIMAL(3,2) DEFAULT 0,
  risk_weight DECIMAL(3,2) DEFAULT 0.10,
  risk_factor DECIMAL(3,2) DEFAULT 0,
  -- 계산 결과
  adjustment_rate DECIMAL(5,4) DEFAULT 0,
  adjusted_cost INTEGER DEFAULT 0,
  cost_difference INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화
ALTER TABLE cost_analysis DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_cost_analysis_project ON cost_analysis(project_id);
