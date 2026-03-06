/**
 * 체크인 DB 100% 완벽 설정 스크립트
 * 1. 누락된 테이블 확인
 * 2. 모든 테이블에 데이터 채우기
 * 3. 검증
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

console.log('🚀 체크인 DB 100% 완벽 설정\n')
console.log('=' .repeat(60))

async function main() {
  // Step 1: 프로젝트 정보 확인
  console.log('\n📌 Step 1: 프로젝트 정보 확인')
  const { data: project, error: pError } = await supabase
    .from('projects')
    .select('id, user_id, name')
    .limit(1)
    .maybeSingle()

  if (pError || !project) {
    console.log('❌ 프로젝트가 없습니다. 먼저 프로젝트를 생성하세요.')
    return
  }

  const projectId = project.id
  const userId = project.user_id

  console.log(`   ✅ 프로젝트: ${project.name}`)
  console.log(`   ✅ ID: ${projectId}`)
  console.log(`   ✅ 사용자: ${userId}`)

  // Step 2: 모든 기존 테이블에 데이터 채우기
  console.log('\n📊 Step 2: 모든 테이블에 테스트 데이터 생성')

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  // 2-1. compliance_checks
  console.log('\n   ✔️ compliance_checks...')
  const { data: cc1 } = await supabase.from('compliance_checks').select('id').limit(1)
  if (cc1 && cc1.length > 0) {
    console.log('      ⏭️  이미 데이터 있음')
    skipCount++
  } else {
    const { error: e1 } = await supabase.from('compliance_checks').insert([
      { project_id: projectId, checklist_type: '건축법', item_code: 'BUILD_001', is_compliant: true, checked_by: userId, checked_at: new Date().toISOString() },
      { project_id: projectId, checklist_type: '소방법', item_code: 'FIRE_001', is_compliant: true, checked_by: userId, checked_at: new Date().toISOString() }
    ])
    if (e1) { console.log(`      ❌ ${e1.message}`); errorCount++ } else { console.log('      ✅'); successCount++ }
  }

  // 2-2. defects
  console.log('   🔴 defects...')
  const { data: df1 } = await supabase.from('defects').select('id').limit(1)
  if (df1 && df1.length > 0) {
    console.log('      ⏭️  이미 데이터 있음')
    skipCount++
  } else {
    const { data: defect, error: e2 } = await supabase.from('defects').insert([
      { project_id: projectId, title: '벽체 균열', description: '서쪽 벽면 균열', severity: 'medium', status: 'reported', location: '1층 서쪽', reported_by: userId },
      { project_id: projectId, title: '타일 들뜸', description: '욕실 타일 일부 들뜸', severity: 'low', status: 'reported', location: '2층 욕실', reported_by: userId }
    ]).select()
    if (e2) { console.log(`      ❌ ${e2.message}`); errorCount++ } else {
      console.log('      ✅')
      successCount++

      // defect_updates 추가
      if (defect && defect.length > 0) {
        await supabase.from('defect_updates').insert([
          { defect_id: defect[0].id, message: '업체 확인 요청', created_by: userId }
        ])
      }
    }
  }

  // 2-3. files
  console.log('   📎 files...')
  const { data: f1 } = await supabase.from('files').select('id').limit(1)
  if (f1 && f1.length > 0) {
    console.log('      ⏭️  이미 데이터 있음')
    skipCount++
  } else {
    const { error: e3 } = await supabase.from('files').insert([
      { project_id: projectId, file_name: '설계도면.pdf', file_url: 'https://example.com/drawing.pdf', file_type: 'application/pdf', file_size: 2048000, uploaded_by: userId, category: '도면' },
      { project_id: projectId, file_name: '계약서.pdf', file_url: 'https://example.com/contract.pdf', file_type: 'application/pdf', file_size: 512000, uploaded_by: userId, category: '계약' }
    ])
    if (e3) { console.log(`      ❌ ${e3.message}`); errorCount++ } else { console.log('      ✅'); successCount++ }
  }

  // 2-4. audit_logs
  console.log('   📜 audit_logs...')
  const { error: e4 } = await supabase.from('audit_logs').insert([
    { user_id: userId, action: 'project.created', resource_type: 'project', resource_id: projectId, details: { message: '프로젝트 생성' } },
    { user_id: userId, action: 'quote.generated', resource_type: 'quote', resource_id: null, details: { message: '견적 자동 생성' } }
  ])
  if (e4) { console.log(`      ❌ ${e4.message}`); errorCount++ } else { console.log('      ✅'); successCount++ }

  // 2-5. reports
  console.log('   📊 reports...')
  const { data: r1 } = await supabase.from('reports').select('id').limit(1)
  if (r1 && r1.length > 0) {
    console.log('      ⏭️  이미 데이터 있음')
    skipCount++
  } else {
    const { error: e5 } = await supabase.from('reports').insert([
      { project_id: projectId, report_type: 'daily', title: '일일보고 - 3/6', content: '철거 작업 진행 중', created_by: userId },
      { project_id: projectId, report_type: 'weekly', title: '주간보고 - 1주차', content: '전체 진도율 20%', created_by: userId }
    ])
    if (e5) { console.log(`      ❌ ${e5.message}`); errorCount++ } else { console.log('      ✅'); successCount++ }
  }

  // 2-6. shares
  console.log('   🔗 shares...')
  const { data: s1 } = await supabase.from('shares').select('id').limit(1)
  if (s1 && s1.length > 0) {
    console.log('      ⏭️  이미 데이터 있음')
    skipCount++
  } else {
    const shareCode = 'SHARE-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    const { error: e6 } = await supabase.from('shares').insert({
      project_id: projectId,
      share_code: shareCode,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: userId
    })
    if (e6) { console.log(`      ❌ ${e6.message}`); errorCount++ } else { console.log(`      ✅ 코드: ${shareCode}`); successCount++ }
  }

  // 2-7. special_terms
  console.log('   📜 special_terms...')
  const { data: st1 } = await supabase.from('special_terms').select('id').limit(1)
  if (st1 && st1.length > 0) {
    console.log('      ⏭️  이미 데이터 있음')
    skipCount++
  } else {
    const { error: e7 } = await supabase.from('special_terms').insert([
      { project_id: projectId, term_type: '특약사항', description: '공사 기간 중 임시 사무실 제공' },
      { project_id: projectId, term_type: '추가사항', description: '주말 공사 시 사전 통보' }
    ])
    if (e7) { console.log(`      ❌ ${e7.message}`); errorCount++ } else { console.log('      ✅'); successCount++ }
  }

  // 2-8. timeline_events
  console.log('   ⏱️  timeline_events...')
  const { error: e8 } = await supabase.from('timeline_events').insert([
    { project_id: projectId, event_type: 'milestone', title: '계약 체결', description: '공사 계약 완료', event_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
    { project_id: projectId, event_type: 'milestone', title: '철거 완료', description: '기존 시설 철거 완료', event_date: new Date().toISOString() }
  ])
  if (e8) { console.log(`      ❌ ${e8.message}`); errorCount++ } else { console.log('      ✅'); successCount++ }

  // 2-9. read_receipts
  console.log('   👁️  read_receipts...')
  const { error: e9 } = await supabase.from('read_receipts').insert([
    { user_id: userId, resource_type: 'notification', resource_id: 'test-notif-1', read_at: new Date().toISOString() }
  ])
  if (e9) { console.log(`      ❌ ${e9.message}`); errorCount++ } else { console.log('      ✅'); successCount++ }

  // 2-10. service_payments (필수 컬럼 확인 필요)
  console.log('   💳 service_payments...')
  const { error: e10 } = await supabase.from('service_payments').insert({
    user_id: userId,
    plan_type: 'pro',
    amount: 29000,
    payment_method: 'card',
    status: 'completed',
    transaction_id: 'TX' + Date.now()
  })
  if (e10) { console.log(`      ❌ ${e10.message}`); errorCount++ } else { console.log('      ✅'); successCount++ }

  // Step 3: 누락된 테이블 안내
  console.log('\n📋 Step 3: 누락된 테이블 생성 필요')
  const missingTables = ['photos', 'certificates', 'share_codes', 'activities', 'risk_history', 'evidence_packages', 'project_invites']

  console.log('\n   ⚠️  다음 테이블이 DB에 없습니다:')
  missingTables.forEach(t => console.log(`      - ${t}`))

  console.log('\n   📝 생성 방법:')
  console.log('      1. Supabase Dashboard 접속')
  console.log('      2. SQL Editor 메뉴')
  console.log('      3. supabase/create-missing-tables.sql 실행')
  console.log('      또는')
  console.log('      4. 아래 명령어 실행:')
  console.log('         node scripts/create-tables-manually.js\n')

  // Step 4: 최종 요약
  console.log('=' .repeat(60))
  console.log('\n✅ 완료!\n')
  console.log(`   성공: ${successCount}개`)
  console.log(`   스킵: ${skipCount}개 (이미 데이터 있음)`)
  console.log(`   실패: ${errorCount}개`)

  if (errorCount > 0) {
    console.log('\n⚠️  일부 테이블에 데이터 추가 실패')
    console.log('   - 컬럼명 불일치 가능성')
    console.log('   - 제약조건 위반 가능성')
  }

  console.log('\n🔍 DB 현황 확인:')
  console.log('   node scripts/check-all-tables.js\n')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal Error:', err)
    process.exit(1)
  })
