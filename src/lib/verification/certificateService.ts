/**
 * 인증서 발급/조회/검증 서비스
 * 서버 사이드 전용 - API Route에서만 호출
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { calculateVerificationScore } from './scoreEngine'
import type {
  VerificationCertificate,
  ScoreBreakdown,
  CertificateIssueResponse,
} from '@/types/verification'
import { BADGE_THRESHOLD, CERTIFICATE_VALIDITY_DAYS } from '@/types/verification'

/**
 * 인증서 코드 생성: CHK-YYYY-XXXXX
 */
function generateCertificateCode(): string {
  const year = new Date().getFullYear()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 혼동 문자 제외 (I,O,0,1)
  let random = ''
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `CHK-${year}-${random}`
}

/**
 * 코드 중복 확인 후 유일한 코드 생성
 */
async function generateUniqueCode(
  supabase: ReturnType<typeof createAdminClient>
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCertificateCode()
    const { data } = await supabase
      .from('verification_certificates')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (!data) return code
  }
  throw new Error('Failed to generate unique certificate code')
}

/**
 * 인증서 발급
 */
export async function issueCertificate(
  projectId: string,
  userId: string
): Promise<CertificateIssueResponse> {
  const supabase = createAdminClient()

  // 1. 프로젝트 존재 확인
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('id, name, client_name, user_id')
    .eq('id', projectId)
    .single()

  const project = projectData as { id: string; name: string; client_name: string; user_id: string } | null

  if (projectError || !project) {
    return { success: false, error: '프로젝트를 찾을 수 없습니다.' }
  }

  // 2. 소유자 확인
  if (project.user_id !== userId) {
    return { success: false, error: '본인의 프로젝트만 검증할 수 있습니다.' }
  }

  // 3. AI 점수 계산
  let score: ScoreBreakdown
  try {
    score = await calculateVerificationScore(projectId)
  } catch (err) {
    return { success: false, error: '점수 계산 중 오류가 발생했습니다.' }
  }

  // 4. 고유 코드 생성
  const code = await generateUniqueCode(supabase)

  // 5. 만료일 계산
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + CERTIFICATE_VALIDITY_DAYS)

  // 6. 프로젝트 업종 조회
  const { data: rawDiag } = await supabase
    .from('diagnostic_responses')
    .select('industry')
    .eq('project_id', projectId)
    .limit(1)
    .maybeSingle()
  const diagnosticData = rawDiag as { industry: string } | null

  // 7. 기존 active 인증서 만료 처리
  await supabase
    .from('verification_certificates')
    .update({ status: 'expired' })
    .eq('project_id', projectId)
    .eq('status', 'active')

  // 8. 인증서 INSERT
  const { data: certificate, error: insertError } = await supabase
    .from('verification_certificates')
    .insert({
      project_id: projectId,
      user_id: userId,
      code,
      total_score: score.total,
      grade: score.grade,
      cost_score: score.cost.score,
      process_score: score.process.score,
      contract_score: score.contract.score,
      schedule_score: score.schedule.score,
      project_name: project.name,
      industry: diagnosticData?.industry || null,
      client_name: project.client_name || null,
      status: 'active',
      badge_eligible: score.total >= BADGE_THRESHOLD,
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (insertError || !certificate) {
    return {
      success: false,
      error: `인증서 저장 실패: ${insertError?.message || '알 수 없는 오류'}`,
    }
  }

  return {
    success: true,
    certificate: certificate as VerificationCertificate,
    score,
  }
}

/**
 * 인증서 코드로 공개 검증
 */
export async function verifyCertificate(code: string): Promise<{
  valid: boolean
  certificate?: VerificationCertificate
  error?: string
}> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('verification_certificates')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle()

  if (error || !data) {
    return { valid: false, error: '인증서를 찾을 수 없습니다.' }
  }

  const cert = data as VerificationCertificate

  // 만료 체크
  if (cert.status === 'expired' || new Date(cert.expires_at) < new Date()) {
    return {
      valid: false,
      certificate: cert,
      error: '인증서가 만료되었습니다.',
    }
  }

  if (cert.status === 'revoked') {
    return {
      valid: false,
      certificate: cert,
      error: '인증서가 취소되었습니다.',
    }
  }

  return { valid: true, certificate: cert }
}

/**
 * 프로젝트의 최신 활성 인증서 조회
 */
export async function getActiveCertificate(
  projectId: string
): Promise<VerificationCertificate | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('verification_certificates')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as VerificationCertificate) || null
}
