/**
 * 지식베이스 임베딩 시드 스크립트
 * 실행: node scripts/seed-knowledge.js
 *
 * 모든 JSON 청크를 Google text-embedding-004로 임베딩 후
 * Supabase knowledge_chunks 테이블에 저장
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

// ─── JSON 청크 로드 ────────────────────────────────────────
const SOURCE_DIR = path.join(__dirname, '..', 'src', 'lib', 'knowledge', 'sources')
const FILES = ['laws.json', 'process.json', 'defects.json', 'materials.json', 'contracts.json']

function loadChunks() {
  return FILES.flatMap(file => {
    const filePath = path.join(SOURCE_DIR, file)
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      console.log(`  ✓ ${file}: ${data.length}개 청크`)
      return data
    } catch (e) {
      console.warn(`  ✗ ${file} 로드 실패: ${e.message}`)
      return []
    }
  })
}

// ─── Google 임베딩 API ──────────────────────────────────────
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
    { model: 'models/gemini-embedding-001', content: { parts: [{ text }] }, outputDimensionality: 768 }
  )
  if (res.status !== 200) throw new Error(`임베딩 API 오류 ${res.status}: ${JSON.stringify(res.body).substring(0, 100)}`)
  return res.body.embedding.values
}

// ─── 기존 데이터 전체 삭제 ─────────────────────────────────
async function clearChunks() {
  const supabaseHost = new URL(SUPABASE_URL).hostname
  // neq=id.is.null 트릭으로 전체 삭제 (RLS 없는 service_role)
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
  // id는 DB가 gen_random_uuid()로 자동 생성, slug로 사람이 읽을 수 있는 ID 보관
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
  console.log('=== Check-In 지식베이스 시드 시작 ===\n')

  console.log('기존 데이터 초기화...')
  await clearChunks()

  console.log('\nJSON 파일 로드...')
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
