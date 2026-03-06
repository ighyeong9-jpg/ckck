/**
 * PostgreSQL 직접 연결로 SQL 실행
 */

const { Client } = require('pg')
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

// Supabase 연결 문자열 구성
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const PROJECT_REF = 'kilvdxrtmcxvycqevalv'
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

// Supabase PostgreSQL 연결 문자열
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
const connectionString = `postgresql://postgres.${PROJECT_REF}:${SERVICE_ROLE_KEY}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`

console.log('🔧 PostgreSQL 직접 연결로 SQL 실행\n')
console.log('프로젝트:', PROJECT_REF)
console.log('호스트: aws-0-ap-northeast-2.pooler.supabase.com\n')

async function executeSQL() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('📡 데이터베이스 연결 중...')
    await client.connect()
    console.log('✅ 연결 성공!\n')

    // SQL 파일 읽기
    const sql = fs.readFileSync('supabase/create-missing-tables.sql', 'utf-8')
    console.log(`📄 SQL 파일: ${sql.length}자\n`)

    console.log('🚀 SQL 실행 중...')
    const result = await client.query(sql)
    console.log('✅ SQL 실행 완료!\n')

    // 테이블 생성 확인
    const checkQuery = `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('photos', 'certificates', 'share_codes', 'activities', 'risk_history', 'evidence_packages', 'project_invites')
      ORDER BY tablename
    `
    const tables = await client.query(checkQuery)

    console.log('📋 생성된 테이블:')
    tables.rows.forEach(row => console.log(`   ✅ ${row.tablename}`))
    console.log(`\n총 ${tables.rows.length}/7개 테이블 생성됨\n`)

    if (tables.rows.length === 7) {
      console.log('🎉 모든 테이블 생성 성공!')
      console.log('\n다음 단계:')
      console.log('   node scripts/seed-new-tables.js')
    } else {
      console.log('⚠️ 일부 테이블 생성 실패')
      console.log('누락된 테이블을 확인하세요')
    }

  } catch (err) {
    console.error('❌ 에러:', err.message)
    console.error('\n상세:', err)
    console.log('\n대안: Supabase Dashboard에서 수동 실행')
    console.log('1. https://supabase.com/dashboard/project/kilvdxrtmcxvycqevalv/sql')
    console.log('2. supabase/create-missing-tables.sql 내용 복사')
    console.log('3. SQL Editor에 붙여넣기 후 Run')
  } finally {
    await client.end()
    console.log('\n📡 연결 종료')
  }
}

executeSQL().then(() => process.exit(0))
