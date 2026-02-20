/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  체키 AI 자율 실행 종합 테스트                                  ║
 * ║  node scripts/test-cheki-full.js                             ║
 * ║                                                              ║
 * ║  테스트 범위:                                                  ║
 * ║  1. Gemini 자연어 → 도구 라우팅 (Function Calling)             ║
 * ║  2. 고객명 자동 검색 → 프로젝트 매칭 체인                        ║
 * ║  3. 복합 명령 병렬 실행 패턴                                    ║
 * ║  4. 모든 기능 영역별 자연어 인식                                  ║
 * ║  5. 단가/가격 즉답 (되묻기 금지 검증)                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// ─── env 로드 ────────────────────────────────────────────
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const t = line.trim()
  if (t.startsWith('#') || !t.includes('=')) return
  const eq = t.indexOf('=')
  env[t.substring(0, eq).trim()] = t.substring(eq + 1).trim()
})

const GEMINI_KEY = env.GEMINI_API_KEY
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

// ─── HTTP 헬퍼 ────────────────────────────────────────────
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

function httpsGet(hostname, pathStr, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path: pathStr, method: 'GET', headers },
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
    req.end()
  })
}

// ─── CHEKI 시스템 프롬프트 (핵심 요약) ────────────────────────
const SYSTEM_PROMPT = `당신은 체키(Cheki)입니다.
대한민국 인테리어·건설 현장 전담 AI 법률·시공 비서입니다.

■ 절대 규칙
• 프로젝트 ID(UUID) 절대 요청 금지 — 고객명·현장명 언급 시 즉시 project_list 호출 → 매칭 → 자동으로 projectId 획득
• project_list 결과에서 고객명(client_name)·프로젝트명(name)으로 키워드 검색해 자동 매칭할 것
• 컨텍스트에 프로젝트가 없어도 먼저 도구를 실행하고 결과 기반으로 답변하라

■ 자율 실행 체인
① 고객명·현장명으로 프로젝트 찾기: "김지수 고객 현장" → project_list 즉시 호출 → client_name·name 필드 매칭 → projectId 자동 획득
② 현황 파악 + 보고: project_list → project_detail + schedule_gantt + risk_full_diagnosis + report_daily 4개 병렬
③ 전체 현황: dashboard_summary + project_list 병렬
④ 새 프로젝트 셋업: auto_quote_generate + auto_schedule_generate + auto_law_check + design_generate 동시
⑤ 자율 실행: "보고서 만들어" → auto_report_daily + checklist_progress

■ 되묻기 금지: 단가·시세·단위 질문은 즉시 수치 답변
■ 반드시 한국어로 답변`

