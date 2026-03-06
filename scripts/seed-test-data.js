/**
 * 테스트 데이터 시딩 - 전체 워크플로우 검증용
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const envContent = fs.readFileSync('.env.local', 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed.startsWith('#') || trimmed.indexOf('=') === -1) return
  const eq = trimmed.indexOf('=')
  const key = trimmed.substring(0, eq).trim()
  const val = trimmed.substring(eq + 1).trim()
  if (key) env[key] = val
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function seedTestData() {
  console.log('🌱 테스트 데이터 생성 시작\n')

  // 1. 기존 프로젝트 가져오기
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .limit(1)
    .single()

  if (!projects) {
    console.log('❌ 프로젝트가 없습니다. 먼저 프로젝트를 생성하세요.')
    return
  }

  const projectId = projects.id
  console.log(`✅ 프로젝트 ID: ${projectId}\n`)

  // 2. 진단 응답 생성
  console.log('📋 진단 응답 생성...')
  await supabase.from('diagnostic_responses').insert([
    {
      project_id: projectId,
      category: '구조안전',
      item_code: 'STR_001',
      status: 'confirmed',
      note: '테스트 진단 항목'
    },
    {
      project_id: projectId,
      category: '전기설비',
      item_code: 'ELC_001',
      status: 'need_check',
      note: '확인 필요'
    }
  ])

  // 3. 견적서 생성 (헤더)
  console.log('💰 견적서 생성...')
  const { data: quote } = await supabase.from('quotes').insert([
    {
      project_id: projectId,
      quote_number: 'QT-2026-001',
      total_amount: 15000000,
      status: 'draft',
      valid_until: '2026-04-30'
    }
  ]).select().single()

  if (quote) {
    // 견적 항목 생성
    await supabase.from('quote_line_items').insert([
      {
        quote_id: quote.id,
        category: '철거',
        item_name: '기존 시설 철거',
        quantity: 1,
        unit: '식',
        unit_price: 3000000,
        total_price: 3000000
      },
      {
        quote_id: quote.id,
        category: '바닥',
        item_name: '타일 시공',
        quantity: 20,
        unit: '평',
        unit_price: 85000,
        total_price: 1700000
      }
    ])
  }

  // 4. 변경 사항 생성
  console.log('📝 변경 관리 생성...')
  const { data: changeOrder, error: changeError } = await supabase.from('change_orders').insert([
    {
      project_id: projectId,
      change_number: 'CO-001',
      title: '타일 브랜드 변경',
      description: '고객 요청으로 타일 브랜드를 프리미엄으로 변경',
      reason: '고객 요청',
      cost_impact: 500000,
      schedule_impact_days: 3,
      status: 'pending'
    }
  ])
  if (changeError) console.log('   ⚠️ change_orders 에러:', changeError.message)

  // 5. 이슈 생성
  console.log('⚠️ 이슈 생성...')
  const { data: issue, error: issueError } = await supabase.from('issues').insert([
    {
      project_id: projectId,
      title: '벽체 균열 발견',
      description: '서쪽 벽면에 미세 균열 발견, 보수 필요',
      severity: 'medium',
      status: 'open',
      category: '하자'
    }
  ])
  if (issueError) console.log('   ⚠️ issues 에러:', issueError.message)

  // 6. 필수 공정 생성
  console.log('🔨 필수 공정 생성...')
  await supabase.from('mandatory_processes').insert([
    {
      project_id: projectId,
      process_name: '방수 작업',
      is_completed: false
    },
    {
      project_id: projectId,
      process_name: '전기 인입',
      is_completed: true,
      completed_at: new Date().toISOString()
    }
  ])

  // 7. 일일 보고 생성
  console.log('📊 일일 보고 생성...')
  const { data: report, error: reportError } = await supabase.from('daily_reports').insert([
    {
      project_id: projectId,
      report_date: new Date().toISOString().split('T')[0],
      weather: '맑음',
      temperature: '15℃',
      work_summary: '철거 작업 진행 중',
      workers_count: 5,
      progress_note: '예정대로 진행 중'
    }
  ])
  if (reportError) console.log('   ⚠️ daily_reports 에러:', reportError.message)

  console.log('\n✅ 테스트 데이터 생성 완료!')
  console.log('\n다시 확인: node scripts/check-all-tables.js')
}

seedTestData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err.message)
    process.exit(1)
  })
