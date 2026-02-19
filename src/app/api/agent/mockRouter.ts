/**
 * Mock Router: API 키 없을 때 키워드 기반 도구 선택
 * 프로젝트 없이도 일반 인테리어 질문에 답변 가능
 */

import type { ProjectContext } from './context'
import { industryInfo } from '@/data/industries'
import { checklistMap } from '@/data/checklists'
import { formatKRW } from '@/lib/utils/costCalculator'
import { CHEKI_SYSTEM_PROMPT } from '@/lib/ai/gemini-provider'
import {
  projectSetup,
  checklistAnalyze,
  quoteGenerate,
  costAnalyze,
  riskCalculate,
  changeRecord,
  evidencePackage,
  agreementCreate,
  reportGenerate,
  scheduleCheck,
  verifyScore,
  getProjectSummary,
  type ToolResult,
} from './tools'

interface RouteMatch {
  tool: string
  handler: () => Promise<ToolResult>
  keywords: string[]
}

function extractIndustry(message: string): string {
  const map: Record<string, string> = {
    // F&B (17)
    '카페': 'cafe', '커피': 'cafe', '커피숍': 'cafe',
    '음식점': 'restaurant', '식당': 'restaurant', '레스토랑': 'restaurant',
    '술집': 'bar', '펍': 'bar', '바': 'bar',
    '베이커리': 'bakery', '빵집': 'bakery', '제과점': 'bakery',
    '프랜차이즈': 'franchise', '체인점': 'franchise',
    '뷔페': 'buffet', '연회장': 'buffet',
    '패스트푸드': 'fast_food', '햄버거': 'fast_food',
    '디저트': 'dessert', '디저트카페': 'dessert',
    '브런치': 'brunch', '브런치카페': 'brunch',
    '호프': 'pub', '이자카야': 'izakaya',
    '치킨': 'chicken', '치킨집': 'chicken',
    '고깃집': 'korean_bbq', '삼겹살': 'korean_bbq', '고기집': 'korean_bbq', '소고기': 'korean_bbq',
    '중식당': 'chinese', '중국집': 'chinese', '중화': 'chinese',
    '일식': 'japanese', '일식당': 'japanese', '스시': 'japanese', '초밥': 'japanese',
    '양식': 'western', '양식당': 'western', '파스타': 'western',
    '분식': 'snack_bar', '분식점': 'snack_bar', '떡볶이': 'snack_bar',
    '푸드코트': 'food_court',
    // 미용/의료 (6)
    '미용실': 'beauty', '헤어샵': 'beauty', '헤어': 'beauty', '미장원': 'beauty',
    '네일샵': 'nail', '네일': 'nail',
    '스파': 'spa', '마사지': 'spa',
    '병원': 'clinic', '의원': 'clinic', '클리닉': 'clinic',
    '치과': 'dental',
    '약국': 'pharmacy',
    // 피트니스 (4)
    '헬스': 'fitness', '피트니스': 'fitness', '짐': 'fitness', '헬스장': 'fitness', '헬스클럽': 'fitness',
    '필라테스': 'pilates',
    '요가': 'yoga', '요가원': 'yoga',
    '댄스': 'dance', '댄스학원': 'dance', '무용': 'dance',
    // 교육 (5)
    '학원': 'academy',
    '독서실': 'study_cafe', '스터디카페': 'study_cafe', '스터디': 'study_cafe',
    '키즈카페': 'kids_cafe', '키즈': 'kids_cafe',
    '유치원': 'kindergarten',
    '음악학원': 'music_academy', '피아노학원': 'music_academy',
    // 판매/서비스 (6)
    '소매점': 'retail', '매장': 'retail', '샵': 'retail',
    '편의점': 'convenience',
    '세탁소': 'laundry', '클리닝': 'laundry',
    '반려동물': 'pet_shop', '애견': 'pet_shop', '펫샵': 'pet_shop',
    '꽃집': 'flower', '플라워': 'flower',
    '휴대폰': 'phone_shop', '폰매장': 'phone_shop',
    // 사무/업무 (4)
    '사무실': 'office', '오피스': 'office',
    '코워킹': 'coworking', '공유오피스': 'coworking',
    '쇼룸': 'showroom',
    '창고': 'warehouse', '물류': 'warehouse',
    // 주거 (3)
    '아파트': 'apartment',
    '빌라': 'villa',
    '단독주택': 'house', '주택': 'house',
    // 숙박 (1)
    '호텔': 'hotel', '모텔': 'hotel', '숙박': 'hotel', '펜션': 'hotel', '게스트하우스': 'hotel',
    // 기타 호환
    '동물병원': 'clinic', '수의사': 'clinic',
    '요양원': 'clinic', '요양병원': 'clinic',
    '복지관': 'clinic',
    '도서관': 'academy',
    '당구장': 'retail', '오락실': 'retail',
    '노래방': 'retail', 'PC방': 'retail', '피씨방': 'retail',
    '웨딩홀': 'hotel', '예식장': 'hotel',
    '공장': 'warehouse',
    '전시장': 'showroom',
    '교회': 'retail', '사찰': 'retail',
  }
  for (const [keyword, id] of Object.entries(map)) {
    if (message.includes(keyword)) return id
  }
  return ''
}

function extractArea(message: string): number {
  const match = message.match(/(\d+)\s*평/)
  return match ? parseInt(match[1]) : 20
}

