const fs = require('fs')
const https = require('https')

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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const host = new URL(SUPABASE_URL).hostname

const req = https.request({
  hostname: host,
  path: '/rest/v1/knowledge_chunks?select=category',
  method: 'GET',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
  }
}, r => {
  let d = ''
  r.on('data', c => d += c)
  r.on('end', () => {
    const rows = JSON.parse(d)
    const cats = {}
    rows.forEach(row => {
      cats[row.category] = (cats[row.category] || 0) + 1
    })
    console.log('총 knowledge_chunks:', rows.length)
    console.log('카테고리별:')
    Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
      console.log('  ' + k + ': ' + v + '개')
    })
  })
})
req.end()
