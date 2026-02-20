-- Check-In v2.0 Schema Migration
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- [선택] v3.1 knowledge_chunks 3072-dim 업그레이드
-- 현재 DB: vector(768) | 업그레이드 목표: vector(3072)
-- 실행 전 주의: 기존 임베딩 데이터 전체 삭제됨 → seed 재실행 필요
-- ═══════════════════════════════════════════════════════════

-- STEP 1: 기존 인덱스 삭제
-- DROP INDEX IF EXISTS knowledge_chunks_embedding_idx;

-- STEP 2: embedding 컬럼 3072-dim으로 재생성
-- ALTER TABLE knowledge_chunks DROP COLUMN embedding;
-- ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(3072);

-- STEP 3: 새 인덱스 생성
-- CREATE INDEX knowledge_chunks_embedding_idx
--   ON knowledge_chunks
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);

-- STEP 4: match_knowledge_chunks RPC 함수 재생성
-- CREATE OR REPLACE FUNCTION match_knowledge_chunks(
--   query_embedding vector(3072),
--   match_threshold float DEFAULT 0.65,
--   match_count int DEFAULT 5,
--   filter_category text DEFAULT NULL
-- )
-- RETURNS TABLE (
--   id UUID, content TEXT, source TEXT, category TEXT,
--   metadata JSONB, similarity FLOAT
-- )
-- LANGUAGE plpgsql AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT kc.id, kc.content, kc.source, kc.category, kc.metadata,
--          1 - (kc.embedding <=> query_embedding) AS similarity
--   FROM knowledge_chunks kc
--   WHERE (filter_category IS NULL OR kc.category = filter_category)
--     AND 1 - (kc.embedding <=> query_embedding) > match_threshold
--   ORDER BY similarity DESC
--   LIMIT match_count;
-- END;
-- $$;

-- STEP 5: 위 SQL 실행 후 seed 스크립트에서 outputDimensionality: 3072으로 변경 후 재실행
-- 또한 retriever.ts의 embedContent 호출에 outputDimensionality: 3072 추가


-- ═══════════════════════════════════════════════════════════
-- v3.0 분쟁 예방 AI 테이블 (아래 SQL을 Supabase SQL Editor에서 실행)
-- ═══════════════════════════════════════════════════════════

-- 분쟁 징후 자동 기록
CREATE TABLE IF NOT EXISTS dispute_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  signal_type TEXT NOT NULL,
  -- verbal_agreement / additional_cost / abandonment_risk
  -- quality_issue / delay / subcontractor_wage / no_contract
  description TEXT NOT NULL,
  detected_from TEXT DEFAULT 'chat', -- chat / checklist / change_order
  source_text TEXT,                  -- 감지된 원문 텍스트
  legal_basis TEXT,                  -- 관련 법조문
  recommended_action TEXT,           -- 권장 조치
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 견적 과다청구 분석 결과
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

-- 하자담보기간 추적
CREATE TABLE IF NOT EXISTS warranty_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  process_name TEXT NOT NULL,           -- 타일, 방수, 도장 등
  completed_date DATE NOT NULL,
  warranty_period_months INTEGER NOT NULL, -- 12, 36, 120
  warranty_expires_date DATE,           -- completed_date + warranty_period_months 개월
  reminder_sent_30d BOOLEAN DEFAULT FALSE,
  reminder_sent_7d BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- warranty_expires_date 자동 계산 트리거
CREATE OR REPLACE FUNCTION calc_warranty_expires()
RETURNS TRIGGER AS $$
BEGIN
  NEW.warranty_expires_date := NEW.completed_date + (NEW.warranty_period_months || ' months')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_warranty_expires ON warranty_tracking;
CREATE TRIGGER trg_warranty_expires
  BEFORE INSERT OR UPDATE ON warranty_tracking
  FOR EACH ROW EXECUTE FUNCTION calc_warranty_expires();

-- 계약 전 체크리스트
CREATE TABLE IF NOT EXISTS pre_contract_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  license_verified BOOLEAN DEFAULT FALSE,     -- 면허 확인 (키스콘)
  license_number TEXT,                        -- 키스콘 면허번호
  contract_written BOOLEAN DEFAULT FALSE,     -- 서면 계약서 작성
  deposit_ratio_ok BOOLEAN DEFAULT FALSE,     -- 계약금 10% 이하
  warranty_insurance BOOLEAN DEFAULT FALSE,   -- 하자이행보증보험
  standard_contract_used BOOLEAN DEFAULT FALSE, -- 표준계약서 사용
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE dispute_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_contract_checks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dispute_signals' AND policyname = 'dispute_signals_user') THEN
    CREATE POLICY dispute_signals_user ON dispute_signals
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quote_analyses' AND policyname = 'quote_analyses_owner') THEN
    CREATE POLICY quote_analyses_owner ON quote_analyses
      USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warranty_tracking' AND policyname = 'warranty_tracking_owner') THEN
    CREATE POLICY warranty_tracking_owner ON warranty_tracking
      USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_contract_checks' AND policyname = 'pre_contract_checks_owner') THEN
    CREATE POLICY pre_contract_checks_owner ON pre_contract_checks
      USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_dispute_signals_project ON dispute_signals(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_signals_user ON dispute_signals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_analyses_project ON quote_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_warranty_expires ON warranty_tracking(warranty_expires_date);
CREATE INDEX IF NOT EXISTS idx_warranty_project ON warranty_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_pre_contract_project ON pre_contract_checks(project_id);

-- defects - photos 컬럼 추가
ALTER TABLE defects ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';

-- defects - sha256_hash 컬럼 추가
ALTER TABLE defects ADD COLUMN IF NOT EXISTS sha256_hash VARCHAR(64);

-- defects - updated_at 컬럼 추가
ALTER TABLE defects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- notifications - link 컬럼 추가
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(500);

-- shares - is_active 컬럼 추가
ALTER TABLE shares ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- shares - view_count 컬럼 추가
ALTER TABLE shares ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- shares - updated_at 컬럼 추가
ALTER TABLE shares ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- profiles - company_name 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);