function extractBudget(message: string): number | undefined {
  const match = message.match(/(\d+)\s*(만원|억)/)
  if (!match) return undefined
  const num = parseInt(match[1])
  return match[2] === '억' ? num * 100000000 : num * 10000
}

// ═══════════════════════════════════════════════
// 업종별 평당 단가 기준 (프로젝트 없이도 가견적 제공)
// ═══════════════════════════════════════════════
const industryUnitCosts: Record<string, { min: number; max: number; avg: number; items: Array<{ name: string; ratio: number }> }> = {
  cafe: { min: 250, max: 450, avg: 350, items: [
    { name: '철거 공사', ratio: 0.08 }, { name: '바닥 타일', ratio: 0.12 }, { name: '벽체 도장', ratio: 0.08 },
    { name: '천장 공사', ratio: 0.10 }, { name: '전기/조명', ratio: 0.15 }, { name: '설비(급배수)', ratio: 0.10 },
    { name: '에어컨', ratio: 0.12 }, { name: '카운터/가구', ratio: 0.12 }, { name: '간판', ratio: 0.08 }, { name: '기타(소방/준공)', ratio: 0.05 },
  ]},
  restaurant: { min: 300, max: 550, avg: 420, items: [
    { name: '철거 공사', ratio: 0.08 }, { name: '바닥(논슬립)', ratio: 0.10 }, { name: '벽체', ratio: 0.08 },
    { name: '천장 공사', ratio: 0.08 }, { name: '전기/조명', ratio: 0.12 }, { name: '주방설비(후드/배기)', ratio: 0.18 },
    { name: '급배수/가스', ratio: 0.12 }, { name: '에어컨', ratio: 0.10 }, { name: '가구/테이블', ratio: 0.08 }, { name: '간판/기타', ratio: 0.06 },
  ]},
  bar: { min: 350, max: 600, avg: 470, items: [
    { name: '철거 공사', ratio: 0.07 }, { name: '바닥', ratio: 0.10 }, { name: '벽체(방음 포함)', ratio: 0.12 },
    { name: '천장(간접조명)', ratio: 0.12 }, { name: '전기/특수조명', ratio: 0.15 }, { name: '설비(급배수)', ratio: 0.10 },
    { name: '에어컨/환기', ratio: 0.12 }, { name: '바 카운터/가구', ratio: 0.12 }, { name: '음향설비', ratio: 0.05 }, { name: '간판/기타', ratio: 0.05 },
  ]},
  beauty: { min: 280, max: 480, avg: 380, items: [
    { name: '철거 공사', ratio: 0.07 }, { name: '바닥', ratio: 0.10 }, { name: '벽체/거울', ratio: 0.12 },
    { name: '천장 공사', ratio: 0.10 }, { name: '전기/조명(연색성)', ratio: 0.15 }, { name: '급배수(샴푸대)', ratio: 0.12 },
    { name: '에어컨/환기', ratio: 0.10 }, { name: '시술대/가구', ratio: 0.12 }, { name: '간판', ratio: 0.07 }, { name: '기타', ratio: 0.05 },
  ]},
  clinic: { min: 400, max: 700, avg: 550, items: [
    { name: '철거 공사', ratio: 0.06 }, { name: '바닥(항균)', ratio: 0.10 }, { name: '벽체(방사선차폐 등)', ratio: 0.12 },
    { name: '천장(클린룸)', ratio: 0.10 }, { name: '전기/의료전원', ratio: 0.14 }, { name: '급배수/의료가스', ratio: 0.12 },
    { name: '에어컨/공조', ratio: 0.12 }, { name: '진료실 가구', ratio: 0.10 }, { name: '소방/법규', ratio: 0.08 }, { name: '간판/기타', ratio: 0.06 },
  ]},
  apartment: { min: 200, max: 400, avg: 300, items: [
    { name: '철거 공사', ratio: 0.10 }, { name: '바닥(마루/타일)', ratio: 0.15 }, { name: '도배', ratio: 0.10 },
    { name: '천장/몰딩', ratio: 0.08 }, { name: '전기/조명', ratio: 0.12 }, { name: '설비(욕실/주방)', ratio: 0.15 },
    { name: '주방가구', ratio: 0.12 }, { name: '붙박이/수납', ratio: 0.08 }, { name: '도장', ratio: 0.05 }, { name: '기타(보양/폐기물)', ratio: 0.05 },
  ]},
  office: { min: 200, max: 380, avg: 280, items: [
    { name: '철거 공사', ratio: 0.08 }, { name: '바닥(타일카펫)', ratio: 0.12 }, { name: '벽체(파티션)', ratio: 0.15 },
    { name: '천장(텍스)', ratio: 0.10 }, { name: '전기/통신/LAN', ratio: 0.18 }, { name: '에어컨', ratio: 0.12 },
    { name: '조명(LED)', ratio: 0.10 }, { name: '가구', ratio: 0.08 }, { name: '소방', ratio: 0.04 }, { name: '기타', ratio: 0.03 },
  ]},
  fitness: { min: 280, max: 500, avg: 380, items: [
    { name: '철거 공사', ratio: 0.07 }, { name: '바닥(충격흡수)', ratio: 0.15 }, { name: '벽체/거울', ratio: 0.12 },
    { name: '천장 공사', ratio: 0.08 }, { name: '전기/조명', ratio: 0.12 }, { name: '급배수(샤워/화장실)', ratio: 0.12 },
    { name: '에어컨/환기', ratio: 0.12 }, { name: '운동기구/가구', ratio: 0.10 }, { name: '방음', ratio: 0.07 }, { name: '간판/기타', ratio: 0.05 },
  ]},
  pilates: { min: 300, max: 520, avg: 400, items: [
    { name: '철거 공사', ratio: 0.07 }, { name: '바닥(충격흡수매트)', ratio: 0.15 }, { name: '벽체/전면거울', ratio: 0.13 },
    { name: '천장 공사', ratio: 0.08 }, { name: '전기/조명', ratio: 0.12 }, { name: '급배수(샤워/화장실)', ratio: 0.10 },
    { name: '에어컨/환기', ratio: 0.12 }, { name: '기구보관/로비가구', ratio: 0.10 }, { name: '방음/방진', ratio: 0.08 }, { name: '간판/기타', ratio: 0.05 },
  ]},
  yoga: { min: 280, max: 480, avg: 370, items: [
    { name: '철거 공사', ratio: 0.07 }, { name: '바닥(원목/매트)', ratio: 0.15 }, { name: '벽체/거울', ratio: 0.12 },
    { name: '천장(간접조명)', ratio: 0.10 }, { name: '전기/조명', ratio: 0.12 }, { name: '급배수(샤워)', ratio: 0.10 },
    { name: '에어컨/환기', ratio: 0.12 }, { name: '소품수납/가구', ratio: 0.08 }, { name: '방음', ratio: 0.08 }, { name: '간판/기타', ratio: 0.06 },
  ]},
  dance: { min: 300, max: 500, avg: 390, items: [
    { name: '철거 공사', ratio: 0.07 }, { name: '바닥(스프링플로어)', ratio: 0.18 }, { name: '벽체/전면거울', ratio: 0.13 },
    { name: '천장 공사', ratio: 0.08 }, { name: '전기/조명', ratio: 0.12 }, { name: '급배수(샤워)', ratio: 0.08 },
    { name: '에어컨/환기', ratio: 0.10 }, { name: '음향설비', ratio: 0.08 }, { name: '방음/방진', ratio: 0.10 }, { name: '간판/기타', ratio: 0.06 },
  ]},
  bakery: { min: 300, max: 550, avg: 430, items: [
    { name: '철거 공사', ratio: 0.07 }, { name: '바닥 타일', ratio: 0.10 }, { name: '벽체', ratio: 0.08 },
    { name: '천장 공사', ratio: 0.08 }, { name: '전기/조명', ratio: 0.12 }, { name: '급배수/가스', ratio: 0.10 },
    { name: '베이킹 설비', ratio: 0.18 }, { name: '쇼케이스/가구', ratio: 0.12 }, { name: '에어컨/환기', ratio: 0.10 }, { name: '간판/기타', ratio: 0.05 },
  ]},
  nail: { min: 250, max: 400, avg: 320, items: [
    { name: '철거 공사', ratio: 0.07 }, { name: '바닥', ratio: 0.10 }, { name: '벽체/인테리어', ratio: 0.12 },
    { name: '천장 공사', ratio: 0.10 }, { name: '전기/조명(연색성)', ratio: 0.15 }, { name: '급배수', ratio: 0.08 },
    { name: '에어컨/환기(분진)', ratio: 0.12 }, { name: '시술대/가구', ratio: 0.15 }, { name: '간판', ratio: 0.06 }, { name: '기타', ratio: 0.05 },
  ]},
  hotel: { min: 500, max: 900, avg: 700, items: [
    { name: '철거 공사', ratio: 0.06 }, { name: '바닥', ratio: 0.10 }, { name: '벽체', ratio: 0.10 },
    { name: '천장(방별)', ratio: 0.08 }, { name: '전기/조명', ratio: 0.12 }, { name: '급배수(객실별)', ratio: 0.14 },
    { name: '에어컨(개별)', ratio: 0.12 }, { name: '가구/침대', ratio: 0.12 }, { name: '소방/법규', ratio: 0.08 }, { name: '엘리베이터/기타', ratio: 0.08 },
  ]},
}

