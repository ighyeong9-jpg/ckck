/**
 * quote-chat.ts — AI 예산 가이드 채팅형 4문답 타입 + 상태
 *
 * 사용자가 말하면 30초 안에 예산 감을 잡는다.
 * 정확한 견적이 아니다. 예산 감잡기 도구다.
 */

// ═══════════════════════════════════════════════════════════
// 공간 유형
// ═══════════════════════════════════════════════════════════

export type SpaceCategory = 'residential' | 'commercial'

export interface SpaceType {
  id: string
  category: SpaceCategory
  label: string
  emoji: string
  description: string
  baseMultiplier: number  // 주거 기준 배수
}

export const SPACE_TYPES: SpaceType[] = [
  // ─── 주거 ─────────────────────────────────────────────
  { id: 'apartment',     category: 'residential', label: '아파트',     emoji: '🏠', description: '아파트 리모델링',        baseMultiplier: 1.0 },
  { id: 'villa',         category: 'residential', label: '빌라/다세대', emoji: '🏡', description: '빌라·다세대 리모델링',   baseMultiplier: 0.95 },
  { id: 'house',         category: 'residential', label: '단독주택',   emoji: '🏘️', description: '단독주택 리모델링',      baseMultiplier: 1.1 },
  { id: 'officetel',     category: 'residential', label: '오피스텔',   emoji: '🏢', description: '오피스텔 리모델링',      baseMultiplier: 0.9 },
  { id: 'studio',        category: 'residential', label: '원룸',       emoji: '🛏️', description: '원룸·고시원 리모델링',   baseMultiplier: 0.85 },

  // ─── 상업 ─────────────────────────────────────────────
  { id: 'cafe',          category: 'commercial',  label: '카페/음식점', emoji: '☕', description: '카페·식당 인테리어',     baseMultiplier: 1.8 },
  { id: 'office',        category: 'commercial',  label: '사무실/오피스',emoji: '💼', description: '사무공간 인테리어',      baseMultiplier: 1.3 },
  { id: 'retail',        category: 'commercial',  label: '상가/매장',   emoji: '🛍️', description: '상가·매장 인테리어',    baseMultiplier: 1.5 },
  { id: 'clinic',        category: 'commercial',  label: '병원/클리닉', emoji: '🏥', description: '의료공간 인테리어',      baseMultiplier: 3.0 },
  { id: 'fitness',       category: 'commercial',  label: '헬스장/스튜디오',emoji: '💪', description: '운동시설 인테리어', baseMultiplier: 2.0 },
  { id: 'other_commercial',category: 'commercial', label: '기타 상업',   emoji: '🏪', description: '기타 상업공간',        baseMultiplier: 1.5 },
]

// ═══════════════════════════════════════════════════════════
// 자재 등급
// ═══════════════════════════════════════════════════════════

export type MaterialGrade = 'economy' | 'standard' | 'premium' | 'luxury'

export interface MaterialGradeOption {
  id: MaterialGrade
  label: string
  emoji: string
  description: string
  priceMultiplier: number
}

export const MATERIAL_GRADES: MaterialGradeOption[] = [
  {
    id: 'economy',
    label: '경제형',
    emoji: '💚',
    description: '실용적인 기본 자재. 초기 창업·단기 임차 추천.',
    priceMultiplier: 0.75,
  },
  {
    id: 'standard',
    label: '표준형',
    emoji: '⭐',
    description: '품질과 가격의 균형. 일반 시공 기본값.',
    priceMultiplier: 1.0,
  },
  {
    id: 'premium',
    label: '고급형',
    emoji: '✨',
    description: '고품질 자재. 장기 운영·브랜드 공간 추천.',
    priceMultiplier: 1.5,
  },
  {
    id: 'luxury',
    label: '프리미엄',
    emoji: '💎',
    description: '최고급 자재. 럭셔리 브랜드·플래그십 공간.',
    priceMultiplier: 2.2,
  },
]

// ═══════════════════════════════════════════════════════════
// 공사 일정
// ═══════════════════════════════════════════════════════════

export type SchedulePressure = 'relaxed' | 'month' | 'twoweeks' | 'oneweek'

export interface ScheduleOption {
  id: SchedulePressure
  label: string
  emoji: string
  description: string
  surchargeRate: number  // 추가 할증률
}

export const SCHEDULE_OPTIONS: ScheduleOption[] = [
  { id: 'relaxed',   label: '여유있게',    emoji: '😌', description: '2개월 이상. 기본 단가.',       surchargeRate: 0 },
  { id: 'month',     label: '한 달 이내',  emoji: '📅', description: '30일 내 완공.',               surchargeRate: 0 },
  { id: 'twoweeks',  label: '2주 이내',    emoji: '⚡', description: '14일 내 완공. +10% 할증.',    surchargeRate: 0.1 },
  { id: 'oneweek',   label: '1주일 이내',  emoji: '🔥', description: '7일 내 완공. +15% 할증.',     surchargeRate: 0.15 },
]

// ═══════════════════════════════════════════════════════════
// 채팅 상태
// ═══════════════════════════════════════════════════════════

export type ChatStep =
  | 'select_space'      // 공간 유형 선택
  | 'input_area'        // 평수 입력
  | 'select_grade'      // 자재 등급
  | 'select_schedule'   // 공사 일정
  | 'generating'        // AI 생성 중
  | 'result'            // 결과 표시

export interface BudgetChatState {
  step: ChatStep
  spaceType: SpaceType | null
  areaPyeong: number | null
  grade: MaterialGradeOption | null
  schedule: ScheduleOption | null
}

// ═══════════════════════════════════════════════════════════
// 예산 결과 타입
// ═══════════════════════════════════════════════════════════

export interface BudgetGrade {
  label: string
  min: number
  max: number
  per_pyeong: string
  good_for: string
  risks: string[]
}

export interface BudgetGuideResult {
  summary: string
  grades: {
    economy: BudgetGrade
    standard: BudgetGrade
    premium: BudgetGrade
  }
  hidden_costs: string[]
  why_expensive: string[]
  why_cheap_risks: string[]
  checklist: string[]
  disclaimer: string
  space_type: string
  area_pyeong: number
  grade: MaterialGrade
  schedule: SchedulePressure
  generated_at: string
}
