/**
 * 모든 테이블의 row count 확인
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// .env.local 파싱
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

const tables = [
  'profiles',
  'projects',
  'project_members',
  'diagnostic_responses',
  'mandatory_processes',
  'operational_constraints',
  'change_orders',
  'scope_items',
  'quotes',
  'quote_line_items',
  'payments',
  'issues',
  'photos',
  'daily_reports',
  'warranties',
  'certificates',
  'share_codes',
  'knowledge_chunks',
  'activities',
  'notifications',
  'law_checks',
  'risk_history',
  'evidence_packages',
  'project_invites',
]

async function checkAllTables() {
  console.log('📊 Supabase 테이블 현황\n')
  console.log('=' .repeat(60))

  const results = []

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        results.push({ table, count: 'ERROR', error: error.message })
      } else {
        results.push({ table, count: count || 0 })
      }
    } catch (err) {
      results.push({ table, count: 'ERROR', error: err.message })
    }
  }

  // 정렬: count 많은 순
  results.sort((a, b) => {
    if (a.count === 'ERROR') return 1
    if (b.count === 'ERROR') return -1
    return b.count - a.count
  })

  // 출력
  let emptyCount = 0
  let totalRows = 0

  results.forEach(({ table, count, error }) => {
    if (count === 'ERROR') {
      console.log(`❌ ${table.padEnd(25)} - 테이블 없음 (${error})`)
    } else if (count === 0) {
      console.log(`⚪ ${table.padEnd(25)} - ${count}개 (비어있음)`)
      emptyCount++
    } else if (count < 10) {
      console.log(`🟡 ${table.padEnd(25)} - ${count}개`)
      totalRows += count
    } else {
      console.log(`🟢 ${table.padEnd(25)} - ${count}개`)
      totalRows += count
    }
  })

  console.log('=' .repeat(60))
  console.log(`\n📈 요약:`)
  console.log(`  - 전체 테이블: ${results.length}개`)
  console.log(`  - 비어있는 테이블: ${emptyCount}개`)
  console.log(`  - 에러 테이블: ${results.filter(r => r.count === 'ERROR').length}개`)
  console.log(`  - 총 데이터: ${totalRows.toLocaleString()}개 row`)
}

checkAllTables()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
