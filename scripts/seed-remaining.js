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

async function seed() {
  console.log('🌱 남은 테이블 채우기\n')

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id')
    .limit(1)
    .single()

  const projectId = project.id
  const userId = project.user_id

  // 1. change_orders (최소한의 필드만)
  console.log('📝 change_orders...')
  const { error: e1 } = await supabase.from('change_orders').insert({
    project_id: projectId,
    title: '타일 변경',
    reason: '고객 요청'
  })
  if (e1) console.log(`   ❌ ${e1.message}`)
  else console.log('   ✅')

  // 2. issues (최소한의 필드만)
  console.log('⚠️ issues...')
  const { error: e2 } = await supabase.from('issues').insert({
    project_id: projectId,
    title: '벽체 균열',
    description: '균열 발견'
  })
  if (e2) console.log(`   ❌ ${e2.message}`)
  else console.log('   ✅')

  // 3. daily_reports
  console.log('📊 daily_reports...')
  const { error: e3 } = await supabase.from('daily_reports').insert({
    project_id: projectId,
    report_date: new Date().toISOString().split('T')[0]
  })
  if (e3) console.log(`   ❌ ${e3.message}`)
  else console.log('   ✅')

  // 4. warranties
  console.log('🛡️ warranties...')
  const { error: e4 } = await supabase.from('warranties').insert({
    project_id: projectId,
    item_name: '방수 공사',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  if (e4) console.log(`   ❌ ${e4.message}`)
  else console.log('   ✅')

  // 5. notifications
  console.log('🔔 notifications...')
  const { error: e5 } = await supabase.from('notifications').insert({
    user_id: userId,
    notification_type: 'payment',
    title: '결제 알림',
    message: '중도금 결제일 도래',
    is_read: false
  })
  if (e5) console.log(`   ❌ ${e5.message}`)
  else console.log('   ✅')

  console.log('\n✅ 완료!')
}

seed().then(() => process.exit(0))
