/**
 * 추가 지식베이스 시딩 스크립트 (기존 DB 유지, 신규 파일만 추가)
 * 실행: node scripts/seed-additional.js
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

// ─── 추가할 파일 목록 (기존 파일 제외) ─────────────────────
const SOURCE_DIR = path.join(__dirname, '..', 'src', 'lib', 'knowledge', 'sources')
const ADDITIONAL_FILES = [
  'trades-pricing.json',
  'trades-pricing-2.json',
  'trades-pricing-3.json',
  'labor-cost.json',
  'official-standards.json',
  'interior-by-type.json',
  'construction-materials.json',
  'regulations-detail.json',
  'project-management.json',
  'hvac-plumbing.json',
  'material-guide.json',
  'korean-brands.json',
  'maintenance-as.json',
]

// ─── JSON 로드 ──────────────────────────────────────────────
function loadChunks() {
  return ADDITIONAL_FILES.flatMap(file => {
    const filePath = path.join(SOURCE_DIR, file)
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      console.log(`  ✓ ${file}: ${raw.length}개 청크`)
      return raw
    } catch (e) {
      console.warn(`  ✗ ${file} 로드 실패: ${e.message}`)
      return []
    }
  })
}

// ─── HTTPS 헬퍼 ─────────────────────────────────────────────
function httpsPost(hostname, pathStr, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body)
    const req = https.request(
      { hostname, path: pathStr, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) } },
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

// ─── Gemini 임베딩 (768-dim) ───────────────────────────────
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

// ─── 기존 slug 목록 조회 ─────────────────────────────────────
async function getExistingSlugs() {
  const supabaseHost = new URL(SUPABASE_URL).hostname
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: supabaseHost,
      path: '/rest/v1/knowledge_chunks?select=metadata',
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    }, r => {
      let d = ''
      r.on('data', c => d += c)
      r.on('end', () => {
        try {
          const rows = JSON.parse(d)
          const slugs = new Set(rows.map(r => r.metadata?.slug).filter(Boolean))
          resolve(slugs)
        } catch { resolve(new Set()) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

// ─── Supabase INSERT ────────────────────────────────────────
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
  console.log('=== Check-In 추가 지식베이스 시드 (기존 데이터 유지) ===\n')

  console.log('기존 슬러그 목록 조회...')
  const existingSlugs = await getExistingSlugs()
  console.log(`  현재 DB: ${existingSlugs.size}개 청크\n`)

  console.log('JSON 파일 로드...')
  const chunks = loadChunks()
  console.log(`\n총 ${chunks.length}개 청크 로드\n`)

  // 이미 존재하는 slug 필터링
  const newChunks = chunks.filter(c => !existingSlugs.has(c.id))
  const skipCount = chunks.length - newChunks.length
  if (skipCount > 0) {
    console.log(`⏭️  ${skipCount}개 이미 존재 (skip)\n`)
  }
  console.log(`📦 신규 시딩 대상: ${newChunks.length}개\n`)

  if (newChunks.length === 0) {
    console.log('✅ 모두 이미 시딩됨. 종료.')
    return
  }

  let succeeded = 0
  const failed = []

  for (let i = 0; i < newChunks.length; i++) {
    const chunk = newChunks[i]
    const progress = `[${i + 1}/${newChunks.length}]`

    try {
      process.stdout.write(`${progress} ${chunk.id} ... `)
      const embedding = await getEmbedding(chunk.content)
      await upsertChunk(chunk, embedding)
      succeeded++
      console.log('✓')

      // Rate limit 방지: 3개마다 700ms 대기
      if ((i + 1) % 3 === 0) await new Promise(r => setTimeout(r, 700))
    } catch (err) {
      failed.push({ id: chunk.id, error: err.message })
      console.log(`✗ ${err.message.substring(0, 80)}`)
      await new Promise(r => setTimeout(r, 1200))
    }
  }

  console.log('\n=== 시드 완료 ===')
  console.log(`성공: ${succeeded}/${newChunks.length}`)
  if (failed.length > 0) {
    console.log(`실패 (${failed.length}개):`)
    failed.forEach(f => console.log(`  - ${f.id}: ${f.error}`))
  }
  console.log(`\n총 DB 예상 청크 수: ${existingSlugs.size + succeeded}개`)
}

main().catch(err => {
  console.error('치명적 오류:', err)
  process.exit(1)
})