// 기본 단가 (매핑 없는 업종용)
const defaultUnitCost = { min: 250, max: 450, avg: 350, items: [
  { name: '철거 공사', ratio: 0.08 }, { name: '바닥 공사', ratio: 0.12 }, { name: '벽체 공사', ratio: 0.10 },
  { name: '천장 공사', ratio: 0.10 }, { name: '전기/조명', ratio: 0.15 }, { name: '설비(급배수)', ratio: 0.12 },
  { name: '에어컨/냉난방', ratio: 0.12 }, { name: '가구/집기', ratio: 0.10 }, { name: '간판/외부', ratio: 0.06 }, { name: '기타(소방/준공)', ratio: 0.05 },
]}

/** 프로젝트 없이 가견적 생성 */
function generateEstimate(industry: string, area: number): ToolResult {
  const info = industryInfo[industry as keyof typeof industryInfo]
  const costs = industryUnitCosts[industry] || defaultUnitCost
  const totalMin = costs.min * area * 10000
  const totalMax = costs.max * area * 10000
  const totalAvg = costs.avg * area * 10000

  const breakdown = costs.items.map(item => ({
    name: item.name,
    amount: Math.round(totalAvg * item.ratio),
  }))

  return {
    tool: 'estimate',
    success: true,
    message: `📊 ${info?.icon || '🏗️'} ${info?.name || industry} ${area}평 가견적\n\n` +
      `💰 예상 비용 범위\n` +
      `  최소: ${formatKRW(totalMin)}\n` +
      `  평균: ${formatKRW(totalAvg)}\n` +
      `  최대: ${formatKRW(totalMax)}\n` +
      `  (평당 ${formatKRW(costs.min * 10000)} ~ ${formatKRW(costs.max * 10000)})\n\n` +
      `📋 공종별 예상 (평균 기준)\n` +
      breakdown.map(b => `  • ${b.name}: ${formatKRW(b.amount)}`).join('\n') +
      `\n\n⚠️ 이 금액은 AI 추정 가견적입니다. 현장 조건(층수, 엘리베이터, 기존 상태 등)에 따라 달라질 수 있습니다.\n\n` +
      `💡 정확한 견적을 원하시면 프로젝트를 생성해주세요.\n` +
      `  → "${info?.name || industry} ${area}평 프로젝트 만들어줘"`,
    data: { industry, area, min: totalMin, avg: totalAvg, max: totalMax, breakdown },
  }
}

