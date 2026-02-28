-- SUPABASE-ISSUES-TABLE.sql
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS site_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_text TEXT NOT NULL,
  reporter_note TEXT,
  -- AI 분류 결과
  category TEXT NOT NULL DEFAULT 'other',
  -- safety|quality|cost|schedule|legal|material|labor|weather|design_change|other
  severity TEXT NOT NULL DEFAULT 'medium',
  -- critical|high|medium|low
  title TEXT NOT NULL DEFAULT '현장 이슈',
  summary TEXT,
  recommended_actions JSONB DEFAULT '[]',
  legal_basis TEXT,
  cost_impact TEXT,
  schedule_impact TEXT,
  requires_approval BOOLEAN DEFAULT FALSE,
  urgency_hours INTEGER DEFAULT 48,
  -- 처리 상태
  status TEXT NOT NULL DEFAULT 'open',
  -- open|reviewing|approved|rejected|resolved
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolve_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_issues ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 자신의 이슈만 조회/수정 가능
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_issues' AND policyname = 'site_issues_user') THEN
    CREATE POLICY site_issues_user ON site_issues
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_site_issues_user ON site_issues(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_issues_project ON site_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_site_issues_status ON site_issues(status);
