/**
 * 2026 건설 현장 체크리스트 (12개 법규 반영, 소규모 5~30인)
 * 총 60개 항목: 매일TBM 10 + 주간 10 + 월간 10 + 공종별 20 + 필수서류 10
 * + 2025-2026 법규 변경 4개 추가
 */

export type CheckCategory = 'daily' | 'weekly' | 'monthly' | 'trade' | 'document'
export type TradeType = 'electrical' | 'fire' | 'painting' | 'demolition'

export interface ChecklistItem2026 {
  id: string
  category: CheckCategory
  trade?: TradeType
  title: string
  law: string
  penalty: string
  checkMethod: string
  isNew2026?: boolean // 2025-2026 법규 변경 항목
}

export const CHECKLIST_ITEMS_2026: ChecklistItem2026[] = [
  // ──── 매일 TBM 10개 ────
  {
    id: 'daily-01',
    category: 'daily',
    title: '개인보호구 착용',
    law: '산안법 제6조',
    penalty: '5만원',
    checkMethod: '현장 출입 시 보호구 착용 여부 육안 확인',
  },
  {
    id: 'daily-02',
    category: 'daily',
    title: 'TBM 위험요인 전파',
    law: '산안법 제36조',
    penalty: '500만원',
    checkMethod: '작업 전 TBM 교육 실시 및 서명부 확인',
  },
  {
    id: 'daily-03',
    category: 'daily',
    title: '기계기구 점검',
    law: '산안법 제38조',
    penalty: '5천만원',
    checkMethod: '작업 전 기계기구 일상점검표 작성',
  },
  {
    id: 'daily-04',
    category: 'daily',
    title: '음주/컨디션 확인',
    law: '산안법 제129조',
    penalty: '1000만원',
    checkMethod: '작업 전 음주측정 및 컨디션 자기확인서',
  },
  {
    id: 'daily-05',
    category: 'daily',
    title: '추락방지시설 고정',
    law: '산안법 제38조',
    penalty: '5천만원',
    checkMethod: '안전난간, 안전망, 개구부 덮개 고정 상태 확인',
  },
  {
    id: 'daily-06',
    category: 'daily',
    title: '작업장 조도 확보',
    law: '산안법 제38조',
    penalty: '1500만원',
    checkMethod: '조도계 측정 또는 육안 확인 (75lux 이상)',
  },
  {
    id: 'daily-07',
    category: 'daily',
    title: '사다리 아웃트리거',
    law: '산안법 규칙 제67조',
    penalty: '500만원',
    checkMethod: '이동식 사다리 아웃트리거 펼침 상태 확인',
  },
  {
    id: 'daily-08',
    category: 'daily',
    title: '전선 누전 확인',
    law: '전기안전관리법 제12조',
    penalty: '300만원',
    checkMethod: '누전차단기 테스트 버튼 동작 확인',
  },
  {
    id: 'daily-09',
    category: 'daily',
    title: '소화기 배치 확인',
    law: '소방시설법 제12조',
    penalty: '300만원',
    checkMethod: '소화기 위치, 압력게이지, 유효기간 확인',
  },
  {
    id: 'daily-10',
    category: 'daily',
    title: '외국인 안전수칙 통역',
    law: '산안법 제29조',
    penalty: '500만원',
    checkMethod: '다국어 안전수칙 게시 및 통역 확인',
  },

  // ──── 주간 점검 10개 ────
  {
    id: 'weekly-01',
    category: 'weekly',
    title: '위험성평가 기록 공유',
    law: '산안법 제36조',
    penalty: '1000만원',
    checkMethod: '위험성평가표 작성 및 근로자 공유 확인',
  },
  {
    id: 'weekly-02',
    category: 'weekly',
    title: '비계 발판 고정',
    law: '산안법 규칙 제54조',
    penalty: '5천만원',
    checkMethod: '비계 발판 틈새, 고정클램프, 안전난간 상태 점검',
  },
  {
    id: 'weekly-03',
    category: 'weekly',
    title: '위험장소 표지판',
    law: '산안법 제13조',
    penalty: '500만원',
    checkMethod: '위험장소 안전표지 설치 및 훼손 여부 확인',
  },
  {
    id: 'weekly-04',
    category: 'weekly',
    title: '폐기물 분리보관 올바로시스템',
    law: '폐기물관리법 제13조',
    penalty: '1000만원',
    checkMethod: '폐기물 분리보관 및 올바로시스템 등록 확인',
  },
  {
    id: 'weekly-05',
    category: 'weekly',
    title: '분전함 잠금 관리',
    law: '전기안전관리법 제15조',
    penalty: '200만원',
    checkMethod: '분전함 잠금장치, 경고표시, 접근통제 확인',
  },
  {
    id: 'weekly-06',
    category: 'weekly',
    title: '중량물 작업계획서',
    law: '산안법 규칙 제38조',
    penalty: '500만원',
    checkMethod: '중량물 운반 작업계획서 작성 및 비치 확인',
  },
  {
    id: 'weekly-07',
    category: 'weekly',
    title: '신규/고령 근로자 안전지도',
    law: '산안법 제29조',
    penalty: '500만원',
    checkMethod: '신규·고령 근로자 안전교육 이수 기록 확인',
  },
  {
    id: 'weekly-08',
    category: 'weekly',
    title: '스마트안전장비 가동',
    law: '건진법 제62조',
    penalty: '지원금회수',
    checkMethod: 'IoT 센서, CCTV, 가스감지기 정상가동 확인',
  },
  {
    id: 'weekly-09',
    category: 'weekly',
    title: '현장 정리정돈 통로확보',
    law: '산안법 제38조',
    penalty: '1500만원',
    checkMethod: '작업통로 확보, 자재정리, 잔재물 제거 확인',
  },
  {
    id: 'weekly-10',
    category: 'weekly',
    title: '휴게시설 설치기준',
    law: '산안법 제128조의2',
    penalty: '1500만원',
    checkMethod: '휴게시설 위치, 냉난방, 음수시설 기준 충족 확인',
  },

  // ──── 월간 점검 10개 ────
  {
    id: 'monthly-01',
    category: 'monthly',
    title: '안전보건예산 집행',
    law: '중처법 시행령 제4조',
    penalty: '1년이상 징역',
    checkMethod: '안전보건 예산 편성 및 월간 집행 내역 확인',
  },
  {
    id: 'monthly-02',
    category: 'monthly',
    title: '산안비 사용내역 정산',
    law: '산안법 제72조',
    penalty: '사용액 10배',
    checkMethod: '산업안전보건관리비 사용명세서 정산 확인',
  },
  {
    id: 'monthly-03',
    category: 'monthly',
    title: '근로자 의견 청취 조치',
    law: '중처법 시행령 제4조',
    penalty: '경영자 처벌근거',
    checkMethod: '근로자 의견 청취 기록부 작성 및 개선 조치 확인',
  },
  {
    id: 'monthly-04',
    category: 'monthly',
    title: '비상대응 매뉴얼 훈련',
    law: '중처법 시행령 제4조',
    penalty: '징벌적 손해배상',
    checkMethod: '비상대응 훈련 실시 기록 및 개선사항 확인',
  },
  {
    id: 'monthly-05',
    category: 'monthly',
    title: '협력업체 안전보건 평가',
    law: '중처법 제5조',
    penalty: '도급인 책임',
    checkMethod: '협력업체 안전보건 수준 평가표 작성 확인',
  },
  {
    id: 'monthly-06',
    category: 'monthly',
    title: '현장소장 권한 부여',
    law: '중처법 시행령 제4조',
    penalty: '체계미비',
    checkMethod: '현장소장 안전보건 권한 위임장 확인',
  },
  {
    id: 'monthly-07',
    category: 'monthly',
    title: '특수건강진단 관리',
    law: '산안법 제130조',
    penalty: '1000만원',
    checkMethod: '유해인자 노출 근로자 건강진단 이수 확인',
  },
  {
    id: 'monthly-08',
    category: 'monthly',
    title: '노후장비 안전점검',
    law: '건진법 제60조',
    penalty: '500만원',
    checkMethod: '사용연한 초과 장비 안전성 점검 기록 확인',
  },
  {
    id: 'monthly-09',
    category: 'monthly',
    title: '법령요지 안전수칙 게시',
    law: '산안법 제34조',
    penalty: '500만원',
    checkMethod: '현장 내 법령요지, 안전수칙 게시 상태 확인',
  },
  {
    id: 'monthly-10',
    category: 'monthly',
    title: '재발방지대책 수립',
    law: '중처법 시행령 제4조',
    penalty: '가중처벌',
    checkMethod: '사고/아차사고 재발방지대책 수립 및 이행 확인',
  },

  // ──── 공종별: 전기 5개 ────
  {
    id: 'trade-elec-01',
    category: 'trade',
    trade: 'electrical',
    title: '접지 확인',
    law: '전기안전관리법 제12조',
    penalty: '300만원',
    checkMethod: '접지저항 측정 (100Ω 이하) 확인',
  },
  {
    id: 'trade-elec-02',
    category: 'trade',
    trade: 'electrical',
    title: '이중절연',
    law: '전기안전관리법 제12조',
    penalty: '300만원',
    checkMethod: '이중절연 공구 사용 여부 확인',
  },
  {
    id: 'trade-elec-03',
    category: 'trade',
    trade: 'electrical',
    title: '충전부 방지',
    law: '산안법 규칙 제301조',
    penalty: '500만원',
    checkMethod: '충전부 절연커버, 방호울타리 설치 확인',
  },
  {
    id: 'trade-elec-04',
    category: 'trade',
    trade: 'electrical',
    title: '전기 점검표',
    law: '전기안전관리법 제22조',
    penalty: '500만원',
    checkMethod: '일일 전기안전 점검표 작성 및 보관 확인',
  },
  {
    id: 'trade-elec-05',
    category: 'trade',
    trade: 'electrical',
    title: '활선 작업 금지',
    law: '산안법 규칙 제319조',
    penalty: '5천만원',
    checkMethod: '전원 차단 후 작업 및 잠금/표지 확인',
  },

  // ──── 공종별: 소방 5개 ────
  {
    id: 'trade-fire-01',
    category: 'trade',
    trade: 'fire',
    title: '지하주차장 감지기',
    law: '소방시설법 제12조',
    penalty: '300만원',
    checkMethod: '지하주차장 화재감지기 설치 및 동작 확인',
    isNew2026: true,
  },
  {
    id: 'trade-fire-02',
    category: 'trade',
    trade: 'fire',
    title: '임시소방함 5m 배치',
    law: '소방시설법 제12조',
    penalty: '300만원',
    checkMethod: '임시소방시설 5m 이내 배치 확인',
  },
  {
    id: 'trade-fire-03',
    category: 'trade',
    trade: 'fire',
    title: '방염자재 사용',
    law: '소방시설법 제20조',
    penalty: '500만원',
    checkMethod: '방염성능 인증자재 사용 확인',
  },
  {
    id: 'trade-fire-04',
    category: 'trade',
    trade: 'fire',
    title: '유도등 설치',
    law: '소방시설법 제9조',
    penalty: '300만원',
    checkMethod: '피난유도등 설치 위치 및 점등 상태 확인',
  },
  {
    id: 'trade-fire-05',
    category: 'trade',
    trade: 'fire',
    title: '화재감시자 배치',
    law: '산안법 규칙 제241조',
    penalty: '500만원',
    checkMethod: '화기 사용 시 화재감시자 배치 확인',
  },

  // ──── 공종별: 도장방수 5개 ────
  {
    id: 'trade-paint-01',
    category: 'trade',
    trade: 'painting',
    title: '국소배기 장치',
    law: '산안법 제38조',
    penalty: '1500만원',
    checkMethod: '도장 작업 시 국소배기장치 가동 확인',
  },
  {
    id: 'trade-paint-02',
    category: 'trade',
    trade: 'painting',
    title: 'MSDS 게시',
    law: '산안법 제114조',
    penalty: '500만원',
    checkMethod: '유해화학물질 MSDS 현장 게시 확인',
  },
  {
    id: 'trade-paint-03',
    category: 'trade',
    trade: 'painting',
    title: '밀폐공간 측정',
    law: '산안법 규칙 제619조',
    penalty: '5천만원',
    checkMethod: '밀폐공간 산소·유해가스 농도 측정 확인',
  },
  {
    id: 'trade-paint-04',
    category: 'trade',
    trade: 'painting',
    title: '보호복 착용',
    law: '산안법 제6조',
    penalty: '5만원',
    checkMethod: '방독마스크, 방호복, 보안경 착용 확인',
  },
  {
    id: 'trade-paint-05',
    category: 'trade',
    trade: 'painting',
    title: '유해폐기물 처리',
    law: '폐기물관리법 제13조',
    penalty: '1000만원',
    checkMethod: '유해폐기물 별도 보관 및 처리업체 위탁 확인',
  },

  // ──── 공종별: 철거석면 5개 ────
  {
    id: 'trade-demo-01',
    category: 'trade',
    trade: 'demolition',
    title: '석면조사 보고서',
    law: '산안법 제119조',
    penalty: '3000만원',
    checkMethod: '석면조사기관 보고서 비치 및 결과 확인',
  },
  {
    id: 'trade-demo-02',
    category: 'trade',
    trade: 'demolition',
    title: '가림막 설치',
    law: '석면안전관리법 제28조',
    penalty: '1000만원',
    checkMethod: '석면 해체 구역 밀폐가림막 설치 확인',
  },
  {
    id: 'trade-demo-03',
    category: 'trade',
    trade: 'demolition',
    title: '석면농도 측정',
    law: '석면안전관리법 제30조',
    penalty: '1000만원',
    checkMethod: '석면해체 작업 중 공기질 실시간 측정 확인',
    isNew2026: true,
  },
  {
    id: 'trade-demo-04',
    category: 'trade',
    trade: 'demolition',
    title: '위해성 평가',
    law: '산안법 제36조',
    penalty: '1000만원',
    checkMethod: '철거·석면 작업 위해성평가 실시 및 기록 확인',
  },
  {
    id: 'trade-demo-05',
    category: 'trade',
    trade: 'demolition',
    title: '살수장비 가동',
    law: '석면안전관리법 제28조',
    penalty: '500만원',
    checkMethod: '분진 억제용 살수장비 가동 상태 확인',
  },

  // ──── 중대재해처벌법 필수서류 10개 ────
  {
    id: 'doc-01',
    category: 'document',
    title: '안전보건 경영방침 (사업주 서명)',
    law: '중처법 시행령 제4조',
    penalty: '1년이상 징역',
    checkMethod: '사업주 서명 경영방침 문서 비치 확인',
  },
  {
    id: 'doc-02',
    category: 'document',
    title: '안전보건 조직도 + 비상연락망',
    law: '중처법 시행령 제4조',
    penalty: '1년이상 징역',
    checkMethod: '조직도, 비상연락망 현장 게시 확인',
  },
  {
    id: 'doc-03',
    category: 'document',
    title: '위험성평가 결과표',
    law: '산안법 제36조',
    penalty: '1000만원',
    checkMethod: '위험성평가 결과표 작성 및 근로자 공유 확인',
  },
  {
    id: 'doc-04',
    category: 'document',
    title: '안전보건 예산 편성/집행 내역',
    law: '중처법 시행령 제4조',
    penalty: '1년이상 징역',
    checkMethod: '연간 예산 편성 및 월별 집행 내역 확인',
  },
  {
    id: 'doc-05',
    category: 'document',
    title: '종사자 의견 청취 기록',
    law: '중처법 시행령 제4조',
    penalty: '경영자 처벌근거',
    checkMethod: '의견 청취 기록부 작성 및 개선 조치 확인',
  },
  {
    id: 'doc-06',
    category: 'document',
    title: '비상대응 매뉴얼',
    law: '중처법 시행령 제4조',
    penalty: '징벌적 손해배상',
    checkMethod: '비상대응 매뉴얼 현장 비치 및 훈련 기록 확인',
  },
  {
    id: 'doc-07',
    category: 'document',
    title: '도급/위탁 안전보건 평가서',
    law: '중처법 제5조',
    penalty: '도급인 책임',
    checkMethod: '협력업체 안전보건 평가서 작성 및 보관 확인',
  },
  {
    id: 'doc-08',
    category: 'document',
    title: '안전보건 교육 이수 대장',
    law: '산안법 제29조',
    penalty: '500만원',
    checkMethod: '근로자별 안전보건 교육 이수 기록 확인',
  },
  {
    id: 'doc-09',
    category: 'document',
    title: '법령 준수 점검 결과 (반기1회)',
    law: '중처법 시행령 제4조',
    penalty: '경영자 처벌근거',
    checkMethod: '반기별 법령 준수 자체점검 결과보고서 확인',
  },
  {
    id: 'doc-10',
    category: 'document',
    title: '재해 재발방지 이행보고서',
    law: '중처법 시행령 제4조',
    penalty: '가중처벌',
    checkMethod: '재해 발생 시 재발방지대책 이행보고서 확인',
  },
]

