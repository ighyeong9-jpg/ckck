-- ============================================================
-- Check-In 법령 룰 엔진 + 리스크 점수 이력 + 하자담보 테이블
-- Migration: 20260226_add_law_engine_tables.sql
-- Supabase SQL Editor에서 실행
-- ============================================================

-- ============================================================
-- 1. laws (법령 마스터)
-- ============================================================
CREATE TABLE IF NOT EXISTS laws (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50)  NOT NULL UNIQUE,          -- 예: CONST_BASIC_28
  name        VARCHAR(200) NOT NULL,                  -- 예: 건설산업기본법
  article     VARCHAR(100) NOT NULL,                  -- 예: 제28조
  title       VARCHAR(300) NOT NULL,                  -- 예: 하자담보책임
  description TEXT         NOT NULL,                  -- 조문 내용 요약
  check_conditions  JSONB  NOT NULL DEFAULT '{}',     -- 체크 조건 JSON
  violation_action  TEXT   NOT NULL DEFAULT '',       -- 위반 시 권장 액션
  risk_weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,      -- 위반 시 리스크 가중치
  category    VARCHAR(50)  NOT NULL                   -- safety|quality|contract|dispute|warranty
    CHECK (category IN ('safety','quality','contract','dispute','warranty')),
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  sort_order  INTEGER      NOT NULL DEFAULT 0,        -- 1~12 정렬
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laws_code     ON laws(code);
CREATE INDEX IF NOT EXISTS idx_laws_category ON laws(category);
CREATE INDEX IF NOT EXISTS idx_laws_active   ON laws(is_active);

-- RLS 비활성화 (공개 마스터 데이터)
ALTER TABLE laws DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. law_checks (법령 체크 결과 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS law_checks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  law_id      UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('compliant','violated','not_applicable','pending')),
  go_nogo     VARCHAR(10) NOT NULL DEFAULT 'pending'
    CHECK (go_nogo IN ('go','nogo','pending')),
  details     JSONB,                                  -- 판정 상세 근거
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_by  VARCHAR(20) NOT NULL DEFAULT 'system'
    CHECK (checked_by IN ('system','ai','manual'))
);

CREATE INDEX IF NOT EXISTS idx_law_checks_project    ON law_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_law_checks_law        ON law_checks(law_id);
CREATE INDEX IF NOT EXISTS idx_law_checks_status     ON law_checks(status);
CREATE INDEX IF NOT EXISTS idx_law_checks_project_law ON law_checks(project_id, law_id);

-- RLS 비활성화
ALTER TABLE law_checks DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. risk_scores (리스크 점수 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade         VARCHAR(10) NOT NULL
    CHECK (grade IN ('safe','caution','warning','danger')),
  fp_score      DECIMAL(6,2) NOT NULL DEFAULT 0,       -- 법령 준수 점수 (Fp)
  fp_weight     DECIMAL(4,2) NOT NULL DEFAULT 0.45,    -- 법령 가중치 (Wf)
  oc_score      DECIMAL(6,2) NOT NULL DEFAULT 0,       -- 공정 관리 점수 (Oc)
  oc_weight     DECIMAL(4,2) NOT NULL DEFAULT 0.25,    -- 공정 가중치 (Wo)
  ch_score      DECIMAL(6,2) NOT NULL DEFAULT 0,       -- 체크리스트 점수 (Ch)
  ch_weight     DECIMAL(4,2) NOT NULL DEFAULT 0.30,    -- 체크리스트 가중치 (Wc)
  details       JSONB,                                  -- 상세 계산 내역
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_project   ON risk_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_calc_at   ON risk_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scores_grade     ON risk_scores(grade);

-- RLS 비활성화
ALTER TABLE risk_scores DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. warranties (하자담보)
-- ============================================================
CREATE TABLE IF NOT EXISTS warranties (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  law_id              UUID REFERENCES laws(id),        -- 근거 법령 (선택)
  category            VARCHAR(100) NOT NULL,            -- 공종: 방수공사, 타일공사 등
  start_date          DATE NOT NULL,                   -- 담보 시작일 (준공일)
  end_date            DATE NOT NULL,                   -- 담보 만료일
  duration_years      INTEGER NOT NULL,                 -- 담보 기간 (년)
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expiring_soon','expired','claimed')),
  alert_30d_sent      BOOLEAN NOT NULL DEFAULT false,   -- 30일전 알림 발송 여부
  alert_7d_sent       BOOLEAN NOT NULL DEFAULT false,   -- 7일전 알림 발송 여부
  alert_expired_sent  BOOLEAN NOT NULL DEFAULT false,   -- 만료 알림 발송 여부
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranties_project    ON warranties(project_id);
CREATE INDEX IF NOT EXISTS idx_warranties_end_date   ON warranties(end_date);
CREATE INDEX IF NOT EXISTS idx_warranties_status     ON warranties(status);

-- RLS 비활성화
ALTER TABLE warranties DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. evidence_files 컬럼 추가
--    (기존 테이블에 merkle_root, ai_check_result 추가)
-- ============================================================
ALTER TABLE evidence_files
  ADD COLUMN IF NOT EXISTS merkle_root     VARCHAR(64),
  ADD COLUMN IF NOT EXISTS ai_check_result JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_evidence     BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_evidence_files_hash       ON evidence_files(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_files_is_evidence ON evidence_files(is_evidence);

-- ============================================================
-- 완료 확인 쿼리 (실행 후 아래로 확인)
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('laws','law_checks','risk_scores','warranties')
-- ORDER BY table_name;
