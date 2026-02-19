/**
 * 업종별 데이터 인덱스
 * 체크리스트 및 리스크 가중치 통합 내보내기
 */

// 체크리스트 재내보내기
export * from '../checklists'
export { default as checklists } from '../checklists'

// 업종 정보 (아이콘, 이름, 설명)
export const industryInfo = {
  // F&B (식음료)
  cafe: { id: 'cafe', name: '카페', icon: '☕', description: '카페/커피숍 인테리어' },
  restaurant: { id: 'restaurant', name: '음식점', icon: '🍽️', description: '일반 음식점 인테리어' },
  bar: { id: 'bar', name: '술집/바', icon: '🍺', description: '주점/바/펍 인테리어' },
  bakery: { id: 'bakery', name: '베이커리', icon: '🥐', description: '베이커리/빵집/디저트샵 인테리어' },
  franchise: { id: 'franchise', name: '식당체인/프랜차이즈', icon: '🍔', description: '프랜차이즈 식당 인테리어' },
  buffet: { id: 'buffet', name: '뷔페/연회장', icon: '🥂', description: '뷔페/연회장 인테리어' },

  // 서비스업
  beauty: { id: 'beauty', name: '미용실', icon: '💇', description: '미용실/헤어샵 인테리어' },
  nail: { id: 'nail', name: '네일샵', icon: '💅', description: '네일샵 인테리어' },
  spa: { id: 'spa', name: '스파/마사지', icon: '🧖', description: '스파/마사지샵 인테리어' },
  clinic: { id: 'clinic', name: '병원/의원', icon: '🏥', description: '병원/의원/클리닉 인테리어' },
  vet: { id: 'vet', name: '동물병원', icon: '🐾', description: '동물병원 인테리어' },
  pharmacy: { id: 'pharmacy', name: '약국', icon: '💊', description: '약국 인테리어' },
  fitness: { id: 'fitness', name: '헬스장/피트니스', icon: '💪', description: '헬스장/피트니스센터 인테리어' },
  pilates: { id: 'pilates', name: '필라테스', icon: '🧘‍♀️', description: '필라테스 스튜디오 인테리어' },
  yoga: { id: 'yoga', name: '요가', icon: '🧘', description: '요가 스튜디오 인테리어' },
  dance: { id: 'dance', name: '댄스/무용', icon: '💃', description: '댄스/무용 스튜디오 인테리어' },
  laundry: { id: 'laundry', name: '세탁소/클리닝', icon: '🧺', description: '세탁소/클리닝 인테리어' },
  flower: { id: 'flower', name: '꽃집/플라워샵', icon: '💐', description: '꽃집/플라워샵 인테리어' },

  // 상업/사무
  retail: { id: 'retail', name: '소매점', icon: '🛒', description: '소매점/매장 인테리어' },
  convstore: { id: 'convstore', name: '편의점', icon: '🏪', description: '편의점 인테리어' },
  office: { id: 'office', name: '사무실', icon: '🏢', description: '사무실/오피스 인테리어' },
  coworking: { id: 'coworking', name: '코워킹스페이스', icon: '💼', description: '코워킹스페이스 인테리어' },
  studio: { id: 'studio', name: '스튜디오', icon: '📸', description: '사진/영상 스튜디오 인테리어' },
  hotel: { id: 'hotel', name: '호텔/모텔', icon: '🏨', description: '호텔/모텔 인테리어' },
  pension: { id: 'pension', name: '펜션/게스트하우스', icon: '🏕️', description: '펜션/게스트하우스 인테리어' },

  // 여가/엔터테인먼트
  academy: { id: 'academy', name: '학원', icon: '📚', description: '학원/교습소 인테리어' },
  studycafe: { id: 'studycafe', name: '독서실/스터디카페', icon: '📖', description: '독서실/스터디카페 인테리어' },
  billiard: { id: 'billiard', name: '당구장/오락실', icon: '🎱', description: '당구장/오락실 인테리어' },
  karaoke: { id: 'karaoke', name: '노래방', icon: '🎤', description: '노래방 인테리어' },
  pcroom: { id: 'pcroom', name: 'PC방', icon: '🖥️', description: 'PC방 인테리어' },
  kidscafe: { id: 'kidscafe', name: '키즈카페', icon: '🧒', description: '키즈카페 인테리어' },
  wedding: { id: 'wedding', name: '웨딩홀', icon: '💒', description: '웨딩홀 인테리어' },

  // 주거
  apartment: { id: 'apartment', name: '아파트', icon: '🏠', description: '아파트 주거공간 인테리어' },
  villa: { id: 'villa', name: '빌라', icon: '🏡', description: '빌라/다세대주택 인테리어' },
  house: { id: 'house', name: '단독주택', icon: '🏘️', description: '단독주택 인테리어' },
  townhouse: { id: 'townhouse', name: '타운하우스', icon: '🏗️', description: '타운하우스 인테리어' },
  officetel: { id: 'officetel', name: '오피스텔', icon: '🏙️', description: '오피스텔 인테리어' },
  oneroom: { id: 'oneroom', name: '원룸/투룸', icon: '🚪', description: '원룸/투룸 인테리어' },

  // 교육/복지
  daycare: { id: 'daycare', name: '어린이집/유치원', icon: '👶', description: '어린이집/유치원 인테리어' },
  nursing: { id: 'nursing', name: '요양원/요양병원', icon: '🏥', description: '요양원/요양병원 인테리어' },
  welfare: { id: 'welfare', name: '복지관', icon: '🤝', description: '복지관 인테리어' },
  library: { id: 'library', name: '도서관', icon: '📕', description: '도서관 인테리어' },

  // 기타
  factory: { id: 'factory', name: '공장/제조시설', icon: '🏭', description: '공장/제조시설 인테리어' },
  warehouse: { id: 'warehouse', name: '창고/물류센터', icon: '📦', description: '창고/물류센터 인테리어' },
  gallery: { id: 'gallery', name: '전시장/갤러리', icon: '🖼️', description: '전시장/갤러리 인테리어' },
  religious: { id: 'religious', name: '종교시설', icon: '⛪', description: '종교시설(교회/사찰) 인테리어' },
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
  franchise: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  buffet: { Wf: 0.30, Wo: 0.35, Wc: 0.35 },

  // 서비스 업종
  beauty: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  nail: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  spa: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  clinic: { Wf: 0.30, Wo: 0.30, Wc: 0.40 },
  vet: { Wf: 0.30, Wo: 0.30, Wc: 0.40 },
  pharmacy: { Wf: 0.30, Wo: 0.30, Wc: 0.40 },
  fitness: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  pilates: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  yoga: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  dance: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  laundry: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  flower: { Wf: 0.45, Wo: 0.35, Wc: 0.20 },

  // 상업/사무 업종
  retail: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  convstore: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  office: { Wf: 0.38, Wo: 0.37, Wc: 0.25 },
  coworking: { Wf: 0.38, Wo: 0.37, Wc: 0.25 },
  studio: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  hotel: { Wf: 0.30, Wo: 0.35, Wc: 0.35 },
  pension: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },

  // 여가/엔터테인먼트
  academy: { Wf: 0.33, Wo: 0.32, Wc: 0.35 },
  studycafe: { Wf: 0.38, Wo: 0.35, Wc: 0.27 },
  billiard: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  karaoke: { Wf: 0.30, Wo: 0.30, Wc: 0.40 },
  pcroom: { Wf: 0.30, Wo: 0.30, Wc: 0.40 },
  kidscafe: { Wf: 0.30, Wo: 0.30, Wc: 0.40 },
  wedding: { Wf: 0.30, Wo: 0.35, Wc: 0.35 },

  // 주거 업종
  apartment: { Wf: 0.35, Wo: 0.40, Wc: 0.25 },
  villa: { Wf: 0.35, Wo: 0.40, Wc: 0.25 },
  house: { Wf: 0.35, Wo: 0.40, Wc: 0.25 },
  townhouse: { Wf: 0.35, Wo: 0.40, Wc: 0.25 },
  officetel: { Wf: 0.35, Wo: 0.40, Wc: 0.25 },
  oneroom: { Wf: 0.38, Wo: 0.40, Wc: 0.22 },

  // 교육/복지
  daycare: { Wf: 0.25, Wo: 0.30, Wc: 0.45 },
  nursing: { Wf: 0.25, Wo: 0.30, Wc: 0.45 },
  welfare: { Wf: 0.30, Wo: 0.30, Wc: 0.40 },
  library: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },

  // 기타
  factory: { Wf: 0.30, Wo: 0.30, Wc: 0.40 },
  warehouse: { Wf: 0.35, Wo: 0.35, Wc: 0.30 },
  gallery: { Wf: 0.40, Wo: 0.35, Wc: 0.25 },
  religious: { Wf: 0.30, Wo: 0.35, Wc: 0.35 },
} as const

