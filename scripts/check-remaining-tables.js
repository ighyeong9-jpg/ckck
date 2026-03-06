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

const emptyTables = [
  'change_orders',
  'issues',
  'photos',
  'daily_reports',
  'warranties',
  'certificates',
  'share_codes',
  'activities',
  'notifications',
  'risk_history',
  'evidence_packages',
  'project_invites'
]

async function checkSchema() {
  console.log('🔍 비어있는 테이블의 스키마 확인\n')

  for (const table of emptyTables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(0)

    if (error) {
      console.log(`❌ ${table}: 테이블 없음 (${error.code})`)
    } else {
      console.log(`✅ ${table}: 존재함`)
    }
  }
}

checkSchema().then(() => process.exit(0))
