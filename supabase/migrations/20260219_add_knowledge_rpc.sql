-- ============================================================
-- knowledge_chunks 벡터 검색 RPC 함수
-- retriever.ts의 match_knowledge_chunks 호출에 대응
-- ============================================================

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding  vector(768),
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