export type IndustryType = keyof typeof industryRiskWeights

// 업종 선택 옵션 목록
export const industryOptions = Object.values(industryInfo)

// 업종 그룹
export const industryGroups = {
  fnb: ['cafe', 'restaurant', 'bar', 'bakery', 'franchise', 'buffet'],
  service: ['beauty', 'nail', 'spa', 'clinic', 'vet', 'pharmacy', 'fitness', 'pilates', 'yoga', 'dance', 'laundry', 'flower'],
  commercial: ['retail', 'convstore', 'office', 'coworking', 'studio', 'hotel', 'pension'],
  leisure: ['academy', 'studycafe', 'billiard', 'karaoke', 'pcroom', 'kidscafe', 'wedding'],
  residential: ['apartment', 'villa', 'house', 'townhouse', 'officetel', 'oneroom'],
  education: ['daycare', 'nursing', 'welfare', 'library'],
  etc: ['factory', 'warehouse', 'gallery', 'religious'],
} as const

export type IndustryGroup = keyof typeof industryGroups

// 업종 그룹 정보
export const industryGroupInfo = {
  fnb: { name: 'F&B (식음료)', description: '카페, 음식점, 바, 베이커리, 프랜차이즈, 뷔페' },
  service: { name: '서비스업', description: '미용실, 네일, 스파, 병원, 동물병원, 약국, 피트니스, 세탁소, 꽃집' },
  commercial: { name: '상업/숙박', description: '소매점, 편의점, 사무실, 코워킹, 스튜디오, 호텔, 펜션' },
  leisure: { name: '여가/엔터', description: '학원, 독서실, 당구장, 노래방, PC방, 키즈카페, 웨딩홀' },
  residential: { name: '주거', description: '아파트, 빌라, 단독주택, 타운하우스, 오피스텔, 원룸' },
  education: { name: '교육/복지', description: '어린이집, 요양원, 복지관, 도서관' },
  etc: { name: '기타', description: '공장, 창고, 전시장, 종교시설' },
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
