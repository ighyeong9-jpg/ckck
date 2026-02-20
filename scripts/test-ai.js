/**
 * 체키 AI 직접 테스트 스크립트
 * node scripts/test-ai.js
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// env 파싱
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('#') || trimmed.indexOf('=') === -1) return
  const eq = trimmed.indexOf('=')
  env[trimmed.substring(0, eq).trim()] = trimmed.substring(eq + 1).trim()
})

const GEMINI_API_KEY = env.GEMINI_API_KEY
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

function httpsPost(hostname, pathStr, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body)
    const req = https.request(
      { hostname, path: pathStr, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) } },
      res => {
        let d = ''
        res.on('data', c => d += c)
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(d) }) }
          catch { resolve({ status: res.statusCode, body: d }) }
        })
      }
    )
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

async function embed(text) {
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
  if (res.status !== 200) throw new Error('embed 실패: ' + JSON.stringify(res.body).substring(0, 100))
  return res.body.embedding.values
}

async function vectorSearch(embedding, topK = 5) {
  const supabaseHost = new URL(SUPABASE_URL).hostname
  const vectorStr = '[' + embedding.join(',') + ']'
  const body = {
    query_embedding: vectorStr,
    match_threshold: 0.5,
    match_count: topK,
    filter_category: null,
  }
  const res = await httpsPost(
    supabaseHost,
    '/rest/v1/rpc/match_knowledge_chunks',
    {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    },
    body
  )
  return res.body || []
}

async function askGemini(question, context) {
  const prompt = context
    ? `다음 참고 자료를 바탕으로 한국 인테리어·건설 전문가로서 답변하세요.
참고 자료에 수치가 있으면 반드시 수치를 먼저 제시하고, 되묻지 마세요.

=== 참고 자료 ===
${context}

=== 질문 ===
${question}`
    : question

  const res = await httpsPost(
    'generativelanguage.googleapis.com',
    `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    { 'Content-Type': 'application/json' },
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
    }
  )
  if (res.status !== 200) throw new Error('Gemini 실패: ' + JSON.stringify(res.body).substring(0, 100))
  return res.body?.candidates?.[0]?.content?.parts?.[0]?.text || '응답 없음'
}

const QUESTIONS = [
  '보통인부 일당 얼마야?',
  '카페 30평 인테리어 공사비 얼마?',
  '욕실 방수 공법 추천해줘',
  '다루끼 30x40 평단가',
  '인테리어 필름 미터당 단가',
  '소방 간이스프링클러 설치 기준',
]

async function main() {
  console.log('=== 체키 AI RAG 테스트 ===\n')

  for (const q of QUESTIONS) {
    console.log('━'.repeat(50))
    console.log('Q:', q)

    try {
      // 1. 벡터 검색
      const embedding = await embed(q)
      const chunks = await vectorSearch(embedding, 3)

      if (Array.isArray(chunks) && chunks.length > 0) {
        console.log(`📚 검색된 청크 ${chunks.length}개:`, chunks.map(c => c.source?.substring(0, 40) + '...').join(' | '))
        const context = chunks.map((c, i) => `[${i+1}] ${c.source}\n${c.content?.substring(0, 300)}`).join('\n\n')
        const answer = await askGemini(q, context)
        console.log('A:', answer)
      } else {
        console.log('⚠️  검색 결과 없음')
        const answer = await askGemini(q, null)
        console.log('A(no context):', answer)
      }
    } catch (e) {
      console.log('ERROR:', e.message)
    }

    console.log()
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log('=== 테스트 완료 ===')
}

main().catch(console.error)
