/**
 * 새로 생성된 7개 테이블에 데이터 채우기
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

console.log('🌱 새 테이블 데이터 시딩\n')

async function seed() {
  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id')
    .limit(1)
    .single()

  if (!project) {
    console.log('❌ 프로젝트 없음')
    return
  }

  const projectId = project.id
  const userId = project.user_id

  console.log(`✅ 프로젝트: ${projectId}`)
  console.log(`✅ 사용자: ${userId}\n`)

  let successCount = 0
  let errorCount = 0

  // 1. photos
  console.log('📷 photos...')
  const { error: e1 } = await supabase.from('photos').insert([
    {
      project_id: projectId,
      file_name: '현장사진_1.jpg',
      file_url: 'https://example.com/photo1.jpg',
      file_size: 2048000,
      mime_type: 'image/jpeg',
      category: '시공전',
      description: '철거 전 전경',
      location: '1층 홀',
      taken_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      uploaded_by: userId
    },
    {
      project_id: projectId,
      file_name: '현장사진_2.jpg',
      file_url: 'https://example.com/photo2.jpg',
      file_size: 1536000,
      mime_type: 'image/jpeg',
      category: '시공중',
      description: '철거 작업 중',
      location: '1층 홀',
      taken_at: new Date().toISOString(),
      uploaded_by: userId
    }
  ])
  if (e1) { console.log(`   ❌ ${e1.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 2. certificates
  console.log('📜 certificates...')
  const { error: e2 } = await supabase.from('certificates').insert([
    {
      project_id: projectId,
      certificate_type: 'completion',
      certificate_number: 'CERT-2026-001',
      title: '준공 증명서',
      issued_date: new Date().toISOString().split('T')[0],
      issued_by: userId,
      file_url: 'https://example.com/cert.pdf',
      status: 'issued',
      notes: '정상 준공'
    },
    {
      project_id: projectId,
      certificate_type: 'inspection',
      certificate_number: 'INSP-2026-001',
      title: '중간 검사 확인서',
      issued_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      issued_by: userId,
      status: 'issued'
    }
  ])
  if (e2) { console.log(`   ❌ ${e2.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 3. share_codes
  console.log('🔗 share_codes...')
  const shareCode = 'SHARE-' + Math.random().toString(36).substring(2, 10).toUpperCase()
  const { error: e3 } = await supabase.from('share_codes').insert([
    {
      project_id: projectId,
      share_code: shareCode,
      share_type: 'read_only',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      max_uses: 10,
      use_count: 0,
      is_active: true,
      created_by: userId
    }
  ])
  if (e3) { console.log(`   ❌ ${e3.message}`); errorCount++ } else { console.log(`   ✅ 코드: ${shareCode}`); successCount++ }

  // 4. activities
  console.log('📊 activities...')
  const { error: e4 } = await supabase.from('activities').insert([
    {
      project_id: projectId,
      user_id: userId,
      activity_type: 'project',
      action: 'created',
      resource_type: 'project',
      resource_id: projectId,
      description: '프로젝트가 생성되었습니다',
      metadata: { source: 'web', version: '1.0' }
    },
    {
      project_id: projectId,
      user_id: userId,
      activity_type: 'quote',
      action: 'generated',
      resource_type: 'quote',
      resource_id: null,
      description: '견적이 자동 생성되었습니다',
      metadata: { auto: true }
    },
    {
      project_id: projectId,
      user_id: userId,
      activity_type: 'photo',
      action: 'uploaded',
      resource_type: 'photo',
      resource_id: null,
      description: '현장 사진이 업로드되었습니다',
      metadata: { count: 2 }
    }
  ])
  if (e4) { console.log(`   ❌ ${e4.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 5. risk_history
  console.log('⚠️ risk_history...')
  const { error: e5 } = await supabase.from('risk_history').insert([
    {
      project_id: projectId,
      risk_score: 34.5,
      risk_grade: 'B',
      risk_level: 'medium',
      financial_risk: 12.5,
      operational_risk: 15.0,
      change_risk: 7.0,
      factors: {
        budget_variance: 0.05,
        schedule_delay: 2,
        change_requests: 1
      },
      notes: '초기 리스크 평가',
      calculated_by: userId
    },
    {
      project_id: projectId,
      risk_score: 28.2,
      risk_grade: 'B',
      risk_level: 'low',
      financial_risk: 10.0,
      operational_risk: 12.2,
      change_risk: 6.0,
      factors: {
        budget_variance: 0.03,
        schedule_delay: 1,
        change_requests: 0
      },
      notes: '개선됨 - 철거 완료 후',
      calculated_by: userId
    }
  ])
  if (e5) { console.log(`   ❌ ${e5.message}`); errorCount++ } else { console.log('   ✅'); successCount++ }

  // 6. evidence_packages
  console.log('📦 evidence_packages...')
  const verificationCode = 'VERIFY-' + Math.random().toString(36).substring(2, 10).toUpperCase()
  const { error: e6 } = await supabase.from('evidence_packages').insert([
    {
      project_id: projectId,
      package_name: '계약 증빙 패키지',
      package_type: 'legal',
      merkle_root: '0x' + Math.random().toString(16).substring(2, 66),
      verification_code: verificationCode,
      status: 'sealed',
      sealed_at: new Date().toISOString(),
      sealed_by: userId,
      file_count: 5,
      total_size: 10240000,
      metadata: {
        includes: ['계약서', '견적서', '도면', '허가서', '보험증권']
      }
    }
  ])
  if (e6) { console.log(`   ❌ ${e6.message}`); errorCount++ } else { console.log(`   ✅ 코드: ${verificationCode}`); successCount++ }

  // 7. project_invites
  console.log('✉️ project_invites...')
  const inviteCode = 'INVITE-' + Math.random().toString(36).substring(2, 10).toUpperCase()
  const { error: e7 } = await supabase.from('project_invites').insert([
    {
      project_id: projectId,
      email: 'contractor@example.com',
      role: 'contractor',
      invite_code: inviteCode,
      status: 'pending',
      invited_by: userId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: '프로젝트에 초대합니다'
    }
  ])
  if (e7) { console.log(`   ❌ ${e7.message}`); errorCount++ } else { console.log(`   ✅ 코드: ${inviteCode}`); successCount++ }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ 성공: ${successCount}/7`)
  console.log(`❌ 실패: ${errorCount}/7`)
  console.log('='.repeat(60))

  if (successCount === 7) {
    console.log('\n🎉 모든 테이블에 데이터 추가 완료!')
    console.log('\n확인: node scripts/check-all-tables.js')
  } else {
    console.log('\n⚠️ 일부 실패 - 테이블이 생성되었는지 확인하세요')
    console.log('테이블 생성: SETUP-GUIDE.md 참고')
  }
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
