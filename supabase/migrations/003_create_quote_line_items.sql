-- Quote Line Items 테이블 생성
DROP TABLE IF EXISTS quote_line_items CASCADE;

CREATE TABLE quote_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  specification TEXT,
  unit TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  amount INTEGER GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화 (개발용)
ALTER TABLE quote_line_items DISABLE ROW LEVEL SECURITY;

-- 인덱스
CREATE INDEX idx_quote_line_items_project ON quote_line_items(project_id);
CREATE INDEX idx_quote_line_items_sort ON quote_line_items(project_id, sort_order);
