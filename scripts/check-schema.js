// ── Kill-switch: DB mutation 스크립트 기본 차단 (Phase 1S Safety)
if (process.env.CHECKIN_ALLOW_DB_MUTATION !== 'YES_I_UNDERSTAND') {
  console.error('DB mutation script blocked by default. Set CHECKIN_ALLOW_DB_MUTATION=YES_I_UNDERSTAND to run.')
  process.exit(1)
}

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
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkSchema() {
  try {
    // diagnostic_responses 테이블 스키마 확인
    console.log('=== Testing diagnostic_responses schema ===\n')

    const testData = {
      project_id: 'fa07859f-b11f-4d8a-be6b-720f26eabbea',
      category: '안전',
      item_code: 'test-check-schema',
      status: 'need_check',
      note: '스키마 테스트용 데이터'
    }

    console.log('Attempting to insert:', testData)

    const { data, error } = await supabase
      .from('diagnostic_responses')
      .insert(testData)
      .select()

    if (error) {
      console.error('\n❌ Error:', error)
      console.error('\nError details:')
      console.error('  Code:', error.code)
      console.error('  Message:', error.message)
      console.error('  Details:', error.details)
    } else {
      console.log('\n✅ Success! Data inserted:', data)

      // 테스트 데이터 삭제
      await supabase
        .from('diagnostic_responses')
        .delete()
        .eq('item_code', 'test-check-schema')

      console.log('✅ Test data cleaned up')
    }

  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

checkSchema()