/** 프로젝트 없이 업종별 체크리스트 안내 */
function generateChecklistInfo(industry: string): ToolResult {
  const info = industryInfo[industry as keyof typeof industryInfo]
  const checklist = checklistMap[industry]

  if (!checklist) {
    return {
      tool: 'checklist_info',
      success: true,
      message: `📋 ${info?.icon || '🏗️'} ${info?.name || industry} 체크리스트\n\n` +
        `해당 업종의 체크리스트가 준비되어 있습니다.\n프로젝트를 생성하면 자동으로 적용됩니다.`,
    }
  }

  // 카테고리별 집계
  const categories: Record<string, number> = {}
  let requiredCount = 0
  checklist.items.forEach((item: any) => {
    categories[item.category] = (categories[item.category] || 0) + 1
    if (item.priority === '필수') requiredCount++
  })

  return {
    tool: 'checklist_info',
    success: true,
    message: `📋 ${info?.icon || '🏗️'} ${info?.name || industry} 체크리스트 안내\n\n` +
      `총 ${checklist.items.length}개 점검 항목 (필수 ${requiredCount}개)\n\n` +
      `카테고리별 항목 수:\n` +
      Object.entries(categories).map(([cat, count]) => `  • ${cat}: ${count}개`).join('\n') +
      `\n\n주요 필수 점검 항목:\n` +
      checklist.items
        .filter((item: any) => item.priority === '필수')
        .slice(0, 5)
        .map((item: any) => `  ✅ ${item.item}`)
        .join('\n') +
      `\n  ... 외 ${Math.max(0, requiredCount - 5)}개\n\n` +
      `💡 프로젝트를 생성하면 전체 체크리스트가 자동 적용됩니다.`,
    data: { industry, totalItems: checklist.items.length, requiredCount, categories },
  }
}

