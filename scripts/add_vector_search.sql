-- ============================================================
-- Check-In AI Brain — pgvector 마이그레이션
-- STEP 1: 지식베이스 + AI 체크 결과 테이블
-- ============================================================
-- Supabase SQL Editor에서 실행하거나
-- psql로 직접 실행: psql $DATABASE_URL -f scripts/add_vector_search.sql
-- ============================================================

-- 1. pgvector 확장 설치
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 지식 청크 테이블 (RAG 벡터 검색용)
--    embedding 차원: 768 (text-embedding-004 기준)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT NOT NULL,
  embedding   vector(768),
  source      TEXT NOT NULL,         -- 출처 (예: "중대재해처벌법 제4조")
  category    TEXT NOT NULL CHECK (
    category IN ('law', 'process', 'defect', 'material', 'contract', 'safety')
  ),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 벡터 인덱스 (IVFFlat, 코사인 유사도)
--    lists = 100: 청크 수 / 10 권장. 1000개 이하면 lists=10도 무방
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. 카테고리 인덱스 (필터링 속도)
CREATE INDEX IF NOT EXISTS knowledge_chunks_category_idx
  ON knowledge_chunks(category);

-- 5. AI 자동 체크 결과 저장 테이블
--    사람이 확인 전까지 human_confirmed = false
CREATE TABLE IF NOT EXISTS ai_check_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID REFERENCES projects(id) ON DELETE CASCADE,
  photo_url        TEXT,
  detected_process TEXT,             -- 감지된 공종 (예: "타일 시공")
  go_no_go         TEXT CHECK (go_no_go IN ('GO', 'NO-GO', 'CONDITIONAL')),
  check_items      JSONB DEFAULT '[]', -- CheckResult[] 배열
  issues           JSONB DEFAULT '[]', -- 발견된 문제 목록
  human_confirmed  BOOLEAN DEFAULT FALSE,
  confirmed_by     UUID,             -- 확인한 사용자 ID
  confirmed_at     TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ai_check_results 인덱스
CREATE INDEX IF NOT EXISTS ai_check_results_project_idx
  ON ai_check_results(project_id);

CREATE INDEX IF NOT EXISTS ai_check_results_unconfirmed_idx
  ON ai_check_results(project_id, human_confirmed)
  WHERE human_confirmed = FALSE;

-- ============================================================
-- 실행 확인 쿼리
-- ============================================================
-- SELECT extname FROM pg_extension WHERE extname = 'vector';
-- SELECT COUNT(*) FROM knowledge_chunks;
-- SELECT COUNT(*) FROM ai_check_results;
