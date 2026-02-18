const { readFileSync } = require('fs');
const { resolve } = require('path');

// .env.local 파싱
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// ─── 필요한 SQL 작업 ─────────────────────────────────────
// 기존 스키마를 최대한 활용하고, 누락 컬럼만 추가

const ALTER_STATEMENTS = [
  {
    name: 'defects - photos 컬럼 추가',
    sql: `ALTER TABLE defects ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';`
  },
  {
    name: 'defects - sha256_hash 컬럼 추가',
    sql: `ALTER TABLE defects ADD COLUMN IF NOT EXISTS sha256_hash VARCHAR(64);`
  },
  {
    name: 'defects - updated_at 컬럼 추가',
    sql: `ALTER TABLE defects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();`
  },
  {
    name: 'notifications - link 컬럼 추가',
    sql: `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(500);`
  },
  {
    name: 'shares - is_active 컬럼 추가',
    sql: `ALTER TABLE shares ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`
  },
  {
    name: 'shares - view_count 컬럼 추가',
    sql: `ALTER TABLE shares ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;`
  },
  {
    name: 'shares - updated_at 컬럼 추가',
    sql: `ALTER TABLE shares ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();`
  },
  {
    name: 'profiles - company_name 컬럼 추가',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);`
  },
  {
    name: 'profiles - description 컬럼 추가 (company)',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description TEXT;`
  },
  {
    name: 'profiles - specialty_tags 컬럼 추가',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty_tags JSONB DEFAULT '[]';`
  },
  {
    name: 'profiles - address 컬럼 추가',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;`
  },
  {
    name: 'profiles - logo_url 컬럼 추가',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;`
  },
  {
    name: 'profiles - portfolio_images 컬럼 추가',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_images JSONB DEFAULT '[]';`
  },
  {
    name: 'profiles - avg_verification_score 컬럼 추가',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_verification_score FLOAT DEFAULT 0;`
  },
  {
    name: 'profiles - total_projects 컬럼 추가',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_projects INTEGER DEFAULT 0;`
  },
  {
    name: 'profiles - avg_duration_days 컬럼 추가',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_duration_days INTEGER DEFAULT 0;`
  },
  {
    name: 'profiles - profile_token 컬럼 추가',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_token VARCHAR(32) UNIQUE;`
  },
  {
    name: 'profiles - is_public 컬럼 추가',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;`
  },
];

const INDEX_STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS idx_defects_project ON defects(project_id);`,
  `CREATE INDEX IF NOT EXISTS idx_defects_status ON defects(status);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);`,
  `CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(share_token);`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_token ON profiles(profile_token);`,
];

const RLS_STATEMENTS = [
  {
    name: 'shares public read',
    sql: `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shares' AND policyname = 'shares_public_read') THEN
    CREATE POLICY shares_public_read ON shares FOR SELECT USING (is_active = true AND expires_at > now());
  END IF;
END $$;`
  },
  {
    name: 'profiles public read',
    sql: `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_public_read') THEN
    CREATE POLICY profiles_public_read ON profiles FOR SELECT USING (is_public = true);
  END IF;
END $$;`
  },
];

// ─── 연결 방법들 ──────────────────────────────────────────

async function tryPgDirect(sql) {
  const pg = require('pg');
  const ref = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

  // 방법 1: IPv6 직접 연결
  const client = new pg.Client({
    host: '2406:da12:b78:de0a:979b:4358:e50b:4900',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });

  await client.connect();
  await client.query(sql);
  await client.end();
}

async function tryPgHostname(sql) {
  const pg = require('pg');
  const ref = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

  const client = new pg.Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });

  await client.connect();
  await client.query(sql);
  await client.end();
}

async function tryPooler(sql) {
  const pg = require('pg');
  const ref = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
  const regions = ['ap-northeast-2', 'ap-southeast-1', 'ap-northeast-1', 'us-east-1', 'eu-west-1'];

  for (const region of regions) {
    try {
      const client = new pg.Client({
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 6543,
        database: 'postgres',
        user: `postgres.${ref}`,
        password: SERVICE_ROLE_KEY,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
      await client.connect();
      await client.query(sql);
      await client.end();
      return;
    } catch {
      continue;
    }
  }
  throw new Error('All pooler regions failed');
}

async function trySupabaseRpc(sql) {
  const h = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    'Content-Type': 'application/json'
  };

  // Try pg-meta style endpoint
  const endpoints = [
    SUPABASE_URL + '/pg/query',
    SUPABASE_URL + '/rest/v1/rpc/exec_sql',
    SUPABASE_URL + '/rest/v1/rpc/execute_sql',
  ];

  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ query: sql, sql: sql, sql_string: sql })
      });
      if (r.ok) return;
    } catch {
      continue;
    }
  }
  throw new Error('No RPC endpoint available');
}

// ─── 메인 ─────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('  Check-In v2.0 - DB 스키마 업데이트');
  console.log('  ==================================');
  console.log('');
  console.log('  URL: ' + SUPABASE_URL);
  console.log('');

  // 연결 방법 탐색
  console.log('[1/4] 연결 방식 탐색...');
  let execSql = null;
  let methodName = '';

  const methods = [
    { name: 'IPv6 직접 DB', fn: tryPgDirect },
    { name: 'Hostname 직접 DB', fn: tryPgHostname },
    { name: 'Supavisor 풀러', fn: tryPooler },
    { name: 'RPC 엔드포인트', fn: trySupabaseRpc },
  ];

  for (const m of methods) {
    process.stdout.write('  ' + m.name + '... ');
    try {
      await m.fn('SELECT 1');
      console.log('OK');
      execSql = m.fn;
      methodName = m.name;
      break;
    } catch (e) {
      console.log('FAIL (' + e.message.slice(0, 60) + ')');
    }
  }

  if (!execSql) {
    console.log('');
    console.log('  [FALLBACK] 모든 직접 연결 실패.');
    console.log('  Supabase SQL Editor에서 아래 SQL을 수동 실행해주세요:');
    console.log('');
    console.log('  ────────────────────────────────────');

    for (const stmt of ALTER_STATEMENTS) {
      console.log('  -- ' + stmt.name);
      console.log('  ' + stmt.sql);
    }
    console.log('');
    for (const sql of INDEX_STATEMENTS) {
      console.log('  ' + sql);
    }
    console.log('');
    for (const stmt of RLS_STATEMENTS) {
      console.log('  -- ' + stmt.name);
      console.log('  ' + stmt.sql);
    }
    console.log('  ────────────────────────────────────');
    console.log('');
    console.log('  TIP: .env.local에 DATABASE_URL=postgresql://postgres:[DB비밀번호]@db.[ref].supabase.co:5432/postgres');
    console.log('  을 추가하면 이 스크립트로 자동 실행할 수 있습니다.');

    // Also write to a SQL file for convenience
    const { writeFileSync } = require('fs');
    let sqlContent = '-- Check-In v2.0 Schema Migration\n-- Run this in Supabase SQL Editor\n\n';

    for (const stmt of ALTER_STATEMENTS) {
      sqlContent += '-- ' + stmt.name + '\n' + stmt.sql + '\n\n';
    }
    sqlContent += '\n-- Indexes\n';
    for (const sql of INDEX_STATEMENTS) {
      sqlContent += sql + '\n';
    }
    sqlContent += '\n-- RLS Policies\n';
    for (const stmt of RLS_STATEMENTS) {
      sqlContent += '-- ' + stmt.name + '\n' + stmt.sql + '\n\n';
    }

    const sqlPath = resolve(__dirname, 'migration.sql');
    writeFileSync(sqlPath, sqlContent);
    console.log('  SQL 파일 저장: scripts/migration.sql');
    process.exit(1);
  }

  console.log('');
  console.log('  연결 방식: ' + methodName);
  console.log('');

  // ALTER TABLE 실행
  console.log('[2/4] 컬럼 추가...');
  let alterOk = 0;
  for (const stmt of ALTER_STATEMENTS) {
    process.stdout.write('  ' + stmt.name + '... ');
    try {
      await execSql(stmt.sql);
      console.log('OK');
      alterOk++;
    } catch (e) {
      console.log('FAIL: ' + e.message.slice(0, 80));
    }
  }

  // INDEX 생성
  console.log('');
  console.log('[3/4] 인덱스 생성...');
  let idxOk = 0;
  for (const sql of INDEX_STATEMENTS) {
    const name = sql.match(/idx_\w+/)?.[0] || 'index';
    process.stdout.write('  ' + name + '... ');
    try {
      await execSql(sql);
      console.log('OK');
      idxOk++;
    } catch (e) {
      console.log('FAIL: ' + e.message.slice(0, 80));
    }
  }

  // RLS 정책
  console.log('');
  console.log('[4/4] RLS 정책...');
  let rlsOk = 0;
  for (const stmt of RLS_STATEMENTS) {
    process.stdout.write('  ' + stmt.name + '... ');
    try {
      await execSql(stmt.sql);
      console.log('OK');
      rlsOk++;
    } catch (e) {
      console.log('FAIL: ' + e.message.slice(0, 80));
    }
  }

  // 결과
  console.log('');
  console.log('  ==============================');
  console.log('  ALTER: ' + alterOk + '/' + ALTER_STATEMENTS.length);
  console.log('  INDEX: ' + idxOk + '/' + INDEX_STATEMENTS.length);
  console.log('  RLS:   ' + rlsOk + '/' + RLS_STATEMENTS.length);
  console.log('  ==============================');

  if (alterOk === ALTER_STATEMENTS.length) {
    console.log('  모든 스키마 업데이트 완료!');
  } else {
    console.log('  일부 실패 - 위 로그를 확인하세요.');
  }
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
