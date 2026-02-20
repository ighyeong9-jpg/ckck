/**
 * 지식베이스 임베딩 시드 스크립트
 * 실행: node scripts/seed-knowledge.js
 *
 * 모든 JSON 청크를 Gemini gemini-embedding-001 (3072-dim)로 임베딩 후
 * Supabase knowledge_chunks 테이블에 저장
 *
 * 지원 형식:
 * - 플랫 형식: { id, content, source, category, keywords }
 * - 분쟁 형식: { id, type, title, pain_points[], legal_basis{}, user_action, keywords }
 * - 공종 형식: { id, trade, checkpoints[], source, category, keywords }
 * - 하자 형식: { id, type, title, causes[], legal_basis{}, checky_action[], keywords }
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// ─── .env.local 파싱 ──────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('#') || !trimmed.includes('=')) return
  const [key, ...rest] = trimmed.split('=')
  if (key) env[key.trim()] = rest.join('=').trim()
})

const GEMINI_API_KEY = env.GEMINI_API_KEY
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!GEMINI_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ .env.local에 GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

// ─── 중첩 형식 → content 문자열 변환 ──────────────────────

function buildDisputeContent(item) {
  const parts = [
    `[분쟁 유형] ${item.title || item.type || ''}`,
    item.description || '',
  ]
  if (Array.isArray(item.pain_points) && item.pain_points.length > 0) {
    parts.push(`주요 문제: ${item.pain_points.join(' / ')}`)
  }
  if (item.legal_basis) {
    const lb = item.legal_basis
    if (lb.primary) parts.push(`법적 근거: ${lb.primary}`)
    if (lb.secondary) parts.push(lb.secondary)
    if (lb.rule) parts.push(lb.rule)
    if (lb.periods) {
      const periodStr = Object.entries(lb.periods).map(([k, v]) => `${k}: ${v}`).join(', ')
      parts.push(`하자담보기간: ${periodStr}`)
    }
  }
  if (item.user_action) parts.push(`권장 조치: ${item.user_action}`)
  if (Array.isArray(item.checky_prevention) && item.checky_prevention.length > 0) {
    parts.push(`체키 예방 기능: ${item.checky_prevention.join(' / ')}`)
  }
  return parts.filter(Boolean).join('\n')
}

function buildProcessContent(item) {
  const parts = [
    `[공종] ${item.trade || ''} — ${item.title || ''}`,
    item.description || '',
  ]
  if (Array.isArray(item.checkpoints)) {
    for (const cp of item.checkpoints) {
      parts.push(`\n체크포인트: ${cp.name || ''}`)
      if (cp.criteria) parts.push(`기준: ${cp.criteria}`)
      if (cp.go) parts.push(`GO 조건: ${cp.go}`)
      if (cp.no_go) parts.push(`NO-GO 조건: ${cp.no_go}`)
      if (cp.legal_basis) parts.push(`근거: ${cp.legal_basis}`)
    }
  }
  if (item.warranty_period_months) {
    parts.push(`하자담보기간: ${item.warranty_period_months}개월`)
  }
  return parts.filter(Boolean).join('\n')
}

function buildDefectContent(item) {
  const parts = [
    `[하자 유형] ${item.title || item.type || ''}`,
    `담보기간: ${item.warranty_period_months || 0}개월 | 심각도: ${item.severity || ''}`,
    item.description || '',
  ]
  if (Array.isArray(item.causes) && item.causes.length > 0) {
    parts.push(`원인: ${item.causes.join(' / ')}`)
  }
  if (item.legal_basis) {
    const lb = item.legal_basis
    if (lb.primary) parts.push(`법적 근거: ${lb.primary}`)
    if (lb.standard) parts.push(lb.standard)
    if (lb.period) parts.push(`담보기간: ${lb.period}`)
    if (lb.key_case) parts.push(`판례: ${lb.key_case}`)
  }
  if (Array.isArray(item.checky_action) && item.checky_action.length > 0) {
    parts.push(`권장 조치: ${item.checky_action.join(' / ')}`)
  }
  return parts.filter(Boolean).join('\n')
}

/**
 * 어떤 형식이든 { content, source, category, id, keywords } 형태로 정규화
 */
