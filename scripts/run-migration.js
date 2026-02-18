/**
 * Check-In v2.0 Migration Runner
 * Tries multiple methods to execute migration.sql against Supabase
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = 'kilvdxrtmcxvycqevalv';

// Read migration SQL
const migrationSQL = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf-8');

// Split SQL into individual statements
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed === '') {
      if (inDollarQuote) current += line + '\n';
      continue;
    }

    current += line + '\n';

    if (trimmed.startsWith('DO $$') || trimmed.startsWith('DO $')) {
      inDollarQuote = true;
    }
    if (inDollarQuote && trimmed.endsWith('$$;')) {
      inDollarQuote = false;
      statements.push(current.trim());
      current = '';
    } else if (!inDollarQuote && trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements.filter(s => s.length > 0);
}

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function tryManagementAPI() {
  console.log('\n=== Method 1: Supabase Management API ===');
  try {
    const body = JSON.stringify({ query: migrationSQL });
    const result = await makeRequest({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      }
    }, body);
    console.log(`Status: ${result.status}`);
    if (result.status === 200 || result.status === 201) {
      console.log('SUCCESS! Migration executed via Management API');
      return true;
    }
    console.log('Response:', result.data.substring(0, 300));
    return false;
  } catch (err) {
    console.log('Failed:', err.message);
    return false;
  }
}

async function tryPgMeta() {
  console.log('\n=== Method 2: pg-meta query endpoint ===');
  const paths = ['/pg/query', '/pg-meta/default/query', '/rest/v1/rpc/exec_sql'];

  for (const p of paths) {
    try {
      const body = JSON.stringify({ query: 'SELECT 1 as test' });
      const url = new URL(SUPABASE_URL);
      const result = await makeRequest({
        hostname: url.hostname,
        path: p,
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        }
      }, body);
      console.log(`  ${p}: status=${result.status}`);
      if (result.status === 200) {
        console.log('  Found working endpoint! Running migration...');
        const migBody = JSON.stringify({ query: migrationSQL });
        const migResult = await makeRequest({
          hostname: url.hostname,
          path: p,
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          }
        }, migBody);
        console.log(`  Migration result: status=${migResult.status}`);
        if (migResult.status === 200) {
          console.log('  SUCCESS!');
          return true;
        }
        console.log('  Response:', migResult.data.substring(0, 300));
      }
    } catch (err) {
      console.log(`  ${p}: ${err.message}`);
    }
  }
  return false;
}

async function tryStatementByStatement() {
  console.log('\n=== Method 3: Execute statements individually via REST RPC ===');
  const url = new URL(SUPABASE_URL);
  const statements = splitStatements(migrationSQL);
  console.log(`  ${statements.length} statements to execute`);

  // Try rpc endpoint with different function names
  const rpcNames = ['exec_sql', 'execute_sql', 'run_sql', 'query'];
  for (const rpc of rpcNames) {
    try {
      const body = JSON.stringify({ sql: 'SELECT 1' });
      const result = await makeRequest({
        hostname: url.hostname,
        path: `/rest/v1/rpc/${rpc}`,
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        }
      }, body);
      if (result.status === 200) {
        console.log(`  Found RPC function: ${rpc}`);
        // Execute each statement
        let success = 0;
        for (const stmt of statements) {
          const stmtResult = await makeRequest({
            hostname: url.hostname,
            path: `/rest/v1/rpc/${rpc}`,
            method: 'POST',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            }
          }, JSON.stringify({ sql: stmt }));
          if (stmtResult.status === 200) success++;
        }
        console.log(`  ${success}/${statements.length} statements succeeded`);
        return success > 0;
      }
    } catch (err) {}
  }
  console.log('  No RPC function found');
  return false;
}

async function tryEdgeFunctionApproach() {
  console.log('\n=== Method 4: Edge Function SQL execution ===');
  const url = new URL(SUPABASE_URL);

  // Check if there's a function endpoint for SQL
  try {
    const result = await makeRequest({
      hostname: url.hostname,
      path: '/functions/v1/sql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      }
    }, JSON.stringify({ query: 'SELECT 1' }));
    console.log(`  Status: ${result.status}`);
    if (result.status === 200) {
      console.log('  Found edge function! Running migration...');
      return true;
    }
  } catch (err) {
    console.log(`  Failed: ${err.message}`);
  }
  return false;
}

async function main() {
  console.log('Check-In v2.0 Migration Runner');
  console.log('================================');
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`SQL: ${migrationSQL.split('\n').filter(l => l.trim() && !l.trim().startsWith('--')).length} statements`);

  // Try all methods
  if (await tryManagementAPI()) return;
  if (await tryPgMeta()) return;
  if (await tryStatementByStatement()) return;
  if (await tryEdgeFunctionApproach()) return;

  // All methods failed - provide manual instructions
  console.log('\n================================');
  console.log('All automated methods failed.');
  console.log('');
  console.log('Please run the migration SQL manually:');
  console.log('');
  console.log('1. Go to https://supabase.com/dashboard/project/kilvdxrtmcxvycqevalv/sql/new');
  console.log('2. Copy the contents of scripts/migration.sql');
  console.log('3. Paste into the SQL Editor and click "Run"');
  console.log('');
  console.log('Or use Supabase CLI:');
  console.log('  npx supabase login');
  console.log('  npx supabase link --project-ref kilvdxrtmcxvycqevalv');
  console.log('  npx supabase db push');
}

main().catch(console.error);
