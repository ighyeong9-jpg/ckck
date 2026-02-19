-- ============================================================
-- Check-In AI Brain — pgvector 마이그레이션
-- STEP 1: 지식베이스 + AI 체크 결과 테이블
-- ============================================================

-- 1. pgvector 확장 설치
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 지식 청크 테이블 (RAG 벡터 검색용)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT NOT NULL,
  embedding   vector(768),
  source      TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (
    category IN ('law', 'process', 'defect', 'material', 'contract', 'safety')
  ),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 벡터 인덱스 (코사인 유사도)
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS knowledge_chunks_category_idx
  ON knowledge_chunks(category);

-- 4. AI 자동 체크 결과 저장 테이블
CREATE TABLE IF NOT EXISTS ai_check_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID REFERENCES projects(id) ON DELETE CASCADE,
  photo_url        TEXT,
  detected_process TEXT,
  go_no_go         TEXT CHECK (go_no_go IN ('GO', 'NO-GO', 'CONDITIONAL')),
  check_items      JSONB DEFAULT '[]',
  issues           JSONB DEFAULT '[]',
  human_confirmed  BOOLEAN DEFAULT FALSE,
  confirmed_by     UUID,
  confirmed_at     TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_check_results_project_idx
  ON ai_check_results(project_id);

CREATE INDEX IF NOT EXISTS ai_check_results_unconfirmed_idx
  ON ai_check_results(project_id, human_confirmed)
  WHERE human_confirmed = FALSE;
