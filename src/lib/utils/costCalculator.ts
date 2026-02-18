/**
 * Check-In 비용분석 알고리즘
 * 특허 공식: ΔC = Cb × (1 + Σ(Wi × Fi))
 */

export interface CostFactor {
  id: string
  name: string
  description: string
  weight: number  // Wi: 가중치 (0-1)
  factor: number  // Fi: 영향도 (0-1)
}

export interface CostCalculationInput {
  baseCost: number        // Cb: 기본비용
  factors: CostFactor[]   // 비용 영향 요인들
}

export interface CostCalculationResult {
  baseCost: number
  adjustedCost: number
  costDifference: number
  adjustmentRate: number
  sumWiFi: number
  factorContributions: Array<{
    id: string
    name: string
    contribution: number
    contributionRate: number
  }>
}

// 기본 비용 요인 정의
export const DEFAULT_COST_FACTORS: CostFactor[] = [
  {
    id: 'complexity',
    name: '공사 복잡도',
    description: '설계 및 시공의 기술적 난이도',
    weight: 0.15,
    factor: 0,
  },
  {
    id: 'timeline',
    name: '공기 압박',
    description: '촉박한 일정으로 인한 추가 비용',
    weight: 0.10,
    factor: 0,
  },
  {
    id: 'material',
    name: '자재 변동',
    description: '자재 가격 변동 및 품질 요구사항',
    weight: 0.12,
    factor: 0,
  },
  {
    id: 'labor',
    name: '인건비 변동',
    description: '인력 수급 및 숙련도에 따른 비용',
    weight: 0.08,
    factor: 0,
  },
  {
    id: 'risk',
    name: '리스크 프리미엄',
    description: '예상치 못한 상황에 대한 예비비',
    weight: 0.10,
    factor: 0,
  },
  {
    id: 'location',
    name: '현장 여건',
    description: '접근성, 주차, 반입 난이도',
    weight: 0.08,
    factor: 0,
  },
  {
    id: 'season',
    name: '계절 요인',
    description: '성수기/비수기, 날씨 영향',
    weight: 0.07,
    factor: 0,
  },
]

/**
 * 비용 계산
 * ΔC = Cb × (1 + Σ(Wi × Fi))
 */
export function calculateCost(input: CostCalculationInput): CostCalculationResult {
  const { baseCost, factors } = input

  // Σ(Wi × Fi) 계산
  const factorContributions = factors.map(f => ({
    id: f.id,
    name: f.name,
    contribution: f.weight * f.factor,
    contributionRate: f.weight * f.factor * 100,
  }))

  const sumWiFi = factorContributions.reduce((sum, fc) => sum + fc.contribution, 0)

  // 조정된 비용 계산
  const adjustmentRate = sumWiFi
  const adjustedCost = Math.round(baseCost * (1 + sumWiFi))
  const costDifference = adjustedCost - baseCost

  return {
    baseCost,
    adjustedCost,
    costDifference,
    adjustmentRate,
    sumWiFi,
    factorContributions,
  }
}

/**
 * 비용 시나리오 분석
 */
export function analyzeScenarios(
  baseCost: number,
  factors: CostFactor[]
): {
  optimistic: CostCalculationResult
  realistic: CostCalculationResult
  pessimistic: CostCalculationResult
} {
  // 낙관적: 모든 요인을 50% 감소
  const optimisticFactors = factors.map(f => ({
    ...f,
    factor: f.factor * 0.5,
  }))

  // 현실적: 현재 요인 그대로
  const realisticFactors = factors

  // 비관적: 모든 요인을 50% 증가
  const pessimisticFactors = factors.map(f => ({
    ...f,
    factor: Math.min(f.factor * 1.5, 1),
  }))

  return {
    optimistic: calculateCost({ baseCost, factors: optimisticFactors }),
    realistic: calculateCost({ baseCost, factors: realisticFactors }),
    pessimistic: calculateCost({ baseCost, factors: pessimisticFactors }),
  }
}

/**
 * 금액 포맷팅 (한국어) - 원 단위, 천단위 콤마
 */
export function formatKRW(amount: number): string {
  return `${amount.toLocaleString()}원`
}

/**
 * 비용 비교 분석
 */
export function compareCosts(
  original: number,
  adjusted: number
): {
  difference: number
  percentageChange: number
  direction: 'increase' | 'decrease' | 'same'
} {
  const difference = adjusted - original
  const percentageChange = original > 0 ? (difference / original) * 100 : 0

  let direction: 'increase' | 'decrease' | 'same'
  if (difference > 0) direction = 'increase'
  else if (difference < 0) direction = 'decrease'
  else direction = 'same'

  return { difference, percentageChange, direction }
}
