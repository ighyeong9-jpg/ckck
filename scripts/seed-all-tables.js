/**
 * 모든 빈 테이블에 테스트 데이터 채우기
 * 실제 스키마 기반
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

async function seedAll() {
  console.log('🌱 전체 테이블 데이터 채우기\n')

  // 1. 프로젝트 가져오기
  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id')
    .limit(1)
    .maybeSingle()

  if (!project) {
    console.log('❌ 프로젝트가 없습니다.')
    return
  }

  const projectId = project.id
  const userId = project.user_id
  console.log(`✅ 프로젝트: ${projectId}`)
  console.log(`✅ 사용자: ${userId}\n`)

  let successCount = 0
  let errorCount = 0

  // 2. operational_constraints
  console.log('🔧 operational_constraints...')
  const { error: e1 } = await supabase.from('operational_constraints').insert([
    {
      project_id: projectId,
      constraint_type: '소음 제한',
      description: '평일 오후 8시 이후 소음 공사 금지',
      risk_weight: 1.2
    },
    {
      project_id: projectId,
      constraint_type: '출입 시간',
      description: '주말 공사 불가',
      risk_weight: 1.0
    }
  ])
  if (e1) { console.log(`   ❌ ${e1.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 3. change_orders
  console.log('📝 change_orders...')
  const { error: e2 } = await supabase.from('change_orders').insert([
    {
      project_id: projectId,
      change_number: 'CO-2026-001',
      title: '타일 브랜드 변경',
      description: '고객 요청으로 프리미엄 타일로 변경',
      reason: '고객 요청',
      cost_impact: 500000,
      schedule_impact_days: 3,
      status: 'pending',
      requested_by: userId
    }
  ])
  if (e2) { console.log(`   ❌ ${e2.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 4. scope_items
  console.log('📋 scope_items...')
  const { error: e3 } = await supabase.from('scope_items').insert([
    {
      project_id: projectId,
      category: '철거',
      item_name: '기존 벽체 철거',
      quantity: 1,
      unit: '식',
      unit_price: 2000000,
      total_price: 2000000
    },
    {
      project_id: projectId,
      category: '바닥',
      item_name: '강화마루 시공',
      quantity: 25,
      unit: '평',
      unit_price: 120000,
      total_price: 3000000
    }
  ])
  if (e3) { console.log(`   ❌ ${e3.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 5. payments
  console.log('💰 payments...')
  const { error: e4 } = await supabase.from('payments').insert([
    {
      project_id: projectId,
      payment_stage: 'contract',
      percentage: 10,
      amount: 1500000,
      due_date: '2026-03-15',
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: '계좌이체'
    },
    {
      project_id: projectId,
      payment_stage: 'mid1',
      percentage: 40,
      amount: 6000000,
      due_date: '2026-04-01',
      status: 'pending'
    }
  ])
  if (e4) { console.log(`   ❌ ${e4.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 6. compliance_checks
  console.log('✔️ compliance_checks...')
  const { error: e5 } = await supabase.from('compliance_checks').insert([
    {
      project_id: projectId,
      checklist_type: '건축법',
      item_code: 'BUILD_001',
      is_compliant: true,
      checked_at: new Date().toISOString(),
      checked_by: userId
    }
  ])
  if (e5) { console.log(`   ❌ ${e5.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 7. defects
  console.log('🔴 defects...')
  const { data: defect, error: e6 } = await supabase.from('defects').insert([
    {
      project_id: projectId,
      title: '벽체 균열',
      description: '서쪽 벽면에 미세 균열 발견',
      severity: 'medium',
      status: 'reported',
      location: '서쪽 벽면',
      reported_by: userId
    }
  ]).select().single()
  if (e6) { console.log(`   ❌ ${e6.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 8. defect_updates
  if (defect) {
    console.log('💬 defect_updates...')
    const { error: e7 } = await supabase.from('defect_updates').insert([
      {
        defect_id: defect.id,
        message: '보수 작업 예정',
        created_by: userId
      }
    ])
    if (e7) { console.log(`   ❌ ${e7.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }
  }

  // 9. files
  console.log('📎 files...')
  const { error: e8 } = await supabase.from('files').insert([
    {
      project_id: projectId,
      file_name: '설계도면.pdf',
      file_url: 'https://example.com/drawing.pdf',
      file_type: 'application/pdf',
      file_size: 2048000,
      uploaded_by: userId,
      category: '도면'
    }
  ])
  if (e8) { console.log(`   ❌ ${e8.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 10. audit_logs
  console.log('📜 audit_logs...')
  const { error: e9 } = await supabase.from('audit_logs').insert([
    {
      user_id: userId,
      action: 'project.created',
      resource_type: 'project',
      resource_id: projectId,
      details: { message: '프로젝트 생성됨' }
    }
  ])
  if (e9) { console.log(`   ❌ ${e9.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 11. reports
  console.log('📊 reports...')
  const { error: e10 } = await supabase.from('reports').insert([
    {
      project_id: projectId,
      report_type: 'daily',
      title: '3월 6일 일일보고',
      content: '철거 작업 80% 완료',
      created_by: userId
    }
  ])
  if (e10) { console.log(`   ❌ ${e10.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 12. shares
  console.log('🔗 shares...')
  const { error: e11 } = await supabase.from('shares').insert([
    {
      project_id: projectId,
      share_code: 'SHARE-' + Math.random().toString(36).substring(7).toUpperCase(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: userId
    }
  ])
  if (e11) { console.log(`   ❌ ${e11.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 13. special_terms
  console.log('📜 special_terms...')
  const { error: e12 } = await supabase.from('special_terms').insert([
    {
      project_id: projectId,
      term_type: '계약 특이사항',
      description: '공사 기간 중 임시 사무실 제공',
      agreed_by_client: true
    }
  ])
  if (e12) { console.log(`   ❌ ${e12.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 14. timeline_events
  console.log('⏱️ timeline_events...')
  const { error: e13 } = await supabase.from('timeline_events').insert([
    {
      project_id: projectId,
      event_type: 'milestone',
      title: '철거 완료',
      description: '기존 시설 철거 완료',
      event_date: new Date().toISOString()
    }
  ])
  if (e13) { console.log(`   ❌ ${e13.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 15. notifications
  console.log('🔔 notifications...')
  const { error: e14 } = await supabase.from('notifications').insert([
    {
      user_id: userId,
      title: '결제 예정',
      message: '중도금 1차 결제일이 다가옵니다',
      type: 'payment',
      link: `/projects/${projectId}/payment`
    }
  ])
  if (e14) { console.log(`   ❌ ${e14.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 16. service_payments
  console.log('💳 service_payments...')
  const { error: e15 } = await supabase.from('service_payments').insert([
    {
      user_id: userId,
      amount: 29000,
      payment_method: 'card',
      status: 'completed',
      transaction_id: 'TX' + Date.now()
    }
  ])
  if (e15) { console.log(`   ❌ ${e15.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ 성공: ${successCount}개`)
  console.log(`❌ 실패: ${errorCount}개`)
  console.log('='.repeat(60))
}

seedAll()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal Error:', err)
    process.exit(1)
  })
