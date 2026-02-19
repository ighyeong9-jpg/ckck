-- ============================================================
-- 누락 컬럼 추가 (코드-DB 불일치 해소)
-- ============================================================

-- projects: industry 컬럼
ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'general';

-- user_settings: subscription_plan 컬럼
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';

-- processes: order_index alias (sort_order와 동일하게 사용 중)
-- order_index 컬럼이 없으면 sort_order를 사용하는 코드 호환을 위해 추가
ALTER TABLE processes ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- change_orders: 'pending' 상태 허용 (코드에서 'pending'으로 조회)
-- 기존 default는 'requested'이므로 기존 데이터 유지, 새 코드는 'pending' 직접 사용

-- knowledge_chunks: 이미 있지만 vector 타입이 768→3072으로 변경되었으므로 확인용 주석
-- 실제 타입 변경은 20260219_fix_embedding_dimension.sql에서 처리됨

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_projects_industry ON projects(industry);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_risk_score ON projects(risk_score);
