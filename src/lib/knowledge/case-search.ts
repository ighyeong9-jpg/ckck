/**
 * case-search.ts — 판례 검색 + RAG 주입
 *
 * 현장 이슈나 채팅 질문에서 관련 판례를 찾아
 * brain.ts의 RAG 컨텍스트에 자동 주입
 */

import { loadChunksByCategory, KnowledgeChunk } from './loader'

// ═══════════════════════════════════════════════════════════
// 판례 검색
// ═══════════════════════════════════════════════════════════

export interface CaseResult {
  id: string
  source: string
  content: string
  matchedKeywords: string[]
  score: number
}

/** 키워드 기반 판례 검색 (임베딩 없이 로컬 즉시 검색) */
export function searchCases(query: string, topK = 3): CaseResult[] {
  const chunks = loadChunksByCategory('case')
  const q = query.toLowerCase()
  const qTerms = q.split(/\s+/).filter(t => t.length >= 2)

  const scored = chunks.map((chunk: KnowledgeChunk) => {
    let score = 0
    const matched: string[] = []
    const contentLower = chunk.content.toLowerCase()

    // 키워드 배열 매칭 (가중치 높음)
    for (const kw of chunk.keywords ?? []) {
      if (q.includes(kw.toLowerCase()) || contentLower.includes(kw.toLowerCase())) {
        score += 3
        matched.push(kw)
      }
    }

    // 쿼리 토큰 매칭
    for (const term of qTerms) {
      if (contentLower.includes(term)) {
        score += 1
      }
    }

    return { id: chunk.id, source: chunk.source, content: chunk.content, matchedKeywords: matched, score }
  })

  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/** 기록 관리 유형 키워드 → 판례 자동 매칭 */
export const DISPUTE_KEYWORDS = [
  '하자', '누수', '방수', '곰팡이', '균열', '들뜸',        // 하자 계열
  '추가비용', '추가공사', '구두', '과다청구', '사기',       // 비용 계열
  '잔금', '계약금', '지급거부', '먹튀', '잠적',            // 대금 계열
  '지연', '연장', '공기', '준공', '완공',                  // 공정 계열
  '무면허', '면허', '미등록', '키스콘',                    // 자격 계열
  '자재', '규격', '대체', '브랜드',                        // 자재 계열
  '계약', '서면', '계약서', '약관',                        // 계약 계열
  '층간소음', '소음', '차음',                              // 소음 계열
  '안전', '추락', '감전', '화재',                          // 안전 계열
]

/** 쿼리가 판례 검색이 필요한지 감지 */
export function needsCaseSearch(query: string): boolean {
  return DISPUTE_KEYWORDS.some(kw => query.includes(kw))
}

/** 판례 RAG 컨텍스트 문자열 빌드 */
export function buildCaseContext(cases: CaseResult[]): string {
  if (cases.length === 0) return ''
  return cases
    .map((c, i) => `[판례 ${i + 1}] 출처: ${c.source}\n${c.content}`)
    .join('\n\n---\n\n')
}
