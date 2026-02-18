-- =============================================
-- Check-In AI 검증 인증서 테이블
-- Supabase SQL Editor에서 실행
-- =============================================

CREATE TABLE IF NOT EXISTS verification_certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- 인증서 고유 코드
  code VARCHAR(20) NOT NULL UNIQUE,  -- CHK-2026-XXXXX

  -- 점수 및 등급
  total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  grade VARCHAR(2) NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),

  -- 4개 세부 점수 (각 25점 만점)
  cost_score INTEGER NOT NULL DEFAULT 0 CHECK (cost_score >= 0 AND cost_score <= 25),
  process_score INTEGER NOT NULL DEFAULT 0 CHECK (process_score >= 0 AND process_score <= 25),
  contract_score INTEGER NOT NULL DEFAULT 0 CHECK (contract_score >= 0 AND contract_score <= 25),
  schedule_score INTEGER NOT NULL DEFAULT 0 CHECK (schedule_score >= 0 AND schedule_score <= 25),

  -- 프로젝트 스냅샷 (발급 시점 기록)
  project_name VARCHAR(200) NOT NULL,
  industry VARCHAR(50),
  client_name VARCHAR(200),

  -- 상태 관리
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),

  -- 배지 자격 (70점 이상이면 true)
  badge_eligible BOOLEAN NOT NULL DEFAULT false,

  -- 날짜
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- 감사 로그
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_certificates_code ON verification_certificates(code);
CREATE INDEX IF NOT EXISTS idx_certificates_project ON verification_certificates(project_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON verification_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON verification_certificates(status);

-- 코드 고유성 보장 (이미 UNIQUE 제약이 있지만 명시적으로)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_code_unique ON verification_certificates(code);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_verification_updated_at ON verification_certificates;
CREATE TRIGGER trigger_verification_updated_at
  BEFORE UPDATE ON verification_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_updated_at();

-- 만료 자동 체크를 위한 함수 (선택사항 - cron job으로 실행 가능)
CREATE OR REPLACE FUNCTION expire_old_certificates()
RETURNS void AS $$
BEGIN
  UPDATE verification_certificates
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;
