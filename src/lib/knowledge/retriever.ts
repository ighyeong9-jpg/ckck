/**
 * Knowledge Retriever — RAG 검색 엔진
 *
 * 흐름:
 * 질문 → text-embedding-004로 벡터화
 *      → pgvector 코사인 유사도 검색 (상위 5개)
 *      → 청크 + 원본 질문 → LLM 주입
 *      → 출처가 있는 답변 반환
 *
 * fallback: pgvector 검색 실패 시 로컬 키워드 검색으로 대체
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { searchChunksByKeyword, type KnowledgeCategory } from './loader'

const EMBEDDING_MODEL = 'gemini-embedding-001'
const TOP_K = 5  // 검색 결과 최대 개수
const MIN_SIMILARITY = 0.65  // 최소 유사도 임계값 (0~1)

// ─── 타입 ─────────────────────────────────────────────────

export interface RetrievedChunk {
  id: string
  content: string
  source: string
  category: KnowledgeCategory
  similarity: number
}

export interface RAGResult {
  chunks: RetrievedChunk[]
  context: string   // LLM에 주입할 컨텍스트 문자열
  sources: string[] // 출처 목록 (중복 제거)
  method: 'vector' | 'keyword'  // 검색 방법
}

// ─── 임베딩 생성 ──────────────────────────────────────────

async function embedQuery(query: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY가 없습니다.')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })
  // gemini-embedding-001은 Matryoshka 모델: 앞 768차원이 최적 부분집합
  const result = await model.embedContent(query)
  const values = result.embedding.values
  return values.slice(0, 768)
}

// ─── pgvector 검색 ─────────────────────────────────────────

async function vectorSearch(
  embedding: number[],
  category?: KnowledgeCategory,
  topK = TOP_K,
): Promise<RetrievedChunk[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수 미설정')

  const supabase = createClient(url, key)
  const vectorStr = `[${embedding.join(',')}]`

  // pgvector 코사인 유사도 검색 (RPC 함수 호출)
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: vectorStr,
    match_threshold: MIN_SIMILARITY,
    match_count: topK,
    filter_category: category ?? null,
  })

  if (error) throw new Error(`pgvector 검색 실패: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    content: row.content,
    source: row.source,
    category: row.category as KnowledgeCategory,
    similarity: row.similarity,
  }))
}

// ─── 키워드 fallback 검색 ──────────────────────────────────

function keywordSearch(query: string, topK = TOP_K): RetrievedChunk[] {
  const chunks = searchChunksByKeyword(query)
  return chunks.slice(0, topK).map(c => ({
    id: c.id,
    content: c.content,
    source: c.source,
    category: c.category,
    similarity: 0.5,  // fallback 유사도 고정
  }))
}

// ─── 컨텍스트 문자열 조합 ─────────────────────────────────

function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''

  return chunks
    .map((c, i) => `[${i + 1}] 출처: ${c.source}\n${c.content}`)
    .join('\n\n---\n\n')
}

// ─── 메인 검색 함수 ───────────────────────────────────────

export async function retrieve(
  query: string,
  category?: KnowledgeCategory,
): Promise<RAGResult> {
  // 1순위: pgvector 벡터 검색
  try {
    const embedding = await embedQuery(query)
    const chunks = await vectorSearch(embedding, category)

    if (chunks.length > 0) {
      return {
        chunks,
        context: buildContext(chunks),
        sources: [...new Set(chunks.map(c => c.source))],
        method: 'vector',
      }
    }
  } catch (err: any) {
    console.warn(`[Retriever] 벡터 검색 실패, 키워드 검색으로 전환: ${err?.message}`)
  }

  // 2순위: 로컬 키워드 검색 (pgvector 미구성 또는 실패 시)
  const chunks = keywordSearch(query)
  return {
    chunks,
    context: buildContext(chunks),
    sources: [...new Set(chunks.map(c => c.source))],
    method: 'keyword',
  }
}

/**
 * RAG 결과를 LLM 프롬프트에 주입하는 헬퍼
 * brain.ts의 rag-search 태스크에서 사용
 */
export function buildRAGPrompt(userQuery: string, ragResult: RAGResult): string {
  if (ragResult.chunks.length === 0) {
    return userQuery
  }

  return `다음 참고 자료를 바탕으로 답변하세요. 답변 시 반드시 출처(법령명 또는 기준명)를 명시하세요.

=== 참고 자료 ===
${ragResult.context}

=== 질문 ===
${userQuery}

위 자료를 근거로 답변하되, 자료에 없는 내용은 추측하지 말고 '관련 자료가 충분하지 않습니다'라고 명시하세요.`
}