// ──── 2025-2026 법규 변경 추가 항목 ────
export const LAW_UPDATES_2026: ChecklistItem2026[] = [
  {
    id: 'law-update-01',
    category: 'monthly',
    title: '안전관리비 4.5% 상향 반영',
    law: '산안법 제72조 (2026.01 시행)',
    penalty: '사용액 10배',
    checkMethod: '안전관리비 4.5% 이상 계상 및 집행 확인',
    isNew2026: true,
  },
  {
    id: 'law-update-02',
    category: 'document',
    title: '소규모 안전관리계획서 (2층이상 10층미만)',
    law: '건진법 제62조 (2026.01 시행)',
    penalty: '500만원',
    checkMethod: '소규모 현장 안전관리계획서 작성 및 제출 확인',
    isNew2026: true,
  },
  {
    id: 'law-update-03',
    category: 'trade',
    trade: 'fire',
    title: '지하주차장 소방동의 확대',
    law: '소방시설법 제7조 (2026.03 시행)',
    penalty: '500만원',
    checkMethod: '지하주차장 소방동의 사전 취득 확인',
    isNew2026: true,
  },
  {
    id: 'law-update-04',
    category: 'trade',
    trade: 'demolition',
    title: '석면해체 공기질 측정 강화',
    law: '석면안전관리법 제30조 (2025 개정)',
    penalty: '1000만원',
    checkMethod: '석면해체 시 실시간 공기질 모니터링 확인',
    isNew2026: true,
  },
]

// 전체 항목 (60 + 4 = 64개)
export const ALL_CHECKLIST_ITEMS_2026 = [...CHECKLIST_ITEMS_2026, ...LAW_UPDATES_2026]

// 카테고리별 필터 헬퍼
export const getItemsByCategory = (category: CheckCategory) =>
  ALL_CHECKLIST_ITEMS_2026.filter(item => item.category === category)

export const getItemsByTrade = (trade: TradeType) =>
  ALL_CHECKLIST_ITEMS_2026.filter(item => item.trade === trade)

export const getNewLawItems = () =>
  ALL_CHECKLIST_ITEMS_2026.filter(item => item.isNew2026)

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  daily: '매일 TBM',
  weekly: '주간 점검',
  monthly: '월간 점검',
  trade: '공종별 점검',
  document: '필수서류',
}

export const TRADE_LABELS: Record<TradeType, string> = {
  electrical: '전기',
  fire: '소방',
  painting: '도장방수',
  demolition: '철거석면',
}