function normalizeChunk(item) {
  // 1. 이미 content 필드 있는 플랫 형식
  if (item.content && typeof item.content === 'string') {
    return item
  }

  // source 자동 생성 (없는 경우)
  const autoSource = item.source || item.title || item.type || item.id || 'unknown'

  // 2. 분쟁 형식 (pain_points 또는 legal_basis가 객체인 경우)
  if (item.pain_points || (item.legal_basis && typeof item.legal_basis === 'object')) {
    return {
      ...item,
      source: autoSource,
      content: buildDisputeContent(item),
      category: item.category || 'contract',
    }
  }

  // 3. 공종 형식 (checkpoints 배열)
  if (Array.isArray(item.checkpoints)) {
    return {
      ...item,
      source: autoSource,
      content: buildProcessContent(item),
      category: item.category || 'process',
    }
  }

  // 4. 하자 형식 (causes 배열 + severity)
  if (Array.isArray(item.causes) || item.severity) {
    return {
      ...item,
      source: autoSource,
      content: buildDefectContent(item),
      category: item.category || 'defect',
    }
  }

  // 5. 인식 불가 — 빈 content로 fallback (로그 출력)
  console.warn(`  ⚠️ ${item.id}: 알 수 없는 형식 — content 필드 없음`)
  return { ...item, source: autoSource, content: JSON.stringify(item).substring(0, 500) }
}

// ─── JSON 청크 로드 + 정규화 ───────────────────────────────
const SOURCE_DIR = path.join(__dirname, '..', 'src', 'lib', 'knowledge', 'sources')
const FILES = ['laws.json', 'process.json', 'defects.json', 'materials.json', 'contracts.json', 'disputes.json']

function loadChunks() {
  return FILES.flatMap(file => {
    const filePath = path.join(SOURCE_DIR, file)
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const normalized = raw.map(normalizeChunk)
      console.log(`  ✓ ${file}: ${normalized.length}개 청크`)
      return normalized
    } catch (e) {
      console.warn(`  ✗ ${file} 로드 실패: ${e.message}`)
      return []
    }
  })
}

// ─── Google 임베딩 API (3072-dim) ─────────────────────────
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body)
    const req = https.request(
      { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) } },
      res => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
          catch { resolve({ status: res.statusCode, body: data }) }
        })
      }
    )
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

async function getEmbedding(text) {
  const res = await httpsPost(
    'generativelanguage.googleapis.com',
    `/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    { 'Content-Type': 'application/json' },
    {
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }
  )
  if (res.status !== 200) throw new Error(`임베딩 API 오류 ${res.status}: ${JSON.stringify(res.body).substring(0, 100)}`)
  return res.body.embedding.values
}

// ─── 기존 데이터 전체 삭제 ─────────────────────────────────
async function clearChunks() {
  const supabaseHost = new URL(SUPABASE_URL).hostname
  const res = await new Promise((resolve, reject) => {
    const req = require('https').request({
      hostname: supabaseHost,
      path: '/rest/v1/knowledge_chunks?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve({status:r.statusCode,body:d})) })
    req.on('error', reject); req.end()
  })
  console.log(`  기존 데이터 삭제: status=${res.status}`)
}

// ─── Supabase INSERT ───────────────────────────────────────
async function upsertChunk(chunk, embedding) {
  const supabaseHost = new URL(SUPABASE_URL).hostname
  const body = {
    content: chunk.content,
    embedding: `[${embedding.join(',')}]`,
    source: chunk.source,
    category: chunk.category,
    metadata: { slug: chunk.id, keywords: chunk.keywords ?? [] },
  }

  const res = await httpsPost(
    supabaseHost,
    '/rest/v1/knowledge_chunks',
    {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body
  )

  if (res.status !== 200 && res.status !== 201 && res.status !== 204) {
    throw new Error(`DB 저장 실패 (${res.status}): ${JSON.stringify(res.body).substring(0, 200)}`)
  }
}

// ─── 메인 ──────────────────────────────────────────────────
async function main() {
  console.log('=== Check-In 지식베이스 시드 시작 (gemini-embedding-001 / 3072-dim) ===\n')

  console.log('기존 데이터 초기화...')
  await clearChunks()

  console.log('\nJSON 파일 로드 및 정규화...')
  const chunks = loadChunks()
  console.log(`\n총 ${chunks.length}개 청크\n`)

  let succeeded = 0
  const failed = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const progress = `[${i + 1}/${chunks.length}]`

    try {
      process.stdout.write(`${progress} ${chunk.id} ... `)
      const embedding = await getEmbedding(chunk.content)
      await upsertChunk(chunk, embedding)
      succeeded++
      console.log('✓')

      // Rate limit 방지: 5개마다 500ms 대기
      if ((i + 1) % 5 === 0) await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      failed.push({ id: chunk.id, error: err.message })
      console.log(`✗ ${err.message.substring(0, 80)}`)

      // API 오류 시 1초 대기 후 계속
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log('\n=== 시드 완료 ===')
  console.log(`성공: ${succeeded}/${chunks.length}`)
  if (failed.length > 0) {
    console.log(`실패 (${failed.length}개):`)
    failed.forEach(f => console.log(`  - ${f.id}: ${f.error}`))
  }
}

main().catch(err => {
  console.error('치명적 오류:', err)
  process.exit(1)
})