/** 프로젝트 없이 일반 인테리어 질문 답변 */
function answerGeneralQuestion(message: string, industry: string, area: number): ToolResult {
  const info = industryInfo[industry as keyof typeof industryInfo]
  const costs = industryUnitCosts[industry] || defaultUnitCost
  const msg = message.toLowerCase()

  // 비용/시세/적정가 질문
  if (matchKeywords(msg, ['얼마', '비용', '시세', '적정가', '가격', '단가', '평당'])) {
    return {
      tool: 'general_answer',
      success: true,
      message: `${info?.icon || '🏗️'} ${info?.name || '인테리어'} ${area}평 비용 안내\n\n` +
        `📊 평당 시세 (2026년 기준)\n` +
        `  최소: 평당 ${formatKRW(costs.min * 10000)}\n` +
        `  평균: 평당 ${formatKRW(costs.avg * 10000)}\n` +
        `  최대: 평당 ${formatKRW(costs.max * 10000)}\n\n` +
        `💰 ${area}평 기준 총 예상 비용\n` +
        `  ${formatKRW(costs.min * area * 10000)} ~ ${formatKRW(costs.max * area * 10000)}\n\n` +
        `⚠️ 현장 상태, 자재 등급, 디자인 복잡도에 따라 달라집니다.\n\n` +
        `더 자세한 공종별 견적을 원하시면:\n` +
        `  → "${info?.name || '업종'} ${area}평 견적 알려줘"`,
    }
  }

  // 기간/공사기간 질문
  if (matchKeywords(msg, ['기간', '며칠', '얼마나 걸', '공사기간', '소요'])) {
    const daysMap: Record<string, { min: number; max: number }> = {
      cafe: { min: 25, max: 40 }, restaurant: { min: 30, max: 50 }, bar: { min: 25, max: 45 },
      beauty: { min: 20, max: 35 }, clinic: { min: 35, max: 60 }, apartment: { min: 30, max: 60 },
      office: { min: 20, max: 40 },
    }
    const days = daysMap[industry] || { min: 25, max: 45 }
    return {
      tool: 'general_answer',
      success: true,
      message: `${info?.icon || '🏗️'} ${info?.name || '인테리어'} ${area}평 예상 공사기간\n\n` +
        `📅 약 ${days.min}일 ~ ${days.max}일 (영업일 기준)\n\n` +
        `일반적인 공정 순서:\n` +
        `  1. 철거 (2~3일)\n` +
        `  2. 설비/배관 (3~5일)\n` +
        `  3. 전기 배선 (3~5일)\n` +
        `  4. 방수 (2~3일, 양생 포함)\n` +
        `  5. 목공/천장 (5~7일)\n` +
        `  6. 타일/바닥 (3~5일)\n` +
        `  7. 도배/도장 (3~5일)\n` +
        `  8. 가구/설치 (3~5일)\n` +
        `  9. 마감/정리 (2~3일)\n\n` +
        `⚠️ 면적, 공사 범위, 허가 여부에 따라 달라집니다.`,
    }
  }

  // 주의사항/팁/조심 질문
  if (matchKeywords(msg, ['주의', '조심', '팁', '주의사항', '실수', '함정', '사기'])) {
    return {
      tool: 'general_answer',
      success: true,
      message: `${info?.icon || '🏗️'} ${info?.name || '인테리어'} 주의사항\n\n` +
        `🚨 꼭 확인해야 할 것들:\n\n` +
        `1. 💰 견적서 확인\n` +
        `  • 공종별 세부 내역이 있는지 (뭉텅이 견적 주의)\n` +
        `  • VAT 포함/별도 확인\n` +
        `  • 철거비, 폐기물 처리비 포함 여부\n\n` +
        `2. 📋 계약서 필수 항목\n` +
        `  • 공사 기간 (시작일~완공일)\n` +
        `  • 하자보수 기간 (보통 1~2년)\n` +
        `  • 추가 공사 시 비용 산정 방식\n` +
        `  • 지연 시 페널티\n\n` +
        `3. 🔧 현장 확인\n` +
        `  • 전기 용량 확인 (증설 필요 시 추가 비용)\n` +
        `  • 방수 상태 확인\n` +
        `  • 관리소 공사 허가 조건\n\n` +
        `4. 📸 증거 남기기\n` +
        `  • 공사 전/중/후 사진 촬영\n` +
        `  • 변경 사항은 문서로 남기기\n` +
        `  • 체키가 이 모든 걸 자동으로 해드립니다!\n\n` +
        `💡 체키로 프로젝트를 관리하면 이 모든 과정이 자동 기록됩니다.`,
    }
  }

  // 소방/법규 질문
  if (matchKeywords(msg, ['소방', '법', '법규', '허가', '신고', '규정', '스프링클러', '소화기'])) {
    return {
      tool: 'general_answer',
      success: true,
      message: `📜 ${info?.name || '인테리어'} 관련 법규 안내\n\n` +
        `🔥 소방 관련\n` +
        `  • 소화기: 모든 영업장 필수 (33㎡당 1개)\n` +
        `  • 화재감지기: 모든 영업장 필수\n` +
        `  • 스프링클러: 바닥면적 합계에 따라 (업종별 상이)\n` +
        `  • 비상구: 영업장 면적 기준 확보 필수\n` +
        `  • 피난안내도: 부착 필수\n\n` +
        `📋 인허가\n` +
        `  • 건축물 용도변경: 업종에 따라 필요\n` +
        `  • 영업신고/허가: 업종별 관할 관청\n` +
        `  • 간판 허가: 구청 옥외광고물 신고\n` +
        `  • 소방시설 완비증명원: 영업허가 시 필요\n\n` +
        `⚠️ 업종과 면적에 따라 요건이 다릅니다.\n체키가 업종별 체크리스트로 자동 확인해드립니다.`,
    }
  }

  // 공정순서 질문
  if (matchKeywords(msg, ['공정', '순서', '절차', '단계', '과정', '프로세스'])) {
    return {
      tool: 'general_answer',
      success: true,
      message: `🔧 인테리어 공정 순서 안내\n\n` +
        `올바른 공정 순서 (순서 꼬이면 분쟁의 원인!)\n\n` +
        `1️⃣ 철거 → 구조벽 확인, 석면 체크\n` +
        `2️⃣ 설비/배관 → 급배수, 가스 배관\n` +
        `3️⃣ 전기 배선 → 분전반, 콘센트, 조명 배선\n` +
        `4️⃣ 냉난방 배관 → 에어컨 냉매관, 드레인\n` +
        `5️⃣ 방수 → 화장실, 주방 바닥/벽\n` +
        `6️⃣ 목공/천장 → 경량틀, 석고보드, 천장\n` +
        `7️⃣ 타일/바닥 → 바닥재, 타일 시공\n` +
        `8️⃣ 도배/도장 → 벽면 마감\n` +
        `9️⃣ 가구 설치 → 주방가구, 붙박이\n` +
        `🔟 설비 마감 → 에어컨 설치, 조명, 위생기구\n` +
        `1️⃣1️⃣ 간판/외부 → 간판, 출입문\n` +
        `1️⃣2️⃣ 준공 점검 → 소방, 전기, 최종 클리닝\n\n` +
        `⚠️ 핵심: 배관→전기→방수→목공→도배→가구 순서!\n` +
        `체키가 공정 순서를 자동으로 관리해드립니다.`,
    }
  }

  // 하자 관련 질문
  if (matchKeywords(msg, ['하자', '문제', '고장', '불량', '누수', '곰팡이', '크랙', '갈라'])) {
    return {
      tool: 'general_answer',
      success: true,
      message: `🔍 인테리어 하자 관련 안내\n\n` +
        `📌 자주 발생하는 하자 유형:\n` +
        `  • 누수/방수 불량 (화장실, 주방, 창호)\n` +
        `  • 바닥 들뜸/소음\n` +
        `  • 도배 갈라짐/곰팡이\n` +
        `  • 문/창호 개폐 불량\n` +
        `  • 전기 합선/누전\n` +
        `  • 에어컨 배수 문제\n\n` +
        `📋 하자보수 청구 시 필요한 것:\n` +
        `  1. 하자 부위 사진 (날짜 포함)\n` +
        `  2. 계약서 (하자보수 기간 확인)\n` +
        `  3. 시공 완료 확인서\n` +
        `  4. 하자보수 요청 내용증명\n\n` +
        `💡 체키를 사용하면:\n` +
        `  • 모든 사진에 SHA-256 해시 자동 생성\n` +
        `  • 타임스탬프 위변조 불가\n` +
        `  • 공종별 작업 완료 기록 = 책임 소재 증거\n` +
        `  → 분쟁 시 가장 강력한 증거자료가 됩니다.`,
    }
  }

  // 자재 관련 질문
  if (matchKeywords(msg, ['자재', '타일', '마루', '원목', '합판', '석고보드', '페인트', '벽지'])) {
    return {
      tool: 'general_answer',
      success: true,
      message: `🧱 인테리어 자재 관련 안내\n\n` +
        `주요 자재 종류 및 특징:\n\n` +
        `🏗️ 바닥재\n` +
        `  • 강마루: 가성비 좋음, 평당 ₩30,000~80,000\n` +
        `  • 강화마루: 내구성 좋음, 평당 ₩50,000~120,000\n` +
        `  • 원목마루: 고급, 평당 ₩100,000~250,000\n` +
        `  • 포세린 타일: 상업용 추천, 평당 ₩60,000~150,000\n` +
        `  • 폴리싱 타일: 광택, 평당 ₩50,000~100,000\n\n` +
        `🎨 벽면\n` +
        `  • 실크 벽지: 일반적, 롤당 ₩15,000~30,000\n` +
        `  • 합지 벽지: 저가, 롤당 ₩8,000~15,000\n` +
        `  • 페인트(친환경): 리터당 ₩15,000~40,000\n\n` +
        `💡 체키로 프로젝트를 관리하면 자재 입출고, 단가 비교가 자동으로 됩니다.`,
    }
  }

  // 매칭 안 되면 업종 기반 일반 안내
  return generateEstimate(industry, area)
}

