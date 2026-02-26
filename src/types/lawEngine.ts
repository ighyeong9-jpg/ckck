// 법령 룰 엔진 타입 정의
// DB 테이블: laws, law_checks, risk_scores, warranties

// ============================================================
// 법령 마스터 (laws 테이블)
// ============================================================

export type LawCategory = 'safety' | 'quality' | 'contract' | 'dispute' | 'warranty'

export interface LawCheckConditions {
  type: string
  condition: string
  requires: string[]
  auto_checkable: boolean
  [key: string]: unknown
}

export interface Law {
  id: string
  code: string
  name: string
  article: string
  title: string
  description: string
  check_conditions: LawCheckConditions
  violation_action: string
  risk_weight: number
  category: LawCategory
  is_active: boolean
  sort_order: number
  created_at: string
}

// ============================================================
// 법령 체크 결과 (law_checks 테이블)
// ============================================================

export type LawCheckStatus = 'compliant' | 'violated' | 'not_applicable' | 'pending'
export type GoNoGo = 'go' | 'nogo' | 'pending'
export type CheckedBy = 'system' | 'ai' | 'manual'

export interface LawCheck {
  id: string
  project_id: string
  law_id: string
  status: LawCheckStatus
  go_nogo: GoNoGo
  details: LawCheckDetails | null
  checked_at: string
  checked_by: CheckedBy
  // 조인 데이터 (선택적)
  law?: Law
}

export interface LawCheckDetails {
  reason: string
  evidence?: string[]
  auto_check_result?: boolean
  override_by?: string
  [key: string]: unknown
}

// 법령 체크 결과 요약
export interface LawCheckSummary {
  total: number
  compliant: number
  violated: number
  not_applicable: number
  pending: number
  violated_laws: Array<{ law_code: string; law_title: string; reason: string }>
}

// ============================================================
// GO/NO-GO 판정 결과
// ============================================================

export interface GoNoGoResult {
  project_id: string
  go_nogo: GoNoGo
  reasons: string[]               // NO-GO 사유 목록 (빈 배열이면 GO)
  law_check_summary: LawCheckSummary
  risk_score: number
  checklist_completion_rate: number
  calculated_at: string
}

// GO/NO-GO 판정 기준값 (BUSINESS_LOGIC.md 기준)
export const NOGO_THRESHOLDS = {
  RISK_SCORE: 76,                 // 위험 등급 이상
  CHECKLIST_MIN_RATE: 80,         // 필수 체크리스트 최소 완료율 (%)
} as const

// ============================================================
// 리스크 점수 이력 (risk_scores 테이블)
// ============================================================

export type RiskGrade = 'safe' | 'caution' | 'warning' | 'danger'

export interface RiskScore {
  id: string
  project_id: string
  score: number
  grade: RiskGrade
  fp_score: number                // 법령 준수 점수 (Fp)
  fp_weight: number               // 법령 가중치 (Wf = 0.45)
  oc_score: number                // 공정 관리 점수 (Oc)
  oc_weight: number               // 공정 가중치 (Wo = 0.25)
  ch_score: number                // 체크리스트 점수 (Ch)
  ch_weight: number               // 체크리스트 가중치 (Wc = 0.30)
  details: RiskScoreDetails | null
  calculated_at: string
}

export interface RiskScoreDetails {
  fp_violated_count: number
  fp_applicable_count: number
  oc_expected_progress: number
  oc_actual_progress: number
  oc_delay_ratio: number
  ch_required_total: number
  ch_unchecked_count: number
  formula: string                 // 계산식 문자열 (로깅용)
}

// 리스크 등급 설정
export const RISK_GRADE_CONFIG: Record<RiskGrade, { label: string; color: string; min: number; max: number }> = {
  safe:    { label: '안전',  color: '#22c55e', min: 0,  max: 25  },
  caution: { label: '주의',  color: '#eab308', min: 26, max: 50  },
  warning: { label: '경고',  color: '#f97316', min: 51, max: 75  },
  danger:  { label: '위험',  color: '#ef4444', min: 76, max: 100 },
}

// 리스크 공식 가중치 (BUSINESS_LOGIC.md 설계 기준)
export const RISK_WEIGHTS = {
  Wf: 0.45,   // 법령 준수 가중치
  Wo: 0.25,   // 공정 관리 가중치
  Wc: 0.30,   // 체크리스트 가중치
} as const

// ============================================================
// 하자담보 (warranties 테이블)
// ============================================================

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired' | 'claimed'

export interface Warranty {
  id: string
  project_id: string
  law_id: string | null
  category: string
  start_date: string              // ISO date (YYYY-MM-DD)
  end_date: string
  duration_years: number
  status: WarrantyStatus
  alert_30d_sent: boolean
  alert_7d_sent: boolean
  alert_expired_sent: boolean
  note: string | null
  created_at: string
  // 계산 필드 (DB 미저장, 런타임 계산)
  days_remaining?: number
}

// 건산법 시행령 별표4 기준 하자담보기간
export const WARRANTY_PERIODS: Record<string, number> = {
  '대지조성공사':   2,
  '옥외급배수공사': 2,
  '위생공사':       2,
  '수장공사':       1,
  '도장공사':       1,
  '방수공사':       3,
  '석공사':         1,
  '창호공사':       1,
  '전기공사':       2,
  '통신공사':       2,
  '설비공사':       2,
  '철근콘크리트공사': 5,
  '철골공사':       5,
  '조경공사':       2,
  '타일공사':       1,
  '유리공사':       1,
  '미장공사':       1,
  '금속공사':       2,
}
