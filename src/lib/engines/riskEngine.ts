/**
 * 리스크 점수 엔진
 * 공식: R = Fp×Wf + Oc×Wo + Ch×Wc (BUSINESS_LOGIC.md 기준)
 *
 * Fp: 법령 준수 점수 (law_checks 기반)
 * Oc: 공정 관리 점수 (일정 지연 비율)
 * Ch: 체크리스트 점수 (미완료 항목 비율)
 */
import { createClient } from '@/lib/supabase/server'

// 가중치 (BUSINESS_LOGIC.md 설계 기준)
const WEIGHTS = {
  Wf: 0.45,  // 법령 준수 가중치
  Wo: 0.25,  // 공정 관리 가중치
  Wc: 0.30,  // 체크리스트 가중치
} as const

export type RiskGrade = 'safe' | 'caution' | 'warning' | 'danger'

export interface RiskCalculationResult {
  score: number
  grade: RiskGrade
  fp_score: number
  fp_weight: number
  oc_score: number
  oc_weight: number
  ch_score: number
  ch_weight: number
  details: RiskDetails
  calculated_at: string
}

export interface RiskDetails {
  fp_violated_count: number
  fp_applicable_count: number
  oc_expected_progress: number
  oc_actual_progress: number
  oc_delay_ratio: number
  ch_total: number
  ch_unchecked_count: number
  formula: string
}

function toGrade(score: number): RiskGrade {
  if (score <= 25) return 'safe'
  if (score <= 50) return 'caution'
  if (score <= 75) return 'warning'
  return 'danger'
}

/**
 * 프로젝트 리스크 점수 계산 + 저장
 * risk_scores 테이블에 이력 저장, projects.risk_score 최신값 갱신
 */
export async function calculateAndSaveRiskScore(
  projectId: string
): Promise<RiskCalculationResult> {
  const supabase = createClient()

  // 프로젝트 기본 정보
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, start_date, end_date, progress')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    throw new Error('프로젝트를 찾을 수 없습니다.')
  }

  // ─── Fp: 법령 준수 점수 ───────────────────────────────
  const { data: lawChecks } = await supabase
    .from('law_checks')
    .select('status')
    .eq('project_id', projectId)

  let fpScore = 0
  let fpViolatedCount = 0
  let fpApplicableCount = 0

  if (lawChecks && lawChecks.length > 0) {
    const applicable = lawChecks.filter(lc => lc.status !== 'not_applicable')
    const violated = applicable.filter(lc => lc.status === 'violated')
    fpApplicableCount = applicable.length
    fpViolatedCount = violated.length
    fpScore = fpApplicableCount > 0
      ? (fpViolatedCount / fpApplicableCount) * 100
      : 0
  }

  // ─── Oc: 공정 관리 점수 ──────────────────────────────
  let ocScore = 0
  let ocExpectedProgress = 0
  let ocActualProgress = 0
  let ocDelayRatio = 0

  if (project.start_date && project.end_date) {
    const today = new Date()
    const start = new Date(project.start_date)
    const end = new Date(project.end_date)
    const totalDays = (end.getTime() - start.getTime()) / 86400000

    if (totalDays > 0 && today > start) {
      const elapsed = (today.getTime() - start.getTime()) / 86400000
      ocExpectedProgress = Math.min(100, (elapsed / totalDays) * 100)

      // 실제 진행률: processes 테이블 평균 or projects.progress
      const { data: processes } = await supabase
        .from('processes')
        .select('progress')
        .eq('project_id', projectId)

      if (processes && processes.length > 0) {
        ocActualProgress =
          processes.reduce((sum, p) => sum + (p.progress || 0), 0) / processes.length
      } else {
        ocActualProgress = project.progress || 0
      }

      ocDelayRatio = Math.max(0, ocExpectedProgress - ocActualProgress)
      ocScore = Math.min(100, ocDelayRatio * 2)
    }
  }

  // ─── Ch: 체크리스트 점수 ─────────────────────────────
  let chScore = 0
  let chTotal = 0
  let chUncheckedCount = 0

  const { data: responses } = await supabase
    .from('diagnostic_responses')
    .select('status')
    .eq('project_id', projectId)

  if (responses && responses.length > 0) {
    chTotal = responses.length
    const confirmed = responses.filter(r => r.status === 'confirmed').length
    chUncheckedCount = chTotal - confirmed
    chScore = (chUncheckedCount / chTotal) * 100
  }

  // ─── R = Fp×Wf + Oc×Wo + Ch×Wc ──────────────────────
  const rawScore = fpScore * WEIGHTS.Wf + ocScore * WEIGHTS.Wo + chScore * WEIGHTS.Wc
  const score = Math.round(Math.min(100, Math.max(0, rawScore)))
  const grade = toGrade(score)
  const calculatedAt = new Date().toISOString()

  const details: RiskDetails = {
    fp_violated_count: fpViolatedCount,
    fp_applicable_count: fpApplicableCount,
    oc_expected_progress: Math.round(ocExpectedProgress * 10) / 10,
    oc_actual_progress: Math.round(ocActualProgress * 10) / 10,
    oc_delay_ratio: Math.round(ocDelayRatio * 10) / 10,
    ch_total: chTotal,
    ch_unchecked_count: chUncheckedCount,
    formula: `R = ${fpScore.toFixed(1)}×${WEIGHTS.Wf} + ${ocScore.toFixed(1)}×${WEIGHTS.Wo} + ${chScore.toFixed(1)}×${WEIGHTS.Wc} = ${score}`,
  }

  // risk_scores 이력 저장
  await supabase.from('risk_scores').insert({
    project_id: projectId,
    score,
    grade,
    fp_score: fpScore,
    fp_weight: WEIGHTS.Wf,
    oc_score: ocScore,
    oc_weight: WEIGHTS.Wo,
    ch_score: chScore,
    ch_weight: WEIGHTS.Wc,
    details,
    calculated_at: calculatedAt,
  })

  // projects 최신값 갱신
  await supabase
    .from('projects')
    .update({ risk_score: score, updated_at: calculatedAt })
    .eq('id', projectId)

  return {
    score,
    grade,
    fp_score: fpScore,
    fp_weight: WEIGHTS.Wf,
    oc_score: ocScore,
    oc_weight: WEIGHTS.Wo,
    ch_score: chScore,
    ch_weight: WEIGHTS.Wc,
    details,
    calculated_at: calculatedAt,
  }
}

