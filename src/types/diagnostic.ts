// 리스크 요소 타입
export type RiskFactor = 'Fp' | 'Oc' | 'Ch'

// 우선순위 타입
export type Priority = '필수' | '권장' | '조건부'

// 확인 방법 타입
export type CheckMethod = '육안확인' | '작동확인' | '측정확인'

// 증빙 유형 타입
export type EvidenceType = '사진' | '점검표' | '측정기록'

// 새로운 체크리스트 항목 타입
export interface ChecklistItem {
  id: string
  category: string
  subcategory: string
  item: string
  priority: Priority
  method: CheckMethod
  evidence: EvidenceType
  isCustom?: boolean  // 사용자 추가 항목 여부
}

// 새로운 체크리스트 타입
export interface IndustryChecklist {
  id: string
  name: string
  icon: string
  description: string
  items: ChecklistItem[]
}

// 기존 호환성을 위한 타입 (deprecated)
export interface Question {
  id: string
  text: string
  riskIfUnchecked: number
}

export interface Category {
  id: string
  name: string
  riskFactor: RiskFactor
  weight: number
  questions: Question[]
}

export interface Checklist {
  industry: string
  name: string
  categories: Category[]
}

// 진단 응답 타입 (DB 저장용)
export interface DiagnosticResponse {
  id: string
  project_id: string
  item_id: string
  question_id?: string  // 기존 호환성
  category: string
  subcategory?: string
  checked: boolean
  status?: 'pass' | 'fail' | 'na' | 'pending'  // 상태
  note?: string  // 메모
  evidence_url?: string  // 증빙 사진 URL
  weight?: number
  risk_factor?: RiskFactor
  created_at: string
  updated_at: string
}

// 리스크 점수 타입
export interface RiskScores {
  Fp: number
  Oc: number
  Ch: number
  total: number
}

// 카테고리별 그룹화된 항목
export interface GroupedItems {
  [category: string]: {
    [subcategory: string]: ChecklistItem[]
  }
}

// 커스텀 항목 입력 폼 타입
export interface CustomItemForm {
  category: string
  subcategory: string
  item: string
  priority: Priority
  method: CheckMethod
  evidence: EvidenceType
}

// 카테고리 옵션
export const CATEGORY_OPTIONS = [
  '안전',
  '법규',
  '품질',
  '설비',
  '마감',
  '기타'
] as const

// 우선순위 옵션
export const PRIORITY_OPTIONS: Priority[] = ['필수', '권장', '조건부']

// 확인 방법 옵션
export const METHOD_OPTIONS: CheckMethod[] = ['육안확인', '작동확인', '측정확인']

// 증빙 유형 옵션
export const EVIDENCE_OPTIONS: EvidenceType[] = ['사진', '점검표', '측정기록']

// 카테고리별 리스크 요소 매핑
export const CATEGORY_RISK_FACTOR: Record<string, RiskFactor> = {
  '안전': 'Fp',
  '법규': 'Ch',
  '품질': 'Oc',
  '설비': 'Oc',
  '마감': 'Oc',
  '기타': 'Oc'
}

// 우선순위별 리스크 점수
export const PRIORITY_RISK_SCORE: Record<Priority, number> = {
  '필수': 10,
  '권장': 5,
  '조건부': 3
}
