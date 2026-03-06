/**
 * 누락된 테이블 생성 SQL 실행 (Supabase REST API 사용)
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

// SQL 파일 읽기
const sqlContent = fs.readFileSync('supabase/create-missing-tables.sql', 'utf-8')

console.log('🔧 누락된 테이블 생성 시작...\n')
console.log(`📄 파일: supabase/create-missing-tables.sql`)
console.log(`📊 SQL 길이: ${sqlContent.length}자\n`)

async function applySQL() {
  console.log('⚠️  Supabase JS Client로는 직접 SQL 실행 불가')
  console.log('📝 수동 실행 방법:\n')
  console.log('1. https://supabase.com/dashboard 접속')
  console.log('2. 프로젝트 선택')
  console.log('3. SQL Editor 메뉴 클릭')
  console.log('4. New Query 클릭')
  console.log('5. supabase/create-missing-tables.sql 내용 복사 & 붙여넣기')
  console.log('6. Run 클릭\n')

  console.log('또는 아래 명령어로 테이블별 개별 생성:\n')
  console.log('node scripts/create-tables-individually.js\n')
}

applySQL().then(() => process.exit(0))
