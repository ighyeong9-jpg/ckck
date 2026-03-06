/**
 * FK 무결성 검사
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

async function checkIntegrity() {
  console.log('🔍 FK 무결성 검사\n')

  // 1. quote_line_items → quotes
  const { data: lineItems } = await supabase
    .from('quote_line_items')
    .select('id, quote_id')

  if (lineItems && lineItems.length > 0) {
    console.log(`📌 quote_line_items: ${lineItems.length}개`)
    const quoteIds = [...new Set(lineItems.map(i => i.quote_id))]
    console.log(`   참조하는 quote_id: ${quoteIds.join(', ')}`)

    const { data: quotes } = await supabase
      .from('quotes')
      .select('id')
      .in('id', quoteIds)

    console.log(`   실제 존재하는 quotes: ${quotes?.length || 0}개`)
    if (quotes?.length !== quoteIds.length) {
      console.log(`   ⚠️ FK 무결성 위반 가능성!`)
    }
  }

  console.log()
}

checkIntegrity()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
