/**
 * Knowledge Loader — 지식 문서 로더
 * JSON 파일을 읽어 평탄화된 청크 배열로 반환
 */

export type KnowledgeCategory = 'law' | 'process' | 'defect' | 'material' | 'contract' | 'safety'

export interface KnowledgeChunk {
  id: string
  source: string
  category: KnowledgeCategory
  content: string
  keywords?: string[]
  metadata?: Record<string, string>
}

// JSON 파일에서 청크 로드
function loadJson(filename: string): KnowledgeChunk[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require(`./sources/${filename}`)
    return Array.isArray(data) ? data : []
  } catch {
    console.warn(`[Knowledge] ${filename} 로드 실패`)
    return []
  }
}

/** 모든 지식 청크를 하나의 배열로 반환 */
export function loadAllChunks(): KnowledgeChunk[] {
  const files = ['laws.json', 'process.json', 'defects.json', 'materials.json', 'contracts.json']
  return files.flatMap(f => loadJson(f))
}

/** 카테고리별 필터 로드 */
export function loadChunksByCategory(category: KnowledgeCategory): KnowledgeChunk[] {
  return loadAllChunks().filter(c => c.category === category)
}

/** 키워드로 로컬 필터링 (임베딩 없이 빠른 검색) */
export function searchChunksByKeyword(query: string): KnowledgeChunk[] {
  const q = query.toLowerCase()
  return loadAllChunks().filter(chunk => {
    const inContent = chunk.content.toLowerCase().includes(q)
    const inSource = chunk.source.toLowerCase().includes(q)
    const inKeywords = chunk.keywords?.some(k => k.toLowerCase().includes(q))
    return inContent || inSource || inKeywords
  })
}
