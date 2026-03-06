/**
 * 체크인 시스템 최종 종합 점검
 * 1. 테이블 상태
 * 2. FK 무결성
 * 3. 데이터 품질
 * 4. 사용자 워크플로우
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

console.log('🔍 체크인 시스템 최종 종합 점검\n')
console.log('=' .repeat(70))

let totalIssues = 0
let criticalIssues = 0
let warnings = 0

async function check() {
  // ==========================================
  // 1. 테이블 존재 및 데이터 확인
  // ==========================================
  console.log('\n📊 1. 테이블 상태 점검')
  console.log('-'.repeat(70))

  const tables = [
    'profiles', 'projects', 'project_members',
    'diagnostic_responses', 'mandatory_processes', 'operational_constraints',
    'change_orders', 'scope_items', 'quotes', 'quote_line_items',
    'payments', 'issues', 'daily_reports', 'warranties', 'notifications',
    'knowledge_chunks', 'law_checks',
    'photos', 'certificates', 'share_codes', 'activities',
    'risk_history', 'evidence_packages', 'project_invites'
  ]

  const tableStatus = []
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`   ❌ ${table}: 테이블 없음 - ${error.message}`)
      criticalIssues++
      tableStatus.push({ table, exists: false, count: 0 })
    } else if (count === 0) {
      console.log(`   ⚠️  ${table}: 비어있음`)
      warnings++
      tableStatus.push({ table, exists: true, count: 0 })
    } else {
      console.log(`   ✅ ${table}: ${count}개`)
      tableStatus.push({ table, exists: true, count })
    }
  }

  // ==========================================
  // 2. FK 무결성 검증
  // ==========================================
  console.log('\n🔗 2. FK 무결성 점검')
  console.log('-'.repeat(70))

  // 2-1. quote_line_items → quotes
  const { data: lineItems } = await supabase
    .from('quote_line_items')
    .select('id, quote_id')

  if (lineItems && lineItems.length > 0) {
    const quoteIds = [...new Set(lineItems.map(i => i.quote_id))]
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id')
      .in('id', quoteIds)

    if (quotes && quotes.length === quoteIds.length) {
      console.log(`   ✅ quote_line_items → quotes: 정상 (${lineItems.length}개)`)
    } else {
      console.log(`   ❌ quote_line_items → quotes: 무결성 위반`)
      console.log(`      참조: ${quoteIds.length}개, 실제: ${quotes?.length || 0}개`)
      criticalIssues++
    }
  } else {
    console.log(`   ⏭️  quote_line_items: 데이터 없음`)
  }

  // 2-2. project_members → projects
  const { data: members } = await supabase
    .from('project_members')
    .select('project_id')

  if (members && members.length > 0) {
    const projectIds = [...new Set(members.map(m => m.project_id))]
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .in('id', projectIds)

    if (projects && projects.length === projectIds.length) {
      console.log(`   ✅ project_members → projects: 정상 (${members.length}개)`)
    } else {
      console.log(`   ❌ project_members → projects: 무결성 위반`)
      criticalIssues++
    }
  }

  // 2-3. photos → projects
  const { data: photos } = await supabase
    .from('photos')
    .select('project_id')

  if (photos && photos.length > 0) {
    const photoProjectIds = [...new Set(photos.map(p => p.project_id))]
    const { data: photoProjects } = await supabase
      .from('projects')
      .select('id')
      .in('id', photoProjectIds)

    if (photoProjects && photoProjects.length === photoProjectIds.length) {
      console.log(`   ✅ photos → projects: 정상 (${photos.length}개)`)
    } else {
      console.log(`   ❌ photos → projects: 무결성 위반`)
      criticalIssues++
    }
  }

  // ==========================================
  // 3. 데이터 품질 점검
  // ==========================================
  console.log('\n📋 3. 데이터 품질 점검')
  console.log('-'.repeat(70))

  // 3-1. 프로젝트에 멤버가 있는지
  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, name')

  if (projectsData && projectsData.length > 0) {
    for (const project of projectsData) {
      const { count } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)

      if (count === 0) {
        console.log(`   ⚠️  프로젝트 "${project.name}": 멤버 없음`)
        warnings++
      } else {
        console.log(`   ✅ 프로젝트 "${project.name}": 멤버 ${count}명`)
      }
    }
  }

  // 3-2. 사용자에 프로필이 있는지
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, email, full_name')

  if (profilesData && profilesData.length > 0) {
    console.log(`   ✅ 프로필: ${profilesData.length}개`)
    profilesData.forEach(p => {
      if (!p.full_name) {
        console.log(`   ⚠️  프로필 ${p.email}: full_name 없음`)
        warnings++
      }
    })
  } else {
    console.log(`   ❌ 프로필: 없음 (사용자 로그인 불가)`)
    criticalIssues++
  }

  // ==========================================
  // 4. 사용자 워크플로우 검증
  // ==========================================
  console.log('\n🔄 4. 사용자 워크플로우 검증')
  console.log('-'.repeat(70))

  const workflows = [
    { name: '프로젝트 생성', tables: ['projects'], ok: false },
    { name: '진단 체크리스트', tables: ['diagnostic_responses'], ok: false },
    { name: '견적 생성', tables: ['quotes', 'quote_line_items'], ok: false },
    { name: '변경 관리', tables: ['change_orders'], ok: false },
    { name: '이슈 관리', tables: ['issues'], ok: false },
    { name: '사진 갤러리', tables: ['photos'], ok: false },
    { name: '일일 보고', tables: ['daily_reports'], ok: false },
    { name: '하자 관리', tables: ['warranties'], ok: false },
    { name: '준공 증명', tables: ['certificates'], ok: false },
    { name: '외부 공유', tables: ['share_codes'], ok: false },
    { name: '활동 로그', tables: ['activities'], ok: false },
    { name: '리스크 추적', tables: ['risk_history'], ok: false },
    { name: '증거 패키지', tables: ['evidence_packages'], ok: false },
    { name: '프로젝트 초대', tables: ['project_invites'], ok: false },
  ]

  for (const workflow of workflows) {
    let allOk = true
    for (const table of workflow.tables) {
      const status = tableStatus.find(t => t.table === table)
      if (!status || !status.exists || status.count === 0) {
        allOk = false
        break
      }
    }
    workflow.ok = allOk
    if (allOk) {
      console.log(`   ✅ ${workflow.name}: 사용 가능`)
    } else {
      console.log(`   ⚠️  ${workflow.name}: 데이터 부족 (테스트 필요)`)
      warnings++
    }
  }

  // ==========================================
  // 5. 주요 기능 테이블 매핑 확인
  // ==========================================
  console.log('\n🗺️  5. 페이지 → 테이블 매핑 확인')
  console.log('-'.repeat(70))

  const pageMapping = [
    { page: '/dashboard', tables: ['projects', 'activities'], critical: true },
    { page: '/projects', tables: ['projects', 'project_members'], critical: true },
    { page: '/projects/[id]/overview', tables: ['projects'], critical: true },
    { page: '/projects/[id]/diagnostic', tables: ['diagnostic_responses'], critical: false },
    { page: '/projects/[id]/estimate', tables: ['quotes', 'quote_line_items'], critical: true },
    { page: '/projects/[id]/gallery', tables: ['photos'], critical: false },
    { page: '/projects/[id]/issues', tables: ['issues'], critical: false },
    { page: '/projects/[id]/changes', tables: ['change_orders'], critical: false },
    { page: '/projects/[id]/certificate', tables: ['certificates'], critical: false },
    { page: '/ai-chat', tables: ['knowledge_chunks'], critical: true },
  ]

  for (const mapping of pageMapping) {
    let allOk = true
    for (const table of mapping.tables) {
      const status = tableStatus.find(t => t.table === table)
      if (!status || !status.exists) {
        allOk = false
        if (mapping.critical) {
          console.log(`   ❌ ${mapping.page}: ${table} 테이블 없음 (치명적)`)
          criticalIssues++
        } else {
          console.log(`   ⚠️  ${mapping.page}: ${table} 테이블 없음`)
          warnings++
        }
        break
      }
    }
    if (allOk) {
      console.log(`   ✅ ${mapping.page}: 정상`)
    }
  }

  // ==========================================
  // 6. 지식베이스 AI 시스템 점검
  // ==========================================
  console.log('\n🤖 6. AI 시스템 점검')
  console.log('-'.repeat(70))

  const { count: kbCount } = await supabase
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true })

  if (kbCount >= 100) {
    console.log(`   ✅ 지식베이스: ${kbCount}개 청크 (충분)`)
  } else if (kbCount > 0) {
    console.log(`   ⚠️  지식베이스: ${kbCount}개 청크 (부족, 최소 100개 권장)`)
    warnings++
  } else {
    console.log(`   ❌ 지식베이스: 없음 (AI 기능 불가)`)
    criticalIssues++
  }

  const { data: kbCategories } = await supabase
    .from('knowledge_chunks')
    .select('category')

  if (kbCategories) {
    const cats = {}
    kbCategories.forEach(c => {
      cats[c.category] = (cats[c.category] || 0) + 1
    })
    console.log(`   📊 카테고리:`)
    Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
      console.log(`      - ${k}: ${v}개`)
    })
  }

  // ==========================================
  // 최종 요약
  // ==========================================
  console.log('\n' + '='.repeat(70))
  console.log('\n📈 최종 점검 결과\n')

  const totalTables = tables.length
  const emptyTables = tableStatus.filter(t => t.count === 0).length
  const missingTables = tableStatus.filter(t => !t.exists).length

  console.log(`📊 테이블 상태:`)
  console.log(`   - 전체: ${totalTables}개`)
  console.log(`   - 존재: ${totalTables - missingTables}개`)
  console.log(`   - 데이터 있음: ${totalTables - emptyTables}개`)
  console.log(`   - 비어있음: ${emptyTables}개`)
  console.log(`   - 누락: ${missingTables}개`)

  console.log(`\n🔍 문제점:`)
  console.log(`   - 🔴 치명적 이슈: ${criticalIssues}개`)
  console.log(`   - 🟡 경고: ${warnings}개`)
  console.log(`   - 총 이슈: ${criticalIssues + warnings}개`)

  console.log(`\n✅ 종합 평가:`)
  if (criticalIssues === 0 && warnings === 0) {
    console.log(`   🎉 완벽! 모든 시스템 정상 작동`)
  } else if (criticalIssues === 0) {
    console.log(`   ✅ 양호 - 경고 ${warnings}개 있지만 사용 가능`)
  } else {
    console.log(`   ⚠️  주의 - 치명적 이슈 ${criticalIssues}개 해결 필요`)
  }

  console.log('\n' + '='.repeat(70))
}

check()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ 점검 중 에러:', err)
    process.exit(1)
  })