/**
 * GO/NO-GO 판정 (BUSINESS_LOGIC.md 기준)
 */
export async function getGoNoGo(projectId: string) {
  const supabase = createClient()
  const reasons: string[] = []

  // 1. 법령 위반 확인
  const { data: lawChecks } = await supabase
    .from('law_checks')
    .select('status, law_id')
    .eq('project_id', projectId)
    .eq('status', 'violated')

  if (lawChecks && lawChecks.length > 0) {
    // 위반 법령 상세 조회
    const lawIds = lawChecks.map(lc => lc.law_id)
    const { data: laws } = await supabase
      .from('laws')
      .select('id, name, article')
      .in('id', lawIds)

    const lawMap = new Map((laws || []).map(l => [l.id, l]))
    for (const lc of lawChecks) {
      const law = lawMap.get(lc.law_id)
      reasons.push(law ? `${law.name} ${law.article} 위반` : '법령 위반')
    }
  }

  // 2. 리스크 점수 확인
  const { data: project } = await supabase
    .from('projects')
    .select('risk_score')
    .eq('id', projectId)
    .single()

  const riskScore = project?.risk_score || 0
  if (riskScore >= 76) {
    reasons.push(`리스크 점수 ${riskScore}점 — 위험 등급`)
  }

  // 3. 체크리스트 완료율 확인
  const { data: responses } = await supabase
    .from('diagnostic_responses')
    .select('status')
    .eq('project_id', projectId)

  let completionRate = 100
  if (responses && responses.length > 0) {
    const confirmed = responses.filter(r => r.status === 'confirmed').length
    completionRate = Math.round((confirmed / responses.length) * 100)
    if (completionRate < 80) {
      reasons.push(`체크리스트 완료율 ${completionRate}% — 80% 미만`)
    }
  }

  return {
    project_id: projectId,
    go_nogo: reasons.length === 0 ? 'go' : 'nogo',
    reasons,
    risk_score: riskScore,
    checklist_completion_rate: completionRate,
    calculated_at: new Date().toISOString(),
  }
}