-- profiles - description 컬럼 추가 (company)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description TEXT;

-- profiles - specialty_tags 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty_tags JSONB DEFAULT '[]';

-- profiles - address 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- profiles - logo_url 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- profiles - portfolio_images 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_images JSONB DEFAULT '[]';

-- profiles - avg_verification_score 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_verification_score FLOAT DEFAULT 0;

-- profiles - total_projects 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_projects INTEGER DEFAULT 0;

-- profiles - avg_duration_days 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_duration_days INTEGER DEFAULT 0;

-- profiles - profile_token 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_token VARCHAR(32) UNIQUE;

-- profiles - is_public 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;


-- ═══════════════════════════════════════════════════════════
-- v4.0 프로액티브 AI 비서 테이블
-- 체키가 먼저 감지하고 먼저 알린다.
-- ═══════════════════════════════════════════════════════════

-- 프로액티브 알림 기록 (체키가 자동 감지해서 생성)
CREATE TABLE IF NOT EXISTS proactive_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  -- WARRANTY_EXPIRING / AI_CHECK_PENDING / DISPUTE_UNRESOLVED
  -- PROCESS_NEXT_STEP / DAILY_REPORT_MISSING
  severity TEXT NOT NULL DEFAULT 'INFO', -- CRITICAL / WARNING / INFO
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 브리핑 기록 (앱 진입 시 생성)
CREATE TABLE IF NOT EXISTS ai_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date DATE DEFAULT CURRENT_DATE,
  briefing_text TEXT NOT NULL,
  notification_count INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  info_count INTEGER DEFAULT 0,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 행동 가이드 조회 기록 (어떤 상황 가이드를 많이 보는지 분석용)
CREATE TABLE IF NOT EXISTS action_guide_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  situation TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE proactive_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_guide_views ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proactive_notifications' AND policyname = 'proactive_notifications_user') THEN
    CREATE POLICY proactive_notifications_user ON proactive_notifications
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_briefings' AND policyname = 'ai_briefings_user') THEN
    CREATE POLICY ai_briefings_user ON ai_briefings
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'action_guide_views' AND policyname = 'action_guide_views_user') THEN
    CREATE POLICY action_guide_views_user ON action_guide_views
      USING (user_id = auth.uid());
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_proactive_user ON proactive_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proactive_unread ON proactive_notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_proactive_project ON proactive_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_briefings_user_date ON ai_briefings(user_id, briefing_date DESC);
CREATE INDEX IF NOT EXISTS idx_action_guide_user ON action_guide_views(user_id, created_at DESC);


-- Indexes
CREATE INDEX IF NOT EXISTS idx_defects_project ON defects(project_id);
CREATE INDEX IF NOT EXISTS idx_defects_status ON defects(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(share_token);
CREATE INDEX IF NOT EXISTS idx_profiles_token ON profiles(profile_token);

-- RLS Policies
-- shares public read

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shares' AND policyname = 'shares_public_read') THEN
    CREATE POLICY shares_public_read ON shares FOR SELECT USING (is_active = true AND expires_at > now());
  END IF;
END $$;

-- profiles public read

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_public_read') THEN
    CREATE POLICY profiles_public_read ON profiles FOR SELECT USING (is_public = true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 1순위: AI 예산 가이드 — quote_analyses 컬럼 확장
-- ═══════════════════════════════════════════════════════════

-- quote_analyses에 예산 가이드 전용 컬럼 추가
ALTER TABLE quote_analyses
  ADD COLUMN IF NOT EXISTS space_type TEXT,
  ADD COLUMN IF NOT EXISTS space_detail TEXT,
  ADD COLUMN IF NOT EXISTS area_pyeong NUMERIC,
  ADD COLUMN IF NOT EXISTS grade_economy JSONB,
  ADD COLUMN IF NOT EXISTS grade_standard JSONB,
  ADD COLUMN IF NOT EXISTS grade_premium JSONB,
  ADD COLUMN IF NOT EXISTS why_expensive JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS why_cheap_risks JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS hidden_costs JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_budget_guide BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- user_id RLS 정책 추가 (독립형 예산 가이드 — project_id 없을 수 있음)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quote_analyses' AND policyname = 'quote_analyses_user_direct') THEN
    CREATE POLICY quote_analyses_user_direct ON quote_analyses
      FOR ALL USING (user_id = auth.uid() OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quote_analyses_user ON quote_analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_analyses_space ON quote_analyses(space_type);

-- ═══════════════════════════════════════════════════════════
-- 2순위: 현장 이슈 소통 시스템 — site_issues 테이블
-- ═══════════════════════════════════════════════════════════

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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_issues' AND policyname = 'site_issues_user') THEN
    CREATE POLICY site_issues_user ON site_issues
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_site_issues_user ON site_issues(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_issues_project ON site_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_site_issues_status ON site_issues(status) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_site_issues_severity ON site_issues(severity) WHERE status != 'resolved';

