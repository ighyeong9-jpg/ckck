/**
 * Knowledge Embedder — 임베딩 생성 및 DB 저장
 * Google text-embedding-004 사용 (768차원)
 * 서버 사이드 전용 (Node.js 환경)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { loadAllChunks, type KnowledgeChunk } from './loader'

const EMBEDDING_MODEL = 'gemini-embedding-001'
const BATCH_SIZE = 10  // API 과부하 방지용 배치 크기
const BATCH_DELAY_MS = 500  // 배치 간 딜레이

// ─── 임베딩 생성 ──────────────────────────────────────────

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })

  // gemini-embedding-001은 Matryoshka 모델: 앞 768차원이 최적 부분집합
  const result = await model.embedContent(text)
  const values = result.embedding.values
  return values.slice(0, 768)
}

// ─── Supabase 클라이언트 (서버용) ─────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수 미설정')
  return createClient(url, key)
}

// ─── 단일 청크 저장 ───────────────────────────────────────

async function upsertChunk(chunk: KnowledgeChunk, embedding: number[]): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('knowledge_chunks')
    .upsert(
      {
        id: chunk.id,
        content: chunk.content,
        embedding: `[${embedding.join(',')}]`,
        source: chunk.source,
        category: chunk.category,
        metadata: {
          keywords: chunk.keywords ?? [],
          ...(chunk.metadata ?? {}),
        },
      },
      { onConflict: 'id' }
    )

  if (error) throw new Error(`DB 저장 실패 (${chunk.id}): ${error.message}`)
}

// ─── 전체 시드 함수 ───────────────────────────────────────

export interface SeedResult {
  total: number
  succeeded: number
  failed: string[]
}

export async function seedAllKnowledge(
  onProgress?: (current: number, total: number, id: string) => void
): Promise<SeedResult> {
  const chunks = loadAllChunks()
  const result: SeedResult = { total: chunks.length, succeeded: 0, failed: [] }

  console.log(`[Embedder] 총 ${chunks.length}개 청크 임베딩 시작...`)

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)

    for (const chunk of batch) {
      try {
        onProgress?.(i + 1, chunks.length, chunk.id)
        const embedding = await getEmbedding(chunk.content)
        await upsertChunk(chunk, embedding)
        result.succeeded++
        console.log(`  ✓ [${result.succeeded}/${chunks.length}] ${chunk.id}`)
      } catch (err: any) {
        result.failed.push(chunk.id)
        console.error(`  ✗ ${chunk.id}: ${err?.message}`)
      }
    }

    // 배치 간 딜레이 (Rate Limit 방지)
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  console.log(`[Embedder] 완료: ${result.succeeded}/${result.total} 성공, ${result.failed.length}개 실패`)
  return result
}

/** 특정 청크만 재임베딩 */
export async function reembedChunk(chunkId: string): Promise<void> {
  const chunks = loadAllChunks()
  const chunk = chunks.find(c => c.id === chunkId)
  if (!chunk) throw new Error(`청크 ID를 찾을 수 없습니다: ${chunkId}`)

  const embedding = await getEmbedding(chunk.content)
  await upsertChunk(chunk, embedding)
  console.log(`[Embedder] 재임베딩 완료: ${chunkId}`)
}