export async function routeMessage(
  message: string,
  ctx: ProjectContext | null,
): Promise<ToolResult> {
  const msg = message.toLowerCase()

  // 프로젝트 생성
  if (matchKeywords(msg, ['만들어', '생성', '시작', '새 프로젝트', '프로젝트 만', '프로젝트 생성', '프로젝트 시작'])) {
    const industry = extractIndustry(message) || ''
    const area = extractArea(message)
    const budget = extractBudget(message)
    const nameMatch = message.match(/["']([^"']+)["']/)
    return projectSetup({ industry, area, budget, name: nameMatch?.[1] })
  }

  // 견적 생성 - 프로젝트 있으면 DB 저장, 없으면 가견적
  if (matchKeywords(msg, ['견적', 'quote', '견적서', '견적 만', '표준 견적', '가견적'])) {
    if (ctx?.project) {
      const area = extractArea(message) || 20
      return quoteGenerate(ctx, { area })
    }
    // 프로젝트 없으면 가견적 제공
    const industry = extractIndustry(message) || ''
    const area = extractArea(message)
    return generateEstimate(industry, area)
  }

  // 비용/시세/얼마 질문 - 프로젝트 없어도 답변
  if (matchKeywords(msg, ['비용', '얼마', '시세', '적정가', '적정성', '가격', '단가', '평당', 'cost'])) {
    if (ctx?.project) {
      if (matchKeywords(msg, ['분석', '적정성', 'cost'])) return costAnalyze(ctx)
    }
    const industry = extractIndustry(message) || ''
    const area = extractArea(message)
    return answerGeneralQuestion(message, industry, area)
  }

  // 체크리스트/점검 - 프로젝트 없으면 업종별 안내
  if (matchKeywords(msg, ['체크리스트', '점검', '점검항목', '체크'])) {
    if (ctx?.project) return checklistAnalyze(ctx)
    const industry = extractIndustry(message)
    if (industry) return generateChecklistInfo(industry)
    return {
      tool: 'checklist_info',
      success: true,
      message: `📋 업종별 체크리스트 안내\n\n` +
        `Check-In에는 43개 업종별 전문 체크리스트가 준비되어 있습니다.\n\n` +
        `예시:\n` +
        `  • "카페 체크리스트 알려줘"\n` +
        `  • "병원 점검항목 뭐 있어?"\n` +
        `  • "아파트 체크리스트"\n\n` +
        `업종을 말씀해주시면 해당 체크리스트를 안내해드립니다.`,
    }
  }

  // 리스크 분석 - 프로젝트 있으면 실행, 없으면 일반 안내
  if (matchKeywords(msg, ['리스크', '위험', '진단', 'risk'])) {
    if (ctx?.project) {
      const [riskResult, checkResult] = await Promise.all([
        riskCalculate(ctx),
        checklistAnalyze(ctx),
      ])
      return {
        tool: 'risk_calculate',
        success: true,
        message: riskResult.message + '\n\n---\n\n' + checkResult.message,
        data: { risk: riskResult.data, checklist: checkResult.data },
      }
    }
    return {
      tool: 'general_answer',
      success: true,
      message: `🎯 인테리어 리스크 분석 안내\n\n` +
        `Check-In의 리스크 분석은 특허 공식을 사용합니다:\n` +
        `R = Fp×Wf + Oc×Wo + Ch×Wc\n\n` +
        `  💰 Fp (재정 위험): 예산 규모, 견적 적정성\n` +
        `  ⚙️ Oc (운영 복잡도): 공종 수, 하도급 수\n` +
        `  🔄 Ch (변경 리스크): 설계 변경 횟수, 추가공사\n\n` +
        `프로젝트를 생성하시면 실제 데이터 기반으로 리스크를 자동 계산해드립니다.`,
    }
  }

  // 변경 관리
  if (matchKeywords(msg, ['변경', '변경요청', '추가 공사', '추가공사'])) {
    if (ctx?.project) return changeRecord(ctx, { title: message, reason: message })
    return {
      tool: 'general_answer',
      success: true,
      message: `🔄 변경 관리 안내\n\n` +
        `인테리어 공사 중 변경은 분쟁의 가장 큰 원인입니다.\n\n` +
        `체키의 변경 관리 기능:\n` +
        `  • 변경 요청 자동 기록 (누가, 언제, 뭘 변경)\n` +
        `  • 추가 비용 자동 산출\n` +
        `  • 양측 서명으로 합의 확인\n` +
        `  • 변경 이력 전체 추적\n\n` +
        `프로젝트를 생성하시면 변경 관리가 가능합니다.`,
    }
  }

  // 리포트 생성
  if (matchKeywords(msg, ['리포트', '보고서', 'report', '보고'])) {
    if (ctx?.project) return reportGenerate(ctx)
    return {
      tool: 'general_answer',
      success: true,
      message: `📊 리포트 기능 안내\n\n` +
        `체키의 종합 리포트에는 다음이 포함됩니다:\n` +
        `  • 프로젝트 개요 및 진행률\n` +
        `  • 리스크 분석 결과\n` +
        `  • 견적/비용 분석\n` +
        `  • 공정 진행 현황\n` +
        `  • 변경 이력\n` +
        `  • 증빙 파일 목록\n\n` +
        `PDF로 다운로드 가능합니다.\n프로젝트를 생성하시면 리포트를 생성할 수 있습니다.`,
    }
  }

  // AI 검증
  if (matchKeywords(msg, ['검증', '채점', 'verify', 'score'])) {
    if (ctx?.project) return verifyScore(ctx)
    return {
      tool: 'general_answer',
      success: true,
      message: `🤖 AI 검증 인증서 안내\n\n` +
        `4가지 항목 × 25점 = 100점 만점\n\n` +
        `  💰 비용 적정성 (25점): 견적이 시세에 맞는지\n` +
        `  📋 누락 점검 (25점): 체크리스트 완료율\n` +
        `  📝 계약 안정성 (25점): 합의서, 증빙 확보\n` +
        `  📅 일정 유효성 (25점): 공정 지연 여부\n\n` +
        `등급: A+ (90↑) / A (80↑) / B+ (70↑) / B (60↑) / C (50↑) / D\n\n` +
        `프로젝트를 생성하고 데이터를 쌓으면 AI가 자동 채점합니다.`,
    }
  }

  // 일정 점검
  if (matchKeywords(msg, ['일정', '공정', '지연', '스케줄', 'schedule'])) {
    if (ctx?.project) return scheduleCheck(ctx)
    const industry = extractIndustry(message)
    const area = extractArea(message)
    return answerGeneralQuestion(message + ' 기간', industry || '', area)
  }

  // 증빙
  if (matchKeywords(msg, ['증빙', '증거', '패키지', 'evidence', '해시', '블록체인'])) {
    if (ctx?.project) return evidencePackage(ctx)
    return {
      tool: 'general_answer',
      success: true,
      message: `📦 증거 패키징 안내\n\n` +
        `체키는 모든 증거를 위변조 불가능하게 보관합니다:\n\n` +
        `🔐 SHA-256 해시\n` +
        `  • 모든 파일에 고유 해시값 생성\n` +
        `  • 1비트라도 변경되면 해시가 달라짐\n\n` +
        `🌲 Merkle Tree\n` +
        `  • 전체 증거를 트리 구조로 연결\n` +
        `  • 어떤 하나라도 변경 시 루트 해시가 변경\n\n` +
        `📸 자동 기록\n` +
        `  • 사진 촬영 시 타임스탬프 자동\n` +
        `  • 위치정보(GPS) 포함\n` +
        `  • 분쟁 시 법적 증거력 확보\n\n` +
        `프로젝트를 생성하시면 모든 기록이 자동으로 패키징됩니다.`,
    }
  }

  // 합의/서명/계약
  if (matchKeywords(msg, ['합의', '서명', '계약', 'agreement'])) {
    if (ctx?.project) return agreementCreate(ctx)
    return {
      tool: 'general_answer',
      success: true,
      message: `📝 전자서명/합의 안내\n\n` +
        `체키의 3자 합의 시스템:\n` +
        `  👤 발주자 (고객)\n` +
        `  🏗️ 시공자 (인테리어 업체)\n` +
        `  📊 감리자 (제3자)\n\n` +
        `전자서명으로 계약 내용을 확인하고,\n` +
        `변경 시에도 양측 합의를 기록합니다.\n\n` +
        `프로젝트를 생성하시면 합의서를 만들 수 있습니다.`,
    }
  }

  // 소방/법규/허가 - 프로젝트 없어도 답변
  if (matchKeywords(msg, ['소방', '법', '법규', '허가', '신고', '규정', '스프링클러', '소화기'])) {
    const industry = extractIndustry(message) || ''
    const area = extractArea(message)
    return answerGeneralQuestion(message, industry, area)
  }

  // 공정순서 - 프로젝트 없어도 답변
  if (matchKeywords(msg, ['공정', '순서', '절차', '단계'])) {
    const industry = extractIndustry(message) || ''
    const area = extractArea(message)
    return answerGeneralQuestion(message, industry, area)
  }

  // 하자 관련 - 프로젝트 없어도 답변
  if (matchKeywords(msg, ['하자', '문제', '고장', '불량', '누수', '곰팡이'])) {
    const industry = extractIndustry(message) || ''
    const area = extractArea(message)
    return answerGeneralQuestion(message, industry, area)
  }

  // 자재 관련 - 프로젝트 없어도 답변
  if (matchKeywords(msg, ['자재', '타일', '마루', '원목', '페인트', '벽지', '바닥재'])) {
    const industry = extractIndustry(message) || ''
    const area = extractArea(message)
    return answerGeneralQuestion(message, industry, area)
  }

  // 주의사항/팁
  if (matchKeywords(msg, ['주의', '조심', '팁', '주의사항', '실수', '함정', '사기'])) {
    const industry = extractIndustry(message) || ''
    const area = extractArea(message)
    return answerGeneralQuestion(message, industry, area)
  }

  // 인사/현황
  if (matchKeywords(msg, ['안녕', '현황', '상태', '요약', '도움', 'hello', 'hi', '뭐', '체키'])) {
    return getProjectSummary(ctx || { project: null, diagnosticCount: 0, quoteItems: [], costAnalysis: null, changeOrders: [], evidenceFiles: [], agreements: [], reports: [], processes: [], workforce: [], materials: [] })
  }

  // 업종이 감지되면 해당 업종 가견적 제공
  const detectedIndustry = extractIndustry(message)
  if (detectedIndustry) {
    const area = extractArea(message)
    return answerGeneralQuestion(message, detectedIndustry, area)
  }

  // 키워드 미매칭 → Gemini API로 자유 답변 (어떤 질문이든)
  return fallbackToGemini(message)
}

