/**
 * 체키 AI 자율 실행 테스트 - Part 2 (남은 카테고리)
 * Gemini 2.5 Flash 무료: 10 RPM → 7초 딜레이
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const t = line.trim()
  if (t.startsWith('#') || !t.includes('=')) return
  const eq = t.indexOf('=')
  env[t.substring(0, eq).trim()] = t.substring(eq + 1).trim()
})

const GEMINI_KEY = env.GEMINI_API_KEY

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

const sleep = ms => new Promise(r => setTimeout(r, ms))

const SYSTEM_PROMPT = `당신은 체키(Cheki)입니다. 대한민국 인테리어·건설 현장 전담 AI 비서.

■ 절대 규칙
• 프로젝트 ID(UUID) 절대 요청 금지
• 고객명·현장명 언급 시 즉시 project_list 호출 → 자동 매칭
• 도구 먼저 실행, 질문 나중

■ 자율 실행 패턴
• 고객명 → project_list → 매칭 → 후속 도구
• "현황 파악해서 보고해" → project_list → project_detail + schedule_gantt + risk_full_diagnosis + report_daily 병렬
• "전체 현황" → dashboard_summary + project_list 병렬
• "견적 뽑아줘" → auto_quote_generate
• "공정표 만들어" → auto_schedule_generate
• "보고서 만들어" → auto_report_daily + checklist_progress
• 단가·시세 질문 → 즉시 수치 답변, 도구 호출 불필요

■ 반드시 한국어로 답변`

const TOOLS = [{
  functionDeclarations: [
    { name: 'project_list', description: '내 프로젝트 목록 조회. 고객명·프로젝트명 매칭 시 우선 호출.', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'project_detail', description: '프로젝트 상세 정보 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'dashboard_summary', description: '전체 대시보드 요약', parameters: { type: 'OBJECT', properties: {} } },
    { name: 'auto_quote_generate', description: '자동 견적서 생성', parameters: { type: 'OBJECT', properties: { industryType: { type: 'STRING' }, area: { type: 'NUMBER' }, grade: { type: 'STRING' } }, required: ['industryType', 'area', 'grade'] } },
    { name: 'auto_quote_compare', description: '여러 등급 견적 비교', parameters: { type: 'OBJECT', properties: { industryType: { type: 'STRING' }, area: { type: 'NUMBER' } }, required: ['industryType', 'area'] } },
    { name: 'auto_schedule_generate', description: '자동 공정표 생성', parameters: { type: 'OBJECT', properties: { industryType: { type: 'STRING' }, area: { type: 'NUMBER' }, startDate: { type: 'STRING' } }, required: ['industryType', 'area', 'startDate'] } },
    { name: 'auto_law_check', description: '건축법규 자동 체크', parameters: { type: 'OBJECT', properties: { industryType: { type: 'STRING' }, area: { type: 'NUMBER' } }, required: ['industryType', 'area'] } },
    { name: 'design_generate', description: 'AI 인테리어 디자인 컨셉', parameters: { type: 'OBJECT', properties: { industryType: { type: 'STRING' }, style: { type: 'STRING' } }, required: ['industryType', 'style'] } },
    { name: 'auto_report_daily', description: '일일 현장 보고서 자동 생성', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' }, date: { type: 'STRING' } } } },
    { name: 'report_weekly', description: '주간 보고서', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'schedule_gantt', description: '간트차트 공정표', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'schedule_delay_alert', description: '지연 공정 감지', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'risk_full_diagnosis', description: '전체 리스크 종합 진단', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'defect_create', description: '하자 등록', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' }, title: { type: 'STRING' } }, required: ['projectId', 'title'] } },
    { name: 'defect_list', description: '하자 목록 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'material_stock', description: '자재 재고 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'worker_payment', description: '노무비 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'share_create', description: '고객 공유 링크 생성', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'payment_outstanding', description: '미지급 대금 조회', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'law_search', description: '건설 법률 검색', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' } }, required: ['query'] } },
    { name: 'admin_permit_check', description: '인허가 필요 여부 확인', parameters: { type: 'OBJECT', properties: { industry: { type: 'STRING' }, area: { type: 'NUMBER' } } } },
    { name: 'floorplan_from_description', description: '자연어로 평면도 생성', parameters: { type: 'OBJECT', properties: { description: { type: 'STRING' }, industryType: { type: 'STRING' } }, required: ['description'] } },
    { name: 'cost_budget_compare', description: '예산 vs 실제 비용 비교', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'change_record', description: '변경요청 등록', parameters: { type: 'OBJECT', properties: { title: { type: 'STRING' }, reason: { type: 'STRING' }, costChange: { type: 'NUMBER' } } } },
    { name: 'checklist_progress', description: '체크리스트 진행률', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
    { name: 'evidence_verify', description: '증빙 무결성 검증', parameters: { type: 'OBJECT', properties: { projectId: { type: 'STRING' } }, required: ['projectId'] } },
  ]
}]

// project_list mock 응답
const PROJECT_LIST_MOCK = {
  success: true,
  message: '📁 프로젝트 목록 (3개)\n  • 🍵 [ID:proj-001] 강남 카페 리모델링 | 고객: 김지수 | 진행중 | 진행률 45%\n  • 🏠 [ID:proj-002] 서초 아파트 인테리어 | 고객: 이영희 | 계획 | 진행률 10%\n  • 🍽️ [ID:proj-003] 홍대 레스토랑 | 고객: 박민수 | 진행중 | 진행률 70%',
  data: { projects: [{ id: 'proj-001', name: '강남 카페 리모델링', client_name: '김지수', status: 'in_progress' }] }
}

async function callGemini(contents) {
  // 재시도 로직 (3회 최대)
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await httpsPost(
      'generativelanguage.googleapis.com',
      `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      { 'Content-Type': 'application/json' },
      {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        tools: TOOLS,
        contents,
        generation_config: { temperature: 0.1, max_output_tokens: 800 },
      }
    )
    if (res.status === 429) {
      const wait = (attempt + 1) * 15000
      process.stdout.write(` [rate limit, ${wait/1000}s 대기]`)
      await sleep(wait)
      continue
    }
    if (res.status !== 200) throw new Error(`API ${res.status}`)
    return res.body?.candidates?.[0]?.content
  }
  throw new Error('rate limit 초과 — 나중에 재시도')
}

// 테스트 케이스 (Part 2: 카테고리 5-10)
const TESTS = [
  // ─ 카테고리 5: 공정표 자동 생성 ─
  {
    cat: '공정',
    label: '공정표 자동 생성',
    msg: '카페 30평 공정표 오늘부터 만들어줘',
    expect: ['auto_schedule_generate'],
    chain: null,
  },
  {
    cat: '공정',
    label: '원스톱 셋업 (견적+공정+법규)',
    msg: '강남에 카페 30평 인테리어 하려는데 전부 다 준비해줘',
    expect: ['auto_quote_generate', 'auto_schedule_generate'],
    chain: null,
  },
  // ─ 카테고리 6: 보고서 ─
  {
    cat: '보고서',
    label: '일일 보고서 (현장 일보)',
    msg: '오늘 아피체 리모델링 현장 일보 만들어줘',
    expect: ['project_list'],
    chain: { tool: 'project_list', next: ['auto_report_daily'] },
  },
  {
    cat: '보고서',
    label: '주간 보고서',
    msg: '이번 주 현장 주간 보고서 만들어줘',
    expect: ['project_list'],
    chain: { tool: 'project_list', next: ['report_weekly'] },
  },
  // ─ 카테고리 7: 리스크 ─
  {
    cat: '리스크',
    label: '종합 리스크 진단',
    msg: '현장 위험 요소 전부 분석해서 알려줘',
    expect: ['project_list'],
    chain: { tool: 'project_list', next: ['risk_full_diagnosis'] },
  },
  // ─ 카테고리 8: 하자/자재/인력 ─
  {
    cat: '하자',
    label: '하자 등록',
    msg: '아피체 현장 욕실 방수 불량 하자 등록해줘',
    expect: ['project_list'],
    chain: { tool: 'project_list', next: ['defect_create'] },
  },
  {
    cat: '자재',
    label: '자재 재고 현황',
    msg: '자재 재고 지금 어떻게 돼?',
    expect: ['project_list'],
    chain: { tool: 'project_list', next: ['material_stock'] },
  },
  {
    cat: '인력',
    label: '노무비 현황',
    msg: '이번 달 노무비 얼마야?',
    expect: ['project_list'],
    chain: { tool: 'project_list', next: ['worker_payment'] },
  },
  // ─ 카테고리 9: 법규/인허가 ─
  {
    cat: '법규',
    label: '소방 법규 검색',
    msg: '소방 스프링클러 설치 기준이 뭐야?',
    expect: ['law_search'],
    chain: null,
  },
  {
    cat: '법규',
    label: '인허가 체크',
    msg: '카페 50평 오픈 시 인허가 뭐 필요해?',
    expect: ['admin_permit_check'],
    chain: null,
  },
  // ─ 카테고리 10: 공유/결제 ─
  {
    cat: '공유',
    label: '고객 공유 링크',
    msg: '이영희 고객한테 공사 진행 상황 링크 만들어줘',
    expect: ['project_list'],
    chain: { tool: 'project_list', next: ['share_create'] },
  },
  {
    cat: '결제',
    label: '미지급 대금',
    msg: '아직 못 받은 공사 대금 얼마야?',
    expect: ['project_list'],
    chain: { tool: 'project_list', next: ['payment_outstanding'] },
  },
  // ─ 카테고리 11: 디자인/도면 ─
  {
    cat: '디자인',
    label: '인테리어 컨셉 생성',
    msg: '모던 미니멀 스타일 카페 디자인 컨셉 뽑아줘',
    expect: ['design_generate'],
    chain: null,
  },
  {
    cat: '도면',
    label: '자연어 평면도 생성',
    msg: '30평 카페 주방 뒤쪽, 홀 넓게 평면도 그려줘',
    expect: ['floorplan_from_description'],
    chain: null,
  },
  // ─ 카테고리 12: 직답 (도구 없이 즉시 답변) ─
  {
    cat: '직답',
    label: '자재 단가 즉답',
    msg: '다루끼 30x40 m당 단가 얼마야?',
    expect: [],  // 도구 없이 직답 기대
    chain: null,
  },
  {
    cat: '직답',
    label: '평단가 즉답',
    msg: '서울 강남 카페 인테리어 평단가 얼마야?',
    expect: [],
    chain: null,
  },
  {
    cat: '직답',
    label: '법규 즉답',
    msg: '건산법상 방수공사 하자보수 책임 기간 몇 년이야?',
    expect: [],
    chain: null,
  },
  // ─ 카테고리 13: 복잡한 복합 명령 ─
  {
    cat: '복합',
    label: '이용주 고객 현장 종합 보고',
    msg: '이용주 고객 현장 찾아서 현황파악하고 리스크 분석 포함해서 보고해줘',
    expect: ['project_list'],
    chain: { tool: 'project_list', next: ['project_detail', 'risk_full_diagnosis'] },
  },
  {
    cat: '복합',
    label: '변경사항 기록',
    msg: '벽체 추가로 타일 공사 비용 150만원 더 늘었어, 변경 기록해줘',
    expect: ['change_record'],
    chain: null,
  },
  {
    cat: '복합',
    label: '증빙 무결성 검증',
    msg: '현장 증빙 파일들 위변조 없는지 검증해줘',
    expect: ['project_list'],
    chain: { tool: 'project_list', next: ['evidence_verify'] },
  },
]

async function runTest(tc, i, total) {
  process.stdout.write(`\n${i}/${total} [${tc.cat}] ${tc.label}\n`)
  process.stdout.write(`     Q: "${tc.msg}"\n`)

  const contents = [{ role: 'user', parts: [{ text: tc.msg }] }]

  let response
  try {
    response = await callGemini(contents)
    process.stdout.write('\n')
  } catch (e) {
    process.stdout.write(`\n     ❌ ERROR: ${e.message}\n`)
    return { result: 'error' }
  }

  const parts = response.parts || []
  const calls = parts.filter(p => p.functionCall).map(p => p.functionCall)
  const texts = parts.filter(p => p.text).map(p => p.text)

  let testResult = 'fail'

  if (calls.length > 0) {
    const names = calls.map(c => c.name)
    const allExpected = tc.expect.every(t => names.includes(t))
    const icon = allExpected ? '✅' : '⚠️ '
    process.stdout.write(`     ${icon} 도구 호출: [${names.join(', ')}]\n`)
    for (const c of calls) {
      process.stdout.write(`     📌 ${c.name}(${JSON.stringify(c.args||{}).substring(0,80)})\n`)
    }

    testResult = allExpected ? 'pass' : 'partial'

    // 체인 테스트
    if (tc.chain && names.includes(tc.chain.tool)) {
      process.stdout.write(`     🔗 체인: ${tc.chain.tool} 응답 → 후속 도구 확인...\n`)
      await sleep(7000)

      const chainContents = [
        { role: 'user', parts: [{ text: tc.msg }] },
        { role: 'model', parts: response.parts },
        { role: 'user', parts: [{ functionResponse: { name: tc.chain.tool, response: PROJECT_LIST_MOCK } }] },
      ]

      try {
        const chainResp = await callGemini(chainContents)
        process.stdout.write('\n')
        const chainCalls = (chainResp.parts || []).filter(p => p.functionCall).map(p => p.functionCall)
        const chainTexts = (chainResp.parts || []).filter(p => p.text).map(p => p.text)

        if (chainCalls.length > 0) {
          const chainNames = chainCalls.map(c => c.name)
          const chainOk = tc.chain.next.every(t => chainNames.includes(t))
          const chainIcon = chainOk ? '✅' : '⚠️ '
          process.stdout.write(`     ${chainIcon} 후속 도구: [${chainNames.join(', ')}]\n`)
          testResult = chainOk ? 'pass' : 'partial'
        } else if (chainTexts.length > 0) {
          const txt = chainTexts.join('').substring(0, 150).replace(/\n/g, ' ')
          process.stdout.write(`     📝 텍스트 응답: "${txt}"\n`)
          testResult = 'partial'
        }
      } catch(e) {
        process.stdout.write(`\n     ⚠️  체인 에러: ${e.message}\n`)
      }
    }

  } else if (texts.length > 0) {
    const txt = texts.join('').substring(0, 200).replace(/\n/g, ' ')
    if (tc.expect.length === 0) {
      process.stdout.write(`     ✅ 직답: "${txt.substring(0, 120)}..."\n`)
      testResult = 'pass'
    } else {
      process.stdout.write(`     ❌ 도구 대신 텍스트: "${txt.substring(0, 100)}..."\n`)
      testResult = 'fail'
    }
  }

  return { result: testResult }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  체키 자율 실행 테스트 Part 2 (카테고리 5~13)      ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log(`총 ${TESTS.length}개 시나리오 | Gemini 2.5 Flash | 7초 딜레이`)
  console.log()

  const counts = { pass: 0, partial: 0, fail: 0, error: 0 }
  const catResults = {}

  for (let i = 0; i < TESTS.length; i++) {
    const tc = TESTS[i]
    const { result } = await runTest(tc, i + 1, TESTS.length)
    counts[result] = (counts[result] || 0) + 1
    if (!catResults[tc.cat]) catResults[tc.cat] = { pass: 0, total: 0 }
    catResults[tc.cat].total++
    if (result === 'pass') catResults[tc.cat].pass++

    if (i < TESTS.length - 1) {
      process.stdout.write(`     ⏳ 다음 테스트까지 7초 대기...\n`)
      await sleep(7000)
    }
  }

  console.log()
  console.log('━━━ 카테고리별 결과 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  for (const [cat, r] of Object.entries(catResults)) {
    const icon = r.pass === r.total ? '✅' : r.pass > 0 ? '⚠️ ' : '❌'
    console.log(`  ${icon} [${cat}] ${r.pass}/${r.total}`)
  }

  console.log()
  console.log('━━━ 최종 결과 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ PASS:    ${counts.pass}/${TESTS.length}`)
  console.log(`⚠️  PARTIAL: ${counts.partial || 0}/${TESTS.length}`)
  console.log(`❌ FAIL:    ${counts.fail || 0}/${TESTS.length}`)
  console.log(`💥 ERROR:   ${counts.error || 0}/${TESTS.length}`)

  const score = Math.round(((counts.pass + (counts.partial || 0) * 0.5) / TESTS.length) * 100)
  console.log()
  console.log(`📊 자율 실행 점수: ${score}%`)
  if (score >= 85) console.log('🏆 탁월 — 현장에서 바로 쓸 수 있는 자율 실행 시스템!')
  else if (score >= 70) console.log('✅ 양호 — 핵심 기능 자율 실행 가능')
  else if (score >= 55) console.log('⚠️  보통 — 추가 튜닝 필요')
  else console.log('❌ 미흡')

  console.log('━━━ 테스트 완료 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
