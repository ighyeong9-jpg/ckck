/**
 * Check-In 리스크 계산 알고리즘
 * 특허 공식: R = Fp×Wf + Oc×Wo + Ch×Wc
 */

export interface RiskWeights {
  Wf: number  // 재정적 위험 가중치
  Wo: number  // 운영 복잡도 가중치
  Wc: number  // 변경 리스크 가중치
}

export interface RiskFactors {
  Fp: number  // 재정적 위험 점수 (0-100)
  Oc: number  // 운영 복잡도 점수 (0-100)
  Ch: number  // 변경 리스크 점수 (0-100)
}

export interface RiskResult {
  total: number
  grade: string
  level: 'low' | 'medium' | 'high'
  factors: RiskFactors
  breakdown: {
    financial: number
    operational: number
    change: number
  }
}

// 기본 가중치 (총합 = 1.0)
export const DEFAULT_WEIGHTS: RiskWeights = {
  Wf: 0.40,  // 재정적 위험 40%
  Wo: 0.35,  // 운영 복잡도 35%
  Wc: 0.25,  // 변경 리스크 25%
}

// 업종별 가중치 설정
export const INDUSTRY_WEIGHTS: Record<string, RiskWeights> = {
  interior: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  construction: { Wf: 0.35, Wo: 0.40, Wc: 0.25 },
  renovation: { Wf: 0.38, Wo: 0.35, Wc: 0.27 },
  electrical: { Wf: 0.30, Wo: 0.45, Wc: 0.25 },
  plumbing: { Wf: 0.32, Wo: 0.43, Wc: 0.25 },
  painting: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  flooring: { Wf: 0.35, Wo: 0.38, Wc: 0.27 },
  kitchen: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  bathroom: { Wf: 0.38, Wo: 0.37, Wc: 0.25 },
  window: { Wf: 0.35, Wo: 0.40, Wc: 0.25 },
  roofing: { Wf: 0.33, Wo: 0.42, Wc: 0.25 },
  landscaping: { Wf: 0.30, Wo: 0.40, Wc: 0.30 },
  commercial: { Wf: 0.42, Wo: 0.33, Wc: 0.25 },
}

/**
 * 리스크 점수 계산
 * R = Fp×Wf + Oc×Wo + Ch×Wc
 */
export function calculateRiskScore(
  factors: RiskFactors,
  weights: RiskWeights = DEFAULT_WEIGHTS
): RiskResult {
  // 가중 합산
  const financialContribution = factors.Fp * weights.Wf
  const operationalContribution = factors.Oc * weights.Wo
  const changeContribution = factors.Ch * weights.Wc

  const total = Math.round(
    financialContribution + operationalContribution + changeContribution
  )

  // 등급 및 레벨 결정
  const { grade, level } = getRiskGradeAndLevel(total)

  return {
    total,
    grade,
    level,
    factors,
    breakdown: {
      financial: Math.round(financialContribution),
      operational: Math.round(operationalContribution),
      change: Math.round(changeContribution),
    },
  }
}

/**
 * 리스크 등급 및 레벨 결정
 */
export function getRiskGradeAndLevel(score: number): { grade: string; level: 'low' | 'medium' | 'high' } {
  if (score <= 20) return { grade: 'A', level: 'low' }
  if (score <= 40) return { grade: 'B', level: 'low' }
  if (score <= 60) return { grade: 'C', level: 'medium' }
  if (score <= 80) return { grade: 'D', level: 'high' }
  return { grade: 'F', level: 'high' }
}

/**
 * 체크리스트 응답으로부터 카테고리별 리스크 계산
 */
export function calculateCategoryRisk(
  questions: Array<{ id: string; riskIfUnchecked: number }>,
  responses: Record<string, boolean>
): number {
  let categoryRisk = 0
  let maxRisk = 0

  questions.forEach(question => {
    maxRisk += question.riskIfUnchecked
    if (!responses[question.id]) {
      categoryRisk += question.riskIfUnchecked
    }
  })

  // 0-100 정규화
  return maxRisk > 0 ? Math.round((categoryRisk / maxRisk) * 100) : 0
}

/**
 * 리스크 추세 분석
 */
export function analyzeRiskTrend(
  historicalScores: number[]
): { trend: 'improving' | 'stable' | 'worsening'; change: number } {
  if (historicalScores.length < 2) {
    return { trend: 'stable', change: 0 }
  }

  const recent = historicalScores.slice(-3)
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length
  const oldest = historicalScores[0]
  const change = avgRecent - oldest

  if (change < -10) return { trend: 'improving', change }
  if (change > 10) return { trend: 'worsening', change }
  return { trend: 'stable', change }
}
