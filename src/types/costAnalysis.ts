export interface CostAnalysis {
  id: string
  project_id: string
  base_cost: number
  // 가중치 (Wi)
  complexity_weight: number
  complexity_factor: number
  timeline_weight: number
  timeline_factor: number
  material_weight: number
  material_factor: number
  labor_weight: number
  labor_factor: number
  risk_weight: number
  risk_factor: number
  // 계산 결과
  adjustment_rate: number
  adjusted_cost: number
  cost_difference: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CostFactor {
  id: string
  name: string
  description: string
  weightKey: keyof CostAnalysis
  factorKey: keyof CostAnalysis
  defaultWeight: number
}

export const COST_FACTORS: CostFactor[] = [
  {
    id: 'complexity',
    name: '공사 복잡도',
    description: '설계 변경, 특수 공법, 협소 공간 등',
    weightKey: 'complexity_weight',
    factorKey: 'complexity_factor',
    defaultWeight: 0.15,
  },
  {
    id: 'timeline',
    name: '일정 압박',
    description: '촉박한 일정, 야간/주말 작업 필요',
    weightKey: 'timeline_weight',
    factorKey: 'timeline_factor',
    defaultWeight: 0.10,
  },
  {
    id: 'material',
    name: '자재 변동',
    description: '자재비 상승, 수급 불안정',
    weightKey: 'material_weight',
    factorKey: 'material_factor',
    defaultWeight: 0.12,
  },
  {
    id: 'labor',
    name: '인건비 변동',
    description: '숙련공 부족, 인건비 상승',
    weightKey: 'labor_weight',
    factorKey: 'labor_factor',
    defaultWeight: 0.08,
  },
  {
    id: 'risk',
    name: '리스크 요인',
    description: '현장 리스크, 예상치 못한 변수',
    weightKey: 'risk_weight',
    factorKey: 'risk_factor',
    defaultWeight: 0.10,
  },
]