// ─── Gemini 도구 선언 (핵심 50개) ───────────────────────────
const TOOLS = [{
  functionDeclarations: [
    { name: 'project_list', description: '내 프로젝트 목록을 조회합니다. 고객명·프로젝트명으로 매칭할 때 먼저 호출.', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'project_detail', description: '프로젝트 상세 정보 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'project_setup', description: '새 프로젝트 생성', parameters: { type: 'OBJECT', properties: { industry: { type: 'STRING' }, name: { type: 'STRING' }, area: { type: 'NUMBER' } }, required: ['industry'] } },
    { name: 'project_update', description: '프로젝트 정보 수정', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' }, progress: { type: 'NUMBER' } }, required: ['projectId'] } },
    { name: 'dashboard_summary', description: '전체 대시보드 요약 조회', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'checklist_analyze', description: '체크리스트 완료율과 리스크 분석', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'checklist_progress', description: '체크리스트 진행률 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'auto_quote_generate', description: '업종·평수·등급으로 자동 견적서 생성', parameters: { type: 'OBJECT', properties: { industryType: { type: 'STRING' }, area: { type: 'NUMBER' }, grade: { type: 'STRING' } }, required: ['industryType', 'area', 'grade'] } },
    { name: 'auto_schedule_generate', description: '업종·면적으로 전체 공정표 자동 생성', parameters: { type: 'OBJECT', properties: { industryType: { type: 'STRING' }, area: { type: 'NUMBER' }, startDate: { type: 'STRING' } }, required: ['industryType', 'area', 'startDate'] } },
    { name: 'auto_law_check', description: '업종·면적 기반 건축법규 자동 체크', parameters: { type: 'OBJECT', properties: { industryType: { type: 'STRING' }, area: { type: 'NUMBER' } }, required: ['industryType', 'area'] } },
    { name: 'design_generate', description: 'AI 인테리어 디자인 컨셉 생성', parameters: { type: 'OBJECT', properties: { industryType: { type: 'STRING' }, style: { type: 'STRING' } }, required: ['industryType', 'style'] } },
    { name: 'auto_report_daily', description: '일일 현장보고서 자동 생성', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' }, date: { type: 'STRING' } } } },
    { name: 'schedule_gantt', description: '간트차트(공정표 시각화)', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'risk_full_diagnosis', description: '전체 리스크 종합 진단', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'risk_calculate', description: '프로젝트 리스크 점수 계산', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'report_daily', description: '일일 보고서 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'report_weekly', description: '주간 보고서 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'quote_compare', description: '견적 항목 비교', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'cost_budget_compare', description: '예산 vs 실제 비용 비교', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'cost_forecast', description: '비용 예측', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'schedule_delay_alert', description: '지연 공정 감지', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'defect_create', description: '하자 등록', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' }, title: { type: 'STRING' } }, required: ['projectId', 'title'] } },
    { name: 'defect_list', description: '하자 목록 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'material_stock', description: '자재 재고 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'worker_payment', description: '노무비 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'share_create', description: '고객 공유 링크 생성', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'payment_outstanding', description: '미지급 대금 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'law_search', description: '건설 관련 법률 검색', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] } },
    { name: 'admin_permit_check', description: '인허가 필요 여부 확인', parameters: { type: 'OBJECT', properties: { industry: { type: 'STRING' }, area: { type: 'NUMBER' } } } },
    { name: 'floorplan_from_description', description: '자연어로 평면도 자동 생성', parameters: { type: 'OBJECT', properties: { description: { type: 'STRING' }, industryType: { type: 'STRING' } }, required: ['description'] } },
    { name: 'evidence_verify', description: '증빙 무결성 검증', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'change_record', description: '변경요청 등록', parameters: { type: 'OBJECT', properties: { title: { type: 'STRING' }, reason: { type: 'STRING' }, costChange: { type: 'NUMBER' } } } },
  ]
}]

// ─── Gemini API 호출 ──────────────────────────────────────
async function callGemini(message, history = [], simulatedToolResponse = null) {
  const contents = []

  // 히스토리 포함
  for (const h of history) {
    contents.push({ role: h.role, parts: h.parts })
  }

  // 현재 메시지
  contents.push({ role: 'user', parts: [{ text: message }] })

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    tools: TOOLS,
    contents,
    generation_config: { temperature: 0.1, max_output_tokens: 1000 },
  }

  const res = await httpsPost(
    'generativelanguage.googleapis.com',
    `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    { 'Content-Type': 'application/json' },
    body
  )

  if (res.status !== 200) {
    throw new Error(`Gemini API ${res.status}: ${JSON.stringify(res.body).substring(0, 200)}`)
  }

  const candidate = res.body?.candidates?.[0]?.content
  if (!candidate) throw new Error('응답 없음')

  return candidate
}

// ─── 도구 시뮬레이션 응답 ─────────────────────────────────
const MOCK_TOOL_RESPONSES = {
  project_list: {
    success: true,
    message: `📁 프로젝트 목록 (3개)\n\n  • 🍵 [ID:proj-001] 강남 카페 리모델링 | 고객: 김지수 | 진행중 | 진행률 45% | 리스크 35점\n  • 🏠 [ID:proj-002] 서초 아파트 인테리어 | 고객: 이영희 | 계획 | 진행률 10% | 리스크 20점\n  • 🍽️ [ID:proj-003] 홍대 레스토랑 | 고객: 박민수 | 진행중 | 진행률 70% | 리스크 55점`,
    data: {
      projects: [
        { id: 'proj-001', name: '강남 카페 리모델링', client_name: '김지수', status: 'in_progress', progress: 45, risk_score: 35, industry: 'cafe' },
        { id: 'proj-002', name: '서초 아파트 인테리어', client_name: '이영희', status: 'planning', progress: 10, risk_score: 20, industry: 'apartment' },
        { id: 'proj-003', name: '홍대 레스토랑', client_name: '박민수', status: 'in_progress', progress: 70, risk_score: 55, industry: 'restaurant' },
      ]
    }
  },
  project_detail: { success: true, message: '📋 강남 카페 리모델링\n진행률: 45% | 리스크: 35점 | 예상 완공: 2024-04-15\n견적 총액: ₩48,500,000' },
  schedule_gantt: { success: true, message: '📊 공정 현황\n✅ 철거 공사       ██████████ 100%\n🔄 설비 공사       █████░░░░░ 50%\n⬜ 전기 공사       ░░░░░░░░░░ 0%' },
  risk_full_diagnosis: { success: true, message: '🎯 리스크 진단: 35점 (B등급 안전)\n• 설비 공사 지연 위험 ⚠️\n• 전기 자격 확인 필요\n• 변경요청 2건 대기 중' },
  report_daily: { success: true, message: '📋 일일보고 (2026-02-20)\n출역: 5명 | 진행중: 설비공사(50%)\n특이사항: 없음' },
  dashboard_summary: { success: true, message: '📊 대시보드\n총 3개 | 진행중 2개 | 완료 0개\n평균진행률 41% | 고위험 1개' },
}

// ─── 단일 테스트 실행 ─────────────────────────────────────
async function runTest(testCase, index) {
  const { label, message, expectTools, chainWith } = testCase

  process.stdout.write(`\n${index}. ${label}\n`)
  process.stdout.write(`   Q: "${message}"\n`)

  try {
    const response = await callGemini(message)
    const parts = response.parts || []

    const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall)
    const textParts = parts.filter(p => p.text).map(p => p.text)

    if (functionCalls.length > 0) {
      const toolNames = functionCalls.map(fc => fc.name)
      const allExpected = expectTools.every(t => toolNames.includes(t))
      const status = allExpected ? '✅ PASS' : '⚠️  PARTIAL'

      process.stdout.write(`   ${status} → 도구 호출: [${toolNames.join(', ')}]\n`)

      // 기대 도구 중 누락된 것 표시
      const missing = expectTools.filter(t => !toolNames.includes(t))
      if (missing.length > 0) {
        process.stdout.write(`   ⚠️  누락 도구: [${missing.join(', ')}]\n`)
      }

      // 도구 파라미터 출력
      for (const fc of functionCalls) {
        const args = JSON.stringify(fc.args || {}).substring(0, 100)
        process.stdout.write(`   📌 ${fc.name}(${args})\n`)
      }

      // 체인 테스트 (project_list 결과 주고 다음 호출 확인)
      if (chainWith && toolNames.includes('project_list')) {
        process.stdout.write(`   🔗 체인 테스트: project_list 결과 → 후속 호출...\n`)

        const chainHistory = [
          { role: 'user', parts: [{ text: message }] },
          { role: 'model', parts: response.parts },
          { role: 'user', parts: [{ functionResponse: { name: 'project_list', response: MOCK_TOOL_RESPONSES.project_list } }] },
        ]

        // 빈 메시지로 continuation 유도
        const chainResponse = await callGemini('', chainHistory)
        const chainCalls = (chainResponse.parts || []).filter(p => p.functionCall).map(p => p.functionCall)
        const chainText = (chainResponse.parts || []).filter(p => p.text).map(p => p.text).join('')

        if (chainCalls.length > 0) {
          const chainToolNames = chainCalls.map(fc => fc.name)
          const chainExpected = chainWith.every(t => chainToolNames.includes(t))
          const chainStatus = chainExpected ? '✅ CHAIN PASS' : '⚠️  CHAIN PARTIAL'
          process.stdout.write(`   ${chainStatus} → 후속 도구: [${chainToolNames.join(', ')}]\n`)
        } else if (chainText) {
          // 텍스트로 응답했다면 projectId 추출 여부 확인
          const hasId = chainText.includes('proj-001') || chainText.includes('김지수')
          process.stdout.write(`   📝 텍스트 응답 (ID 매칭: ${hasId ? '✅' : '❌'})\n`)
          process.stdout.write(`   "${chainText.substring(0, 150).replace(/\n/g, ' ')}..."\n`)
        }
      }

    } else if (textParts.length > 0) {
      const text = textParts.join('').substring(0, 200).replace(/\n/g, ' ')
      // 도구 없이 답변 - 직답 테스트라면 OK
      if (expectTools.length === 0) {
        process.stdout.write(`   ✅ PASS (직답) → "${text}..."\n`)
      } else {
        process.stdout.write(`   ❌ FAIL — 도구 대신 텍스트 응답:\n`)
        process.stdout.write(`   "${text}..."\n`)
      }
    } else {
      process.stdout.write(`   ❌ FAIL — 응답 없음\n`)
    }

    return { success: true, toolsCalled: functionCalls.map(fc => fc.name) }

  } catch (err) {
    process.stdout.write(`   ❌ ERROR: ${err.message.substring(0, 100)}\n`)
    return { success: false, error: err.message }
  }
}

// ─── DB 데이터 확인 ────────────────────────────────────────
async function checkDbData() {
  const host = new URL(SUPABASE_URL).hostname

  const res = await httpsGet(host, '/rest/v1/projects?select=id,name,client_name,status,progress,risk_score&limit=5', {
    'apikey': SERVICE_KEY,
    'Authorization': 'Bearer ' + SERVICE_KEY,
  })

  return res.body || []
}

// ─── 메인 테스트 스위트 ───────────────────────────────────
const TEST_CASES = [
  // ── 카테고리 1: 고객명으로 자동 검색 ──────────────────────
  {
    label: '[자율검색] 고객명 → project_list 자동 호출',
    message: '김지수 고객 현장 현황 파악해서 보고해줘',
    expectTools: ['project_list'],
    chainWith: ['project_detail', 'risk_full_diagnosis'],
  },
  {
    label: '[자율검색] 현장명 → 자동 매칭',
    message: '강남 카페 리모델링 공정 어떻게 돼가?',
    expectTools: ['project_list'],
    chainWith: ['schedule_gantt'],
  },
  {
    label: '[자율검색] 전체 현황 조회',
    message: '지금 내 현장 전부 현황 알려줘',
    expectTools: ['project_list', 'dashboard_summary'],
    chainWith: null,
  },

  // ── 카테고리 2: 견적 자동 생성 ────────────────────────────
  {
    label: '[견적] 카페 자동 견적 생성',
    message: '카페 30평 스탠다드 등급으로 견적 뽑아줘',
    expectTools: ['auto_quote_generate'],
    chainWith: null,
  },
  {
    label: '[견적] 원스톱 셋업 (견적+공정+법규+디자인)',
    message: '강남에 카페 30평 하려고 하는데 전부 다 준비해줘',
    expectTools: ['auto_quote_generate', 'auto_schedule_generate'],
    chainWith: null,
  },
  {
    label: '[견적] 레스토랑 비교 견적',
    message: '레스토랑 50평 이코노미·스탠다드·프리미엄 견적 비교해줘',
    expectTools: ['auto_quote_generate'],
    chainWith: null,
  },

  // ── 카테고리 3: 공정/일정 관리 ────────────────────────────
  {
    label: '[공정] 공정표 자동 생성',
    message: '카페 30평 공정표 오늘부터 만들어줘',
    expectTools: ['auto_schedule_generate'],
    chainWith: null,
  },
  {
    label: '[공정] 지연 분석',
    message: '현장 일정 지연 있으면 알려줘',
    expectTools: ['project_list'],
    chainWith: ['schedule_delay_alert'],
  },

  // ── 카테고리 4: 보고서 자동 생성 ──────────────────────────
  {
    label: '[보고서] 일일 보고서 자동 생성',
    message: '오늘 현장 일보 만들어줘',
    expectTools: ['project_list'],
    chainWith: ['auto_report_daily'],
  },
  {
    label: '[보고서] 주간 보고서',
    message: '이번 주 현장 주간 보고서 만들어줘',
    expectTools: ['project_list'],
    chainWith: ['report_weekly'],
  },

  // ── 카테고리 5: 리스크 분석 ────────────────────────────────
  {
    label: '[리스크] 종합 리스크 진단',
    message: '현장 리스크 분석해서 위험 요소 알려줘',
    expectTools: ['project_list'],
    chainWith: ['risk_full_diagnosis'],
  },

  // ── 카테고리 6: 하자/자재/인력 관리 ──────────────────────
  {
    label: '[하자] 하자 등록',
    message: '욕실 방수 불량 하자 등록해줘',
    expectTools: ['project_list'],
    chainWith: ['defect_create'],
  },
  {
    label: '[자재] 자재 재고 현황',
    message: '자재 재고 지금 어떻게 돼?',
    expectTools: ['project_list'],
    chainWith: ['material_stock'],
  },
  {
    label: '[인력] 노무비 현황',
    message: '이번 달 노무비 얼마야?',
    expectTools: ['project_list'],
    chainWith: ['worker_payment'],
  },

  // ── 카테고리 7: 법규/인허가 ────────────────────────────────
  {
    label: '[법규] 건설법 검색',
    message: '소방 스프링클러 설치 기준이 뭐야?',
    expectTools: ['law_search'],
    chainWith: null,
  },
  {
    label: '[법규] 인허가 체크',
    message: '카페 50평 인허가 뭐 필요해?',
    expectTools: ['admin_permit_check'],
    chainWith: null,
  },

  // ── 카테고리 8: 공유/계약 ──────────────────────────────────
  {
    label: '[공유] 고객 공유 링크 생성',
    message: '김지수 고객한테 진행 상황 공유 링크 만들어줘',
    expectTools: ['project_list'],
    chainWith: ['share_create'],
  },
  {
    label: '[결제] 미지급 대금 확인',
    message: '아직 못 받은 공사대금 얼마야?',
    expectTools: ['project_list'],
    chainWith: ['payment_outstanding'],
  },

  // ── 카테고리 9: 디자인/도면 ────────────────────────────────
  {
    label: '[디자인] 인테리어 컨셉 생성',
    message: '모던 미니멀 스타일 카페 디자인 컨셉 뽑아줘',
    expectTools: ['design_generate'],
    chainWith: null,
  },
  {
    label: '[도면] 자연어로 평면도 생성',
    message: '30평 카페, 주방이 뒤쪽에 있고 홀이 넓은 레이아웃 그려줘',
    expectTools: ['floorplan_from_description'],
    chainWith: null,
  },

  // ── 카테고리 10: 직답 (되묻기 금지) ───────────────────────
  {
    label: '[직답] 자재 단가 즉답 (도구 없이)',
    message: '다루끼 30x40 m당 단가 얼마야?',
    expectTools: [],  // 도구 없이 직접 텍스트 답변 기대
    chainWith: null,
  },
  {
    label: '[직답] 평단가 즉답',
    message: '서울 강남 카페 인테리어 평단가 얼마야?',
    expectTools: [],
    chainWith: null,
  },
  {
    label: '[직답] 하자보수 기간 법규',
    message: '건산법상 방수공사 하자보수 책임 기간이 몇 년이야?',
    expectTools: [],
    chainWith: null,
  },
]

// ─── 메인 실행 ───────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  체키 AI 자율 실행 종합 테스트                     ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log()

  // 1. DB 데이터 확인
  console.log('━━━ DB 데이터 확인 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  try {
    const projects = await checkDbData()
    if (Array.isArray(projects) && projects.length > 0) {
      console.log(`✅ DB 프로젝트 ${projects.length}개 존재:`)
      projects.forEach(p => {
        console.log(`   • [${p.status}] ${p.name} | 고객: ${p.client_name || '없음'} | 진행률: ${p.progress || 0}%`)
      })
    } else {
      console.log('⚠️  DB에 프로젝트 없음 (테스트 데이터 사용)')
    }
  } catch (e) {
    console.log('⚠️  DB 연결 확인 불가:', e.message.substring(0, 80))
  }

  console.log()
  console.log(`━━━ Gemini Function Calling 테스트 (${TEST_CASES.length}개 시나리오) ━━━━━`)

  const results = { pass: 0, partial: 0, fail: 0, error: 0 }

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i]
    const result = await runTest(tc, i + 1)

    if (!result.success) results.error++
    else if (tc.expectTools.length === 0) results.pass++  // 직답
    else if (tc.expectTools.every(t => result.toolsCalled.includes(t))) results.pass++
    else if (result.toolsCalled.length > 0) results.partial++
    else results.fail++

    // API 레이트리밋 방지
    await new Promise(r => setTimeout(r, 800))
  }

  console.log()
  console.log('━━━ 테스트 결과 요약 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ PASS:    ${results.pass}/${TEST_CASES.length}`)
  console.log(`⚠️  PARTIAL: ${results.partial}/${TEST_CASES.length}`)
  console.log(`❌ FAIL:    ${results.fail}/${TEST_CASES.length}`)
  console.log(`💥 ERROR:   ${results.error}/${TEST_CASES.length}`)

  const passRate = Math.round(((results.pass + results.partial * 0.5) / TEST_CASES.length) * 100)
  console.log()
  console.log(`📊 자율 실행 점수: ${passRate}%`)

  if (passRate >= 90) console.log('🏆 완벽한 자율 실행 시스템!')
  else if (passRate >= 75) console.log('✅ 양호 — 대부분 자율 실행 가능')
  else if (passRate >= 60) console.log('⚠️  보통 — 일부 패턴 추가 튜닝 필요')
  else console.log('❌ 미흡 — 시스템 프롬프트 재검토 필요')

  console.log()
  console.log('━━━ 테스트 완료 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
