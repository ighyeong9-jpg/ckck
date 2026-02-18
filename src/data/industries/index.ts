/**
 * 업종별 데이터 인덱스
 * 체크리스트 및 리스크 가중치 통합 내보내기
 */

// 체크리스트 재내보내기
export * from '../checklists'
export { default as checklists } from '../checklists'

// 업종 정보 (아이콘, 이름, 설명)
export const industryInfo = {
  cafe: { id: 'cafe', name: '카페', icon: '☕', description: '카페/커피숍 인테리어' },
  restaurant: { id: 'restaurant', name: '음식점', icon: '🍽️', description: '일반 음식점 인테리어' },
  bar: { id: 'bar', name: '술집/바', icon: '🍺', description: '주점/바/펍 인테리어' },
  bakery: { id: 'bakery', name: '베이커리', icon: '🥐', description: '베이커리/빵집/디저트샵 인테리어' },
  beauty: { id: 'beauty', name: '미용실/네일샵', icon: '💇', description: '미용실/네일샵/에스테틱 인테리어' },
  clinic: { id: 'clinic', name: '병원/의원', icon: '🏥', description: '병원/의원/클리닉 인테리어' },
  fitness: { id: 'fitness', name: '헬스장/피트니스', icon: '💪', description: '헬스장/피트니스센터/요가 인테리어' },
  retail: { id: 'retail', name: '소매점/편의점', icon: '🛒', description: '소매점/편의점/매장 인테리어' },
  office: { id: 'office', name: '사무실', icon: '🏢', description: '사무실/오피스 인테리어' },
  academy: { id: 'academy', name: '학원', icon: '📚', description: '학원/교습소 인테리어' },
  apartment: { id: 'apartment', name: '아파트', icon: '🏠', description: '아파트 주거공간 인테리어' },
  villa: { id: 'villa', name: '빌라', icon: '🏡', description: '빌라/다세대주택 인테리어' },
  house: { id: 'house', name: '단독주택', icon: '🏘️', description: '단독주택 인테리어' },
} as const

// 업종별 리스크 가중치
// Wf: 재정 리스크 가중치 (Financial)
// Wo: 운영 리스크 가중치 (Operational)
// Wc: 규정준수 리스크 가중치 (Compliance)
export const industryRiskWeights = {
  // F&B 업종
  cafe: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  restaurant: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  bar: { Wf: 0.35, Wo: 0.30, Wc: 0.35 },
  bakery: { Wf: 0.38, Wo: 0.35, Wc: 0.27 },

  // 서비스 업종
  beauty: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  clinic: { Wf: 0.30, Wo: 0.30, Wc: 0.40 },
  fitness: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },

  // 상업/사무 업종
  retail: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  office: { Wf: 0.38, Wo: 0.37, Wc: 0.25 },
  academy: { Wf: 0.33, Wo: 0.32, Wc: 0.35 },

  // 주거 업종
  apartment: { Wf: 0.35, Wo: 0.40, Wc: 0.25 },
  villa: { Wf: 0.35, Wo: 0.40, Wc: 0.25 },
  house: { Wf: 0.35, Wo: 0.40, Wc: 0.25 },
} as const

export type IndustryType = keyof typeof industryRiskWeights

// 업종 선택 옵션 목록
export const industryOptions = Object.values(industryInfo)

// 업종 그룹
export const industryGroups = {
  fnb: ['cafe', 'restaurant', 'bar', 'bakery'],
  service: ['beauty', 'clinic', 'fitness'],
  commercial: ['retail', 'office', 'academy'],
  residential: ['apartment', 'villa', 'house'],
} as const

export type IndustryGroup = keyof typeof industryGroups

// 업종 그룹 정보
export const industryGroupInfo = {
  fnb: { name: 'F&B (식음료)', description: '카페, 음식점, 바, 베이커리' },
  service: { name: '서비스업', description: '미용실, 병원, 피트니스' },
  commercial: { name: '상업/사무', description: '소매점, 사무실, 학원' },
  residential: { name: '주거', description: '아파트, 빌라, 단독주택' },
} as const

// 업종으로 그룹 찾기
export function getIndustryGroup(industry: IndustryType): IndustryGroup | undefined {
  for (const [group, industries] of Object.entries(industryGroups)) {
    if ((industries as readonly string[]).includes(industry)) {
      return group as IndustryGroup
    }
  }
  return undefined
}

// 리스크 가중치 가져오기
export function getRiskWeights(industry: IndustryType) {
  return industryRiskWeights[industry]
}

// 업종 정보 가져오기
export function getIndustryInfo(industry: IndustryType) {
  return industryInfo[industry]
}