/** Gemini API로 자유로운 인테리어 질문 답변 */
async function fallbackToGemini(message: string): Promise<ToolResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      tool: 'general_answer',
      success: true,
      message: `🤖 안녕하세요! 체키입니다.\n\n` +
        `무엇이든 물어보세요! 인테리어뿐만 아니라 어떤 질문이든 답변해드립니다.\n\n` +
        `🏗️ 인테리어 전문 기능:\n` +
        `  • "카페 20평 인테리어 얼마야?"\n` +
        `  • "음식점 견적 알려줘"\n` +
        `  • "인테리어 공정 순서가 뭐야?"\n` +
        `  • "하자보수 어떻게 해?"\n\n` +
        `📋 프로젝트 관리:\n` +
        `  • "카페 20평 프로젝트 만들어줘"\n` +
        `  • "리스크 분석해줘"\n` +
        `  • "리포트 생성해줘"\n\n` +
        `💬 일반 질문도 OK:\n` +
        `  • 날씨, 요리, 여행, IT, 건강 등\n` +
        `  • 무엇이든 편하게 물어보세요!\n\n` +
        `현재 AI 엔진 연동 준비 중이며, 곧 더 똑똑한 답변을 드릴 수 있습니다.`,
    }
  }

  // 모델 폴백 체인: 2.5-flash → 2.5-flash-lite (2.0-flash는 2026-03-03 퇴역)
  const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: FALLBACK_MODELS[i],
        systemInstruction: CHEKI_SYSTEM_PROMPT,
      })

      const result = await model.generateContent(message)
      const response = result.response.text()
      console.log(`[체키 폴백] ${FALLBACK_MODELS[i]} 응답 성공`)

      return {
        tool: 'gemini_answer',
        success: true,
        message: response,
      }
    } catch (error: any) {
      const msg = error?.message || ''
      const isRateLimit = error?.status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')

      if (isRateLimit && i < FALLBACK_MODELS.length - 1) {
        console.warn(`[체키 폴백] ${FALLBACK_MODELS[i]} 할당량 초과 → ${FALLBACK_MODELS[i + 1]}로 전환`)
        continue
      }

      console.error('Gemini 폴백 호출 오류:', error?.message)
      return {
        tool: 'general_answer',
        success: true,
        message: `🤖 안녕하세요! 체키입니다.\n\n` +
          `죄송합니다. 지금 AI 엔진에 일시적인 문제가 있습니다.\n잠시 후 다시 시도해주세요.\n\n` +
          `💬 인테리어 관련은 키워드를 포함해서 질문하시면 바로 답변됩니다:\n` +
          `  • 견적, 비용, 얼마 → 비용 관련\n` +
          `  • 체크리스트, 점검 → 점검 관련\n` +
          `  • 공정, 순서, 절차 → 공정 관련\n` +
          `  • 하자, 누수, 곰팡이 → 하자 관련\n` +
          `  • 소방, 법, 허가 → 법규 관련\n\n` +
          `그 외 일반 질문은 AI 엔진 복구 후 답변 가능합니다.`,
      }
    }
  }

  return {
    tool: 'general_answer',
    success: true,
    message: `🤖 체키입니다. AI 엔진이 일시적으로 바쁩니다. 잠시 후 다시 시도해주세요.`,
  }
}

function matchKeywords(message: string, keywords: string[]): boolean {
  return keywords.some(kw => message.includes(kw))
}
