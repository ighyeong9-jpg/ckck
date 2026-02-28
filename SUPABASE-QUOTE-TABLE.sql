-- SUPABASE-QUOTE-TABLE.sql
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS quote_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  total_amount INTEGER,
  overcharge_items JSONB DEFAULT '[]',
  -- [{item_name, quoted_price, market_price, difference_pct, risk_level}]
  undercharge_items JSONB DEFAULT '[]',
  overall_risk TEXT DEFAULT 'LOW', -- LOW / MEDIUM / HIGH
  ai_comment TEXT
);

ALTER TABLE quote_analyses ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 프로젝트 소유자만 조회/수정 가능
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quote_analyses' AND policyname = 'quote_analyses_owner') THEN
    CREATE POLICY quote_analyses_owner ON quote_analyses
      FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_quote_analyses_project ON quote_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_quote_analyses_date ON quote_analyses(analyzed_at DESC);
