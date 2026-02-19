-- ============================================================
-- gemini-embedding-001은 3072차원
-- ivfflat은 2000차원 한계 → hnsw 인덱스로 교체 (차원 제한 없음)
-- ============================================================

-- 기존 인덱스 제거
DROP INDEX IF EXISTS knowledge_chunks_embedding_idx;

-- 컬럼 타입 변경 (3072차원으로) — 최초 마이그레이션이 768이었을 경우만 필요
ALTER TABLE knowledge_chunks
  ALTER COLUMN embedding TYPE vector(3072)
  USING embedding::vector(3072);

-- hnsw 인덱스 (차원 제한 없음, ivfflat 대체)
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

-- RPC 함수 3072차원으로 업데이트
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding  vector(3072),
  match_threshold  float    DEFAULT 0.65,
  match_count      int      DEFAULT 5,
  filter_category  text     DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  content     text,
  source      text,
  category    text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id,
    kc.content,
    kc.source,
    kc.category,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    (filter_category IS NULL OR kc.category = filter_category)
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;
