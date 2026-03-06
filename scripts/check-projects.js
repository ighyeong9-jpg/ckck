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

async function check() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')

  console.log('Projects:', data)
  console.log('Error:', error)
}

check().then(() => process.exit(0))
