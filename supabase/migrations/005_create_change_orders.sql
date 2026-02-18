-- Change Orders 테이블 생성
DROP TABLE IF EXISTS change_orders CASCADE;

CREATE TABLE change_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  change_type TEXT NOT NULL DEFAULT 'scope',
  cost_change INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'requested',
  requested_by TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화
ALTER TABLE change_orders DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_change_orders_project ON change_orders(project_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);
