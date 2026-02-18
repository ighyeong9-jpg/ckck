/**
 * Check-In v2.0 Migration Runner - Supabase Pooler JWT Auth
 * Tries connecting to Supabase via Supavisor pooler using JWT as password
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = 'kilvdxrtmcxvycqevalv';
const migrationPath = path.join(__dirname, 'migration.sql');

// Different connection strings to try
const poolerRegions = ['ap-northeast-2', 'ap-northeast-1', 'ap-southeast-1', 'us-east-1', 'us-west-1', 'eu-west-1'];
const encodedKey = encodeURIComponent(SERVICE_ROLE_KEY);

async function tryDBPush(dbUrl, label) {
  try {
    console.log(`\nTrying: ${label}`);
    const cmd = `npx supabase db push --db-url "${dbUrl}" --include-all`;
    const result = execSync(cmd, {
      cwd: path.join(__dirname, '..'),
      timeout: 15000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log('SUCCESS:', result);
    return true;
  } catch (err) {
    const stderr = err.stderr || '';
    const stdout = err.stdout || '';
    console.log('Failed:', stderr.substring(0, 200) || stdout.substring(0, 200) || err.message.substring(0, 200));
    return false;
  }
}

async function tryPsqlDirect(dbUrl, label) {
  try {
    console.log(`\nTrying psql: ${label}`);
    const cmd = `psql "${dbUrl}" -f "${migrationPath}"`;
    const result = execSync(cmd, {
      timeout: 15000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log('SUCCESS:', result);
    return true;
  } catch (err) {
    console.log('Failed:', (err.stderr || err.message).substring(0, 200));
    return false;
  }
}

async function main() {
  console.log('=== Check-In v2.0 Migration via Supabase Pooler ===\n');

  // Method 1: supabase db push with pooler URLs (session mode port 5432, supports JWT)
  for (const region of poolerRegions) {
    const dbUrl = `postgresql://postgres.${PROJECT_REF}:${encodedKey}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
    if (await tryDBPush(dbUrl, `pooler session mode (${region})`)) return;
  }

  // Method 2: supabase db push with direct connection (port 5432)
  const directUrl = `postgresql://postgres:${encodedKey}@db.${PROJECT_REF}.supabase.co:5432/postgres`;
  if (await tryDBPush(directUrl, 'direct connection')) return;

  // Method 3: try transaction mode pooler (port 6543)
  for (const region of poolerRegions.slice(0, 3)) {
    const dbUrl = `postgresql://postgres.${PROJECT_REF}:${encodedKey}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    if (await tryDBPush(dbUrl, `pooler transaction mode (${region})`)) return;
  }

  console.log('\n=== All pooler methods failed ===');
  console.log('\nThe migration SQL needs to be run manually.');
  console.log('Please go to the Supabase SQL Editor:');
  console.log(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
  console.log('\nAnd paste the following SQL:\n');
  console.log(fs.readFileSync(migrationPath, 'utf-8'));
}

main().catch(console.error);
