-- ================================================================
-- CHECK-IN 체키 — MASTER SCHEMA v2.0
-- 기존 스키마 위에 추가. 기존 테이블 절대 수정 금지.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. AI 자동 체크 결과 (사진 → GO/NO-GO)
CREATE TABLE IF NOT EXISTS ai_check_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  photo_url         TEXT NOT NULL,
  detected_process  TEXT,
  go_no_go          TEXT CHECK (go_no_go IN ('GO','NO-GO','CONDITIONAL')),
  check_items       JSONB DEFAULT '[]',
  issues            JSONB DEFAULT '[]',
  requires_review   JSONB DEFAULT '[]',
  confidence        NUMERIC DEFAULT 0,
  model_used        TEXT DEFAULT 'gemini',
  human_confirmed   BOOLEAN DEFAULT FALSE,
  confirmed_by      UUID,
  confirmed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_check_project ON ai_check_results(project_id);
ALTER TABLE ai_check_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "ai_check_member" ON ai_check_results
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 2. 하자담보 자동 추적 (건산법 시행령 별표4 기준)
CREATE TABLE IF NOT EXISTS warranty_tracking (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  process_name      TEXT NOT NULL,
  completion_date   DATE NOT NULL,
  warranty_years    INTEGER NOT NULL,
  expiry_date       DATE,
  status            TEXT DEFAULT '정상' CHECK (status IN ('정상','만료임박','만료','하자접수중')),
  alert_sent_30d    BOOLEAN DEFAULT FALSE,
  alert_sent_7d     BOOLEAN DEFAULT FALSE,
  law_basis         TEXT DEFAULT '건산법 시행령 별표4',
  notes             TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
-- 공종별 법정 기간: 방수 3년 / 타일 1년 / 도장 1년 / 전기·설비 2년 / 목공 1년
CREATE INDEX IF NOT EXISTS idx_warranty_project ON warranty_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_warranty_expiry ON warranty_tracking(expiry_date);
ALTER TABLE warranty_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "warranty_member" ON warranty_tracking
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 3. 분쟁 징후 감지 (특허 핵심 기능)
CREATE TABLE IF NOT EXISTS dispute_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  signal_type       TEXT NOT NULL,
  -- communication_breakdown | cost_dispute | delay_pattern | quality_complaint | contract_violation
  risk_level        TEXT CHECK (risk_level IN ('LOW','MED','HIGH','CRITICAL')),
  description       TEXT NOT NULL,
  evidence          JSONB DEFAULT '[]',
  related_law       TEXT,
  related_case      TEXT,
  recommended_action TEXT,
  is_resolved       BOOLEAN DEFAULT FALSE,
  resolved_at       TIMESTAMPTZ,
  notified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispute_project ON dispute_signals(project_id);
CREATE INDEX IF NOT EXISTS idx_dispute_risk ON dispute_signals(risk_level);
ALTER TABLE dispute_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "dispute_member" ON dispute_signals
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 4. 체키 자동 알림 (프로액티브 AI 비서)
CREATE TABLE IF NOT EXISTS proactive_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL,
  type              TEXT NOT NULL,
  -- warranty_expiry | dispute_signal | checklist_incomplete | payment_due | process_delay
  title             TEXT NOT NULL,
  message           TEXT NOT NULL,
  action_url        TEXT,
  priority          TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  is_read           BOOLEAN DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  auto_generated    BOOLEAN DEFAULT TRUE,
  source_table      TEXT,
  source_id         UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON proactive_notifications(user_id, is_read);
ALTER TABLE proactive_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "notif_self" ON proactive_notifications
  FOR ALL USING (user_id = auth.uid());

-- 5. 판례 지식베이스
CREATE TABLE IF NOT EXISTS case_law (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  court             TEXT NOT NULL,
  decision_date     DATE,
  case_type         TEXT NOT NULL,
  -- 하자담보 | 추가공사 | 계약금 | 자재변경 | 대금미지급 | 공기지연
  process           TEXT,
  result            TEXT,
  summary           TEXT NOT NULL,
  key_point         TEXT NOT NULL,
  law_basis         TEXT,
  compensation      BIGINT DEFAULT 0,
  lesson            TEXT,
  keywords          JSONB DEFAULT '[]',
  embedding         vector(768),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_type ON case_law(case_type);
ALTER TABLE case_law ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "case_law_read" ON case_law
  FOR SELECT USING (auth.role() = 'authenticated');

-- 6. 법규 지식베이스 (pgvector RAG)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content           TEXT NOT NULL,
  embedding         vector(768),
  source            TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN ('law','process','defect','material','contract','safety')),
  law_name          TEXT,
  article           TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "knowledge_read" ON knowledge_chunks
  FOR SELECT USING (auth.role() = 'authenticated');

-- 7. 현장 일보
CREATE TABLE IF NOT EXISTS daily_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  report_date       DATE NOT NULL,
  completed_work    TEXT,
  planned_work      TEXT,
  issues_summary    TEXT,
  workers_count     INTEGER DEFAULT 0,
  weather           TEXT,
  ai_drafted        BOOLEAN DEFAULT TRUE,
  draft_content     JSONB DEFAULT '{}',
  confirmed_by      UUID,
  confirmed_at      TIMESTAMPTZ,
  photo_urls        JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, report_date)
);
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "report_member" ON daily_reports
  FOR ALL USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 8. 업체 신뢰 배지
CREATE TABLE IF NOT EXISTS contractor_badges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE,
  completed_projects INTEGER DEFAULT 0,
  avg_checklist_score NUMERIC DEFAULT 0,
  dispute_count     INTEGER DEFAULT 0,
  on_time_rate      NUMERIC DEFAULT 0,
  quality_score     NUMERIC DEFAULT 0,
  badge_level       TEXT DEFAULT 'none' CHECK (badge_level IN ('none','bronze','silver','gold','platinum')),
  last_calculated   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 9. quote_analyses 컬럼 추가 (AI 예산 가이드)
ALTER TABLE quote_analyses
  ADD COLUMN IF NOT EXISTS space_type TEXT,
  ADD COLUMN IF NOT EXISTS space_detail TEXT,
  ADD COLUMN IF NOT EXISTS area_pyeong NUMERIC,
  ADD COLUMN IF NOT EXISTS material_grade TEXT,
  ADD COLUMN IF NOT EXISTS schedule_urgency TEXT,
  ADD COLUMN IF NOT EXISTS grade_economy JSONB,
  ADD COLUMN IF NOT EXISTS grade_standard JSONB,
  ADD COLUMN IF NOT EXISTS grade_premium JSONB,
  ADD COLUMN IF NOT EXISTS hidden_costs JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS why_expensive JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS why_cheap_risks JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS payment_terms JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_budget_guide BOOLEAN DEFAULT TRUE;
