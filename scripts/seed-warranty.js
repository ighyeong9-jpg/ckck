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

async function tryWarranty() {
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .limit(1)
    .single()

  // 빈 객체로 시도 (에러 메시지로 필수 컬럼 확인)
  console.log('🛡️ warranties 필수 컬럼 확인...\n')

  const { data, error } = await supabase.from('warranties').insert({
    project_id: project.id,
    category: '방수 공사',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    duration_years: 2
  }).select()

  if (!error) {
    console.log('✅ 성공:', data)
  }

  if (error) {
    console.log('에러:', error.message)
    console.log('힌트:', error.hint)
    console.log('상세:', error.details)
  }
}

tryWarranty().then(() => process.exit(0))
