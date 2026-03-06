/**
 * 테이블 존재 여부 확인
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

async function checkTables() {
  const tables = ['change_orders', 'issues', 'daily_reports']

  console.log('🔍 테이블 존재 여부 확인\n')

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)

    if (error) {
      console.log(`❌ ${table}: ${error.message}`)
    } else {
      console.log(`✅ ${table}: 존재함 (${data?.length || 0}개 row)`)
    }
  }
}

checkTables()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
