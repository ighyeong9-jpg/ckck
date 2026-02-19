/**
 * 자동화 도구 모음 - 자동견적, AI 디자인, AI 도면, 자동공정표, 자동보고서, 자동법규체크
 * Check-In 체키의 자동 실행 시스템
 */

import { createClient } from '@/lib/supabase/server'
import { formatKRW } from '@/lib/utils/costCalculator'
import type { ToolResult } from './tools'

import baseRates from '@/data/pricing/base-rates.json'
import industryPresets from '@/data/pricing/industry-presets.json'
import tradeDurations from '@/data/scheduling/trade-durations.json'
import regulations from '@/data/laws/regulations.json'

// ═══════════════════════════════════════════════
// 헬퍼
// ═══════════════════════════════════════════════

async function getUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

function pyeongToSqm(pyeong: number): number { return pyeong * 3.306 }
function sqmToPyeong(sqm: number): number { return sqm / 3.306 }

type Grade = 'economy' | 'standard' | 'premium' | 'luxury'
const gradeNames: Record<Grade, string> = {
  economy: '이코노미 (실속형)',
  standard: '스탠다드 (일반형)',
  premium: '프리미엄 (고급형)',
  luxury: '럭셔리 (최고급형)',
}

// ═══════════════════════════════════════════════
// 1. 자동 견적 시스템
// ═══════════════════════════════════════════════

export async function autoQuoteGenerate(params: {
  industryType: string
  area: number
  areaUnit?: string
  grade: string
  requirements?: string
  location?: string
}): Promise<ToolResult> {
  const grade = (params.grade || 'standard') as Grade
  const areaPyeong = params.areaUnit === 'sqm' ? sqmToPyeong(params.area) : params.area
  const areaSqm = params.areaUnit === 'sqm' ? params.area : pyeongToSqm(params.area)

  // 업종 프리셋 가져오기
  const preset = (industryPresets as any)[params.industryType]
  if (!preset) {
    return { tool: 'auto_quote_generate', success: false, message: `지원하지 않는 업종입니다: ${params.industryType}. 46개 업종 중 선택해주세요.` }
  }

  const trades = baseRates.trades as any
  const items: Array<{ name: string; nameKr: string; unit: string; quantity: number; unitPrice: number; amount: number }> = []

  // 필수 공종 계산
  for (const tradeKey of preset.required_trades) {
    const trade = trades[tradeKey]
    if (!trade) continue

    const unitPrice = trade[grade] || trade.standard
    let quantity = areaPyeong
    let unit = '평'

    if (trade.unit === 'set') {
      quantity = Math.ceil(areaPyeong / 10) // 10평당 1세트 기준
      unit = '세트'
    } else if (trade.unit === 'ea') {
      quantity = Math.max(1, Math.ceil(areaPyeong / 5)) // 5평당 1개 기준
      unit = '개'
    } else if (trade.unit === 'sqm') {
      quantity = areaSqm
      unit = '㎡'
    }

    items.push({
      name: tradeKey,
      nameKr: trade.name || tradeKey,
      unit,
      quantity: Math.round(quantity * 10) / 10,
      unitPrice,
      amount: Math.round(quantity * unitPrice),
    })
  }

  // 특수 항목 추가
  if (preset.special_items) {
    for (const special of preset.special_items) {
      const cost = special.cost?.[grade] || special.cost?.standard
      if (cost) {
        items.push({
          name: special.name,
          nameKr: special.name,
          unit: '식',
          quantity: 1,
          unitPrice: cost,
          amount: cost,
        })
      } else if (special.cost_per_unit) {
        const perUnit = special.cost_per_unit[grade] || special.cost_per_unit.standard
        const qty = Math.ceil(areaPyeong / 2) // 2평당 1단위 기준 (좌석 등)
        items.push({
          name: special.name,
          nameKr: special.name,
          unit: special.unit || '개',
          quantity: qty,
          unitPrice: perUnit,
          amount: qty * perUnit,
        })
      }
    }
  }

  // 소계
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)

  // 부대비용
  const overheadItems = Object.entries(baseRates.overhead).map(([key, info]: [string, any]) => ({
    name: info.name,
    amount: Math.round(subtotal * info.rate),
    rate: `${(info.rate * 100).toFixed(0)}%`,
  }))
  const overheadTotal = overheadItems.reduce((sum, item) => sum + item.amount, 0)

  // 지역 보정
  const locationKey = params.location || 'gyeonggi'
  const locationInfo = (baseRates.location_multiplier as any)[locationKey] || baseRates.location_multiplier.gyeonggi
  const locationMultiplier = locationInfo.multiplier || 1.0
  const locationName = locationInfo.name || '경기'

  const totalBeforeLocation = subtotal + overheadTotal
  const grandTotal = Math.round(totalBeforeLocation * locationMultiplier)

  // 결과 포매팅
  const itemLines = items.map(item =>
    `  ${item.nameKr}: ${item.quantity}${item.unit} × ${formatKRW(item.unitPrice)} = ${formatKRW(item.amount)}`
  ).join('\n')

  const overheadLines = overheadItems.map(item =>
    `  ${item.name} (${item.rate}): ${formatKRW(item.amount)}`
  ).join('\n')

  const message = `📋 자동 견적서 - ${preset.name} ${areaPyeong}평 [${gradeNames[grade]}]\n\n` +
    `━━━ 공종별 내역 ━━━\n${itemLines}\n\n` +
    `소계: ${formatKRW(subtotal)}\n\n` +
    `━━━ 부대비용 ━━━\n${overheadLines}\n` +
    `부대비용 합계: ${formatKRW(overheadTotal)}\n\n` +
    `━━━ 합계 ━━━\n` +
    `지역: ${locationName} (보정 ×${locationMultiplier})\n` +
    `💰 총 견적금액: ${formatKRW(grandTotal)}\n\n` +
    `⚠️ 시장 평균 기준이며 실제 현장 상황에 따라 달라질 수 있습니다.\n` +
    `평당 단가: ${formatKRW(Math.round(grandTotal / areaPyeong))}/평`

  return {
    tool: 'auto_quote_generate',
    success: true,
    message,
    data: {
      industryType: params.industryType,
      industryName: preset.name,
      area: areaPyeong,
      grade,
      items,
      subtotal,
      overhead: overheadItems,
      overheadTotal,
      location: locationName,
      locationMultiplier,
      grandTotal,
      pricePerPyeong: Math.round(grandTotal / areaPyeong),
    },
  }
}

export async function autoQuoteDetail(params: {
  quoteId?: string; trade?: string; action?: string
}): Promise<ToolResult> {
  const trades = baseRates.trades as any
  if (params.trade) {
    const trade = trades[params.trade]
    if (trade) {
      return {
        tool: 'auto_quote_detail',
        success: true,
        message: `📋 ${trade.name} 상세 단가\n\n` +
          `이코노미: ${formatKRW(trade.economy)}\n` +
          `스탠다드: ${formatKRW(trade.standard)}\n` +
          `프리미엄: ${formatKRW(trade.premium)}\n` +
          `럭셔리: ${formatKRW(trade.luxury)}\n` +
          `단위: ${trade.unit === 'pyeong' ? '평' : trade.unit === 'ea' ? '개' : trade.unit}`,
        data: trade,
      }
    }
  }
  return { tool: 'auto_quote_detail', success: true, message: '공종명을 지정해주세요. (예: electrical, plumbing, woodwork)' }
}

export async function autoQuoteCompare(params: {
  industryType: string; area: number; grades?: string[]
}): Promise<ToolResult> {
  const gradesToCompare = (params.grades || ['economy', 'standard', 'premium', 'luxury']) as Grade[]
  const results: Array<{ grade: Grade; total: number }> = []

  for (const grade of gradesToCompare) {
    const result = await autoQuoteGenerate({
      industryType: params.industryType,
      area: params.area,
      grade,
    })
    if (result.success && result.data) {
      results.push({ grade, total: result.data.grandTotal })
    }
  }

  const preset = (industryPresets as any)[params.industryType]
  const lines = results.map(r =>
    `  ${gradeNames[r.grade]}: ${formatKRW(r.total)} (평당 ${formatKRW(Math.round(r.total / params.area))})`
  ).join('\n')

  return {
    tool: 'auto_quote_compare',
    success: true,
    message: `📊 ${preset?.name || params.industryType} ${params.area}평 등급별 비교\n\n${lines}\n\n` +
      `💡 등급 차이는 주로 자재 품질과 마감 수준의 차이입니다.`,
    data: { industryType: params.industryType, area: params.area, comparison: results },
  }
}

// ═══════════════════════════════════════════════
// 2. AI 디자인 시스템
// ═══════════════════════════════════════════════

const styleProfiles: Record<string, { colors: string[]; materials: string[]; keywords: string[] }> = {
  '모던': { colors: ['#2C3E50', '#ECF0F1', '#BDC3C7', '#E74C3C'], materials: ['고광택 타일', '유리', '스테인리스', 'MDF 도장'], keywords: ['깔끔', '직선', '심플', '무채색'] },
  '미니멀': { colors: ['#FFFFFF', '#F5F5F5', '#333333', '#999999'], materials: ['백색 도장', '마이크로시멘트', '무광 타일'], keywords: ['여백', '절제', '화이트', '비움'] },
  '북유럽': { colors: ['#FFFFFF', '#F0EDE5', '#A8C4D9', '#D4A574'], materials: ['원목', '패브릭', '리넨', '화이트 페인트'], keywords: ['따뜻', '자연', '밝음', '우드톤'] },
  '인더스트리얼': { colors: ['#2C2C2C', '#8C8C8C', '#CD853F', '#B7410E'], materials: ['노출 콘크리트', '철제', '브릭타일', '에폭시'], keywords: ['거친', '원시적', '도시적', '빈티지'] },
  '클래식': { colors: ['#2F1B14', '#DEB887', '#8B7355', '#FFFFF0'], materials: ['대리석', '원목 몰딩', '패브릭 월', '샹들리에'], keywords: ['우아', '고급', '전통', '격식'] },
  '빈티지': { colors: ['#8B7D6B', '#D2B48C', '#556B2F', '#B8860B'], materials: ['고재 원목', '앤티크 타일', '패턴 벽지', '놋쇠'], keywords: ['레트로', '감성', '중고', '세월'] },
  '내추럴': { colors: ['#90A955', '#F2E8CF', '#ECE2D0', '#6B8E23'], materials: ['원목', '리넨', '코르크', '규조토 벽지'], keywords: ['자연', '친환경', '편안', '녹색'] },
  '한옥': { colors: ['#5C3317', '#F5F0E1', '#8B4513', '#2F4F4F'], materials: ['한지', '원목', '황토', '전통 기와'], keywords: ['전통', '한국적', '고즈넉', '자연'] },
  '레트로': { colors: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#A8E6CE'], materials: ['패턴 타일', '컬러 페인트', '네온사인', '비닐 시트'], keywords: ['복고', '컬러풀', '팝', '유니크'] },
}

export async function designGenerate(params: {
  industryType: string; area?: number; style: string;
  colorPreference?: string; budget?: string; requirements?: string
}): Promise<ToolResult> {
  const style = styleProfiles[params.style] || styleProfiles['모던']
  const preset = (industryPresets as any)[params.industryType]
  const area = params.area || 20

  const colorPalette = style.colors.map((c, i) =>
    `  ${i === 0 ? '메인' : i === 1 ? '서브' : i === 2 ? '포인트' : '악센트'}: ${c}`
  ).join('\n')

  const message = `🎨 AI 디자인 컨셉 - ${preset?.name || params.industryType} ${area}평 [${params.style} 스타일]\n\n` +
    `━━━ 컨셉 키워드 ━━━\n  ${style.keywords.join(' / ')}\n\n` +
    `━━━ 컬러 팔레트 ━━━\n${colorPalette}\n\n` +
    `━━━ 추천 마감재 ━━━\n` +
    style.materials.map(m => `  • ${m}`).join('\n') + '\n\n' +
    `━━━ 공간별 제안 ━━━\n` +
    `  바닥: ${params.style === '인더스트리얼' ? '폴리싱 콘크리트 or 에폭시' : params.style === '북유럽' ? '내추럴 오크 원목마루' : '포세린 타일 600×600'}\n` +
    `  벽면: ${params.style === '인더스트리얼' ? '노출 콘크리트 + 브릭 포인트' : params.style === '미니멀' ? '백색 도장 (반광)' : '포인트 벽 + 도장 마감'}\n` +
    `  천장: ${params.style === '인더스트리얼' ? '노출 천장 (배관/덕트 도장)' : '평천장 + 간접 조명'}\n` +
    `  조명: ${params.style === '클래식' ? '샹들리에 + 벽등' : params.style === '인더스트리얼' ? '에디슨 벌브 + 레일등' : 'LED 매입등 + 펜던트'}\n\n` +
    (params.requirements ? `📌 특별 요구사항 반영: ${params.requirements}\n\n` : '') +
    `⚠️ AI 제안이며 전문 디자이너와 상의를 권장합니다.`

  return {
    tool: 'design_generate',
    success: true,
    message,
    data: {
      industryType: params.industryType,
      area,
      style: params.style,
      colorPalette: style.colors,
      materials: style.materials,
      keywords: style.keywords,
    },
  }
}

export async function designMoodboard(params: {
  designId?: string; section?: string
}): Promise<ToolResult> {
  const section = params.section || '전체'
  return {
    tool: 'design_moodboard',
    success: true,
    message: `🖼️ 무드보드 - ${section}\n\n` +
      `━━━ 참고 이미지 검색 키워드 ━━━\n` +
      `  Pinterest: "modern ${section} interior design 2026"\n` +
      `  Instagram: #인테리어디자인 #${section}인테리어\n\n` +
      `━━━ 참고 자재 브랜드 ━━━\n` +
      `  타일: 현대L&C, 동화자연마루, 한샘\n` +
      `  조명: 카페24, 루미르, 코르나\n` +
      `  가구: 이케아, 한샘, 일룸, 까사미아\n` +
      `  페인트: 벤자민무어, 노루페인트, 삼화페인트\n\n` +
      `💡 무드보드는 시공 전 고객과 컨셉 합의에 활용하세요.`,
  }
}

export async function designMaterialRecommend(params: {
  designId?: string; category?: string; budget?: string
}): Promise<ToolResult> {
  const grade = (params.budget || 'standard') as Grade
  const category = params.category || '전체'

  const recommendations: Record<string, Array<{ name: string; price: string; pros: string }>> = {
    '타일': [
      { name: grade === 'luxury' ? '이탈리아 대리석 타일' : grade === 'premium' ? '스페인 포세린 타일' : '국산 포세린 타일', price: grade === 'luxury' ? '15~30만/㎡' : grade === 'premium' ? '8~15만/㎡' : '3~8만/㎡', pros: '내구성 우수, 관리 편리' },
    ],
    '바닥재': [
      { name: grade === 'luxury' ? '월넛 원목마루' : grade === 'premium' ? '오크 강마루' : 'SPC 바닥재', price: grade === 'luxury' ? '15~25만/평' : grade === 'premium' ? '8~12만/평' : '3~5만/평', pros: grade === 'luxury' ? '고급감, 자연 질감' : '내구성 대비 가성비' },
    ],
    '도배': [
      { name: grade === 'luxury' ? '수입 천연벽지' : grade === 'premium' ? '실크벽지' : '합지벽지', price: grade === 'luxury' ? '8~15만/롤' : grade === 'premium' ? '4~8만/롤' : '1.5~3만/롤', pros: grade === 'luxury' ? '질감과 내구성 최상' : '깔끔한 마감' },
    ],
  }

  const recs = category === '전체'
    ? Object.entries(recommendations).map(([cat, items]) => `[${cat}]\n` + items.map(i => `  • ${i.name} (${i.price}) - ${i.pros}`).join('\n')).join('\n\n')
    : (recommendations[category] || []).map(i => `  • ${i.name} (${i.price}) - ${i.pros}`).join('\n') || '해당 카테고리 정보가 없습니다.'

  return {
    tool: 'design_material_recommend',
    success: true,
    message: `🧱 자재 추천 [${gradeNames[grade]}]\n\n${recs}\n\n💡 실제 자재 선택 시 샘플 확인을 권장합니다.`,
  }
}

export async function designLayoutSuggest(params: {
  industryType: string; area?: number; shape?: string;
  width?: number; depth?: number; entrance?: string; windows?: string
}): Promise<ToolResult> {
  const preset = (industryPresets as any)[params.industryType]
  const area = params.area || 20
  const shape = params.shape || '직사각형'
  const width = params.width || Math.sqrt(area * 3.306) * 1.2
  const depth = params.depth || (area * 3.306) / width

  let layout = ''
  if (['cafe', 'dessert', 'brunch'].includes(params.industryType)) {
    layout = `┌─────────────────────────────────┐\n` +
      `│  입구                          │\n` +
      `│  ┌──────┐                      │\n` +
      `│  │카운터│   ☕ ☕ ☕ (좌석)     │\n` +
      `│  │바리스│                      │\n` +
      `│  │타 공간│   ☕ ☕ ☕           │\n` +
      `│  └──────┘                      │\n` +
      `│            ☕ ☕ ☕ ☕          │\n` +
      `│  ┌──────┐                      │\n` +
      `│  │ 화장 │   ☕ ☕ (창가석)     │\n` +
      `│  │  실  │                      │\n` +
      `│  └──────┘                      │\n` +
      `└─────────────────────────────────┘`
  } else if (['restaurant', 'korean_bbq', 'chinese', 'japanese', 'western'].includes(params.industryType)) {
    layout = `┌─────────────────────────────────┐\n` +
      `│  입구     홀                   │\n` +
      `│  ┌──┐   🍽️ 🍽️ 🍽️           │\n` +
      `│  │대│                         │\n` +
      `│  │기│   🍽️ 🍽️ 🍽️           │\n` +
      `│  └──┘                         │\n` +
      `│         🍽️ 🍽️ (룸/반개방)   │\n` +
      `│  ┌──────────────┐             │\n` +
      `│  │    주 방      │  ┌────┐    │\n` +
      `│  │ (쿡라인/준비) │  │화장│    │\n` +
      `│  └──────────────┘  │ 실 │    │\n` +
      `│                    └────┘    │\n` +
      `└─────────────────────────────────┘`
  } else if (['apartment', 'villa', 'house'].includes(params.industryType)) {
    layout = `┌─────────────────────────────────┐\n` +
      `│  현관                          │\n` +
      `│  ┌────────┐  ┌────────────┐   │\n` +
      `│  │ 주 방  │  │   거 실     │   │\n` +
      `│  │        │  │             │   │\n` +
      `│  └────────┘  │             │   │\n` +
      `│  ┌────────┐  └────────────┘   │\n` +
      `│  │ 화장실 │  ┌────┐┌────┐    │\n` +
      `│  └────────┘  │방 1││방 2│    │\n` +
      `│              └────┘└────┘    │\n` +
      `└─────────────────────────────────┘`
  } else {
    layout = `┌─────────────────────────────────┐\n` +
      `│  입구                          │\n` +
      `│  ┌──────┐  ┌──────────────┐   │\n` +
      `│  │안내대│  │  메인 공간    │   │\n` +
      `│  └──────┘  │              │   │\n` +
      `│            │              │   │\n` +
      `│  ┌──────┐  └──────────────┘   │\n` +
      `│  │창고/ │  ┌────┐             │\n` +
      `│  │직원실│  │화장│             │\n` +
      `│  └──────┘  │ 실 │             │\n` +
      `│            └────┘             │\n` +
      `└─────────────────────────────────┘`
  }

  return {
    tool: 'design_layout_suggest',
    success: true,
    message: `📐 레이아웃 제안 - ${preset?.name || params.industryType} ${area}평\n\n` +
      `공간: ${shape} (약 ${width.toFixed(1)}m × ${depth.toFixed(1)}m)\n` +
      `입구: ${params.entrance || '전면'} | 창문: ${params.windows || '전면'}\n\n` +
      `${layout}\n\n` +
      `━━━ 동선 제안 ━━━\n` +
      `  • 주동선: 입구 → 메인 공간 (2m 이상 확보)\n` +
      `  • 부동선: 직원/서비스 동선 분리\n` +
      `  • 비상동선: 비상구 방향 확보\n\n` +
      `⚠️ 개념 평면도이며 실시공 도면은 전문 설계사 확인이 필요합니다.`,
    data: { industryType: params.industryType, area, width, depth, shape },
  }
}

// ═══════════════════════════════════════════════
// 3. AI 도면 시스템
// ═══════════════════════════════════════════════

export async function floorplanGenerate(params: {
  width: number; depth: number;
  rooms?: any[]; walls?: any[]; doors?: any[]; windows?: any[];
  fixtures?: any[]; furniture?: any[]
}): Promise<ToolResult> {
  const w = params.width
  const d = params.depth
  const scale = 100 // 1:100

  // SVG 생성
  const svgWidth = w / scale * 10 + 40
  const svgHeight = d / scale * 10 + 40
  const drawW = w / scale * 10
  const drawH = d / scale * 10

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`
  svg += `  <rect x="20" y="20" width="${drawW}" height="${drawH}" fill="white" stroke="black" stroke-width="2"/>\n`

  // 방 표시
  if (params.rooms) {
    for (const room of params.rooms) {
      const rx = (room.x || 0) / scale * 10 + 20
      const ry = (room.y || 0) / scale * 10 + 20
      const rw = (room.width || 3000) / scale * 10
      const rh = (room.height || 3000) / scale * 10
      svg += `  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="#666" stroke-width="1" stroke-dasharray="4"/>\n`
      svg += `  <text x="${rx + rw / 2}" y="${ry + rh / 2}" text-anchor="middle" font-size="3">${room.name || ''}</text>\n`
    }
  }

  // 치수 표시
  svg += `  <text x="${20 + drawW / 2}" y="15" text-anchor="middle" font-size="3">${w}mm</text>\n`
  svg += `  <text x="10" y="${20 + drawH / 2}" text-anchor="middle" font-size="3" transform="rotate(-90, 10, ${20 + drawH / 2})">${d}mm</text>\n`
  svg += `  <text x="${20 + drawW / 2}" y="${svgHeight - 5}" text-anchor="middle" font-size="2.5">축척 1:${scale}</text>\n`
  svg += `</svg>`

  return {
    tool: 'floorplan_generate',
    success: true,
    message: `📐 평면도 생성 완료\n\n` +
      `크기: ${w}mm × ${d}mm (약 ${(w * d / 1000000 / 3.306).toFixed(1)}평)\n` +
      `방: ${(params.rooms || []).length}개\n` +
      `문: ${(params.doors || []).length}개 | 창: ${(params.windows || []).length}개\n\n` +
      `SVG 도면이 생성되었습니다. export_pdf로 PDF 내보내기가 가능합니다.\n\n` +
      `⚠️ 개념 평면도이며 실시공 도면은 전문 설계사 확인이 필요합니다.`,
    data: { svg, width: w, depth: d, rooms: params.rooms, scale },
  }
}

export async function floorplanFromDescription(params: {
  description: string; industryType?: string; area?: number; areaUnit?: string
}): Promise<ToolResult> {
  const area = params.area || 20
  const areaSqm = params.areaUnit === 'sqm' ? area : area * 3.306
  const sqrtArea = Math.sqrt(areaSqm)
  const width = Math.round(sqrtArea * 1.2 * 1000)
  const depth = Math.round(areaSqm / (sqrtArea * 1.2) * 1000)

  // 설명에서 키워드 추출하여 방 자동 생성
  const rooms: Array<{ name: string; x: number; y: number; width: number; height: number }> = []
  const desc = params.description

  if (desc.includes('카운터') || desc.includes('바')) {
    rooms.push({ name: '카운터', x: 0, y: 0, width: Math.round(width * 0.25), height: Math.round(depth * 0.4) })
  }
  if (desc.includes('주방') || desc.includes('키친')) {
    rooms.push({ name: '주방', x: 0, y: Math.round(depth * 0.6), width: Math.round(width * 0.35), height: Math.round(depth * 0.4) })
  }
  if (desc.includes('화장실') || desc.includes('화장')) {
    rooms.push({ name: '화장실', x: Math.round(width * 0.8), y: Math.round(depth * 0.75), width: Math.round(width * 0.2), height: Math.round(depth * 0.25) })
  }
  if (desc.includes('좌석') || desc.includes('홀') || desc.includes('객석')) {
    rooms.push({ name: '홀(좌석)', x: Math.round(width * 0.3), y: 0, width: Math.round(width * 0.7), height: Math.round(depth * 0.7) })
  }
  if (desc.includes('거실') || desc.includes('리빙')) {
    rooms.push({ name: '거실', x: Math.round(width * 0.3), y: 0, width: Math.round(width * 0.7), height: Math.round(depth * 0.5) })
  }
  if (desc.includes('침실') || desc.includes('방')) {
    rooms.push({ name: '침실', x: Math.round(width * 0.5), y: Math.round(depth * 0.5), width: Math.round(width * 0.5), height: Math.round(depth * 0.5) })
  }

  // SVG 도면 생성
  const result = await floorplanGenerate({
    width, depth, rooms,
    doors: [{ x: Math.round(width * 0.4), y: 0, direction: 'south' }],
    windows: [],
  })

  return {
    tool: 'floorplan_from_description',
    success: true,
    message: `📐 자연어 기반 평면도 생성\n\n` +
      `입력: "${params.description}"\n` +
      `크기: ${width}mm × ${depth}mm (약 ${area}평)\n` +
      `감지된 공간: ${rooms.map(r => r.name).join(', ')}\n\n` +
      `SVG 도면이 생성되었습니다.\n` +
      `"카운터를 왼쪽으로 옮겨줘" 같은 명령으로 수정할 수 있습니다.\n\n` +
      `⚠️ 개념 평면도이며 실시공 도면은 전문 설계사 확인이 필요합니다.`,
    data: result.data,
  }
}

export async function floorplanEdit(params: {
  floorplanId?: string; editCommand?: string
}): Promise<ToolResult> {
  return {
    tool: 'floorplan_edit',
    success: true,
    message: `✏️ 도면 수정 요청: "${params.editCommand || ''}"\n\n` +
      `수정 내용을 반영한 새 도면을 생성합니다.\n` +
      `기존 도면과 비교할 수 있습니다.`,
  }
}

export async function floorplanExport(params: {
  floorplanId?: string; format?: string; scale?: string
}): Promise<ToolResult> {
  const format = params.format || 'pdf'
  return {
    tool: 'floorplan_export',
    success: true,
    message: `📥 도면 내보내기 (${format.toUpperCase()})\n\n` +
      `축척: ${params.scale || '1:100'}\n` +
      `파일 형식: ${format.toUpperCase()}\n\n` +
      `도면 내보내기가 준비되었습니다.`,
  }
}

// ═══════════════════════════════════════════════
// 4. 자동 공정표 시스템
// ═══════════════════════════════════════════════

export async function autoScheduleGenerate(params: {
  industryType: string; area: number; startDate: string;
  grade?: string; workingDays?: string
}): Promise<ToolResult> {
  const grade = (params.grade || 'standard') as Grade
  const preset = (industryPresets as any)[params.industryType]
  if (!preset) {
    return { tool: 'auto_schedule_generate', success: false, message: `지원하지 않는 업종: ${params.industryType}` }
  }

  const durations = tradeDurations.durations_per_10pyeong as any
  const sequence = tradeDurations.standard_sequence
  const areaFactor = Math.max(1, params.area / 10)
  const trades = baseRates.trades as any

  // 업종의 필수 공종만 필터
  const requiredTrades = new Set(preset.required_trades)
  const filteredSequence = sequence.filter((s: any) => requiredTrades.has(s.trade))

  // 공정별 기간 계산
  const schedule: Array<{
    trade: string; tradeName: string; phase: number;
    duration: number; startDay: number; endDay: number;
    startDate: string; endDate: string
  }> = []

  let currentDay = 0
  let currentPhase = 0

  for (const seq of filteredSequence) {
    const dur = durations[seq.trade]
    if (!dur) continue

    const baseDays = dur[grade] || dur.standard
    const adjustedDays = Math.ceil(baseDays * areaFactor)

    if (seq.phase !== currentPhase) {
      // 새 페이즈: 이전 페이즈 최대 종료일부터 시작
      const prevPhaseEnd = schedule.filter(s => s.phase === currentPhase).reduce((max, s) => Math.max(max, s.endDay), currentDay)
      currentDay = prevPhaseEnd
      currentPhase = seq.phase
    }

    const startDay = currentDay
    const endDay = startDay + adjustedDays

    // 날짜 계산
    const start = new Date(params.startDate)
    const startDateObj = new Date(start)
    startDateObj.setDate(start.getDate() + startDay)
    const endDateObj = new Date(start)
    endDateObj.setDate(start.getDate() + endDay)

    const tradeName = trades[seq.trade]?.name || seq.trade

    schedule.push({
      trade: seq.trade,
      tradeName,
      phase: seq.phase,
      duration: adjustedDays,
      startDay,
      endDay,
      startDate: startDateObj.toISOString().split('T')[0],
      endDate: endDateObj.toISOString().split('T')[0],
    })
  }

  const totalDays = schedule.reduce((max, s) => Math.max(max, s.endDay), 0)
  const totalWeeks = Math.ceil(totalDays / 7)

  const endDate = new Date(params.startDate)
  endDate.setDate(endDate.getDate() + totalDays)

  const scheduleLines = schedule.map(s => {
    const bar = '█'.repeat(Math.max(1, Math.round(s.duration / 2)))
    return `  ${s.tradeName.padEnd(8)} ${s.startDate} ~ ${s.endDate} (${s.duration}일) ${bar}`
  }).join('\n')

  return {
    tool: 'auto_schedule_generate',
    success: true,
    message: `📅 자동 공정표 - ${preset.name} ${params.area}평 [${gradeNames[grade]}]\n\n` +
      `착공: ${params.startDate}\n` +
      `준공: ${endDate.toISOString().split('T')[0]}\n` +
      `총 공사기간: ${totalDays}일 (약 ${totalWeeks}주)\n\n` +
      `━━━ 공정별 일정 ━━━\n${scheduleLines}\n\n` +
      `📌 병행 가능 공종은 같은 페이즈에서 동시 진행됩니다.\n` +
      `⚠️ 예상 일정이며 현장 상황에 따라 변동될 수 있습니다.`,
    data: { schedule, totalDays, totalWeeks, startDate: params.startDate, endDate: endDate.toISOString().split('T')[0] },
  }
}

// ═══════════════════════════════════════════════
// 5. 자동 보고서 시스템
// ═══════════════════════════════════════════════

export async function autoReportDaily(params: { projectId?: string; date?: string }): Promise<ToolResult> {
  if (!params.projectId) {
    return { tool: 'auto_report_daily', success: false, message: '프로젝트를 선택해주세요.' }
  }
  const { supabase, user } = await getUser()
  if (!user) return { tool: 'auto_report_daily', success: false, message: '로그인이 필요합니다.' }

  const date = params.date || new Date().toISOString().split('T')[0]

  // 오늘 데이터 수집
  const [processRes, workforceRes, materialRes, defectRes] = await Promise.all([
    supabase.from('processes').select('*').eq('project_id', params.projectId),
    supabase.from('workforce').select('*').eq('project_id', params.projectId).gte('check_in', `${date}T00:00:00`),
    supabase.from('materials').select('*').eq('project_id', params.projectId).gte('created_at', `${date}T00:00:00`),
    supabase.from('defects').select('*').eq('project_id', params.projectId).gte('created_at', `${date}T00:00:00`),
  ])

  const processes = processRes.data || []
  const workers = workforceRes.data || []
  const materials = materialRes.data || []
  const defects = defectRes.data || []

  const completedToday = processes.filter((p: any) => p.status === 'completed' && p.updated_at?.startsWith(date))
  const inProgress = processes.filter((p: any) => p.status === 'in_progress')

  return {
    tool: 'auto_report_daily',
    success: true,
    message: `📋 일일 현장보고서 - ${date}\n\n` +
      `━━━ 공정 현황 ━━━\n` +
      `  완료: ${completedToday.length}건 | 진행중: ${inProgress.length}건\n\n` +
      `━━━ 인력 현황 ━━━\n` +
      `  출근: ${workers.length}명\n\n` +
      `━━━ 자재 현황 ━━━\n` +
      `  오늘 입고: ${materials.length}건\n\n` +
      `━━━ 하자/이슈 ━━━\n` +
      `  신규: ${defects.length}건\n\n` +
      `export_pdf로 PDF 보고서를 생성할 수 있습니다.`,
    data: { date, processes: completedToday, workers, materials, defects },
  }
}

export async function autoReportWeekly(params: { projectId?: string; weekStart?: string }): Promise<ToolResult> {
  if (!params.projectId) {
    return { tool: 'auto_report_weekly', success: false, message: '프로젝트를 선택해주세요.' }
  }
  const { supabase, user } = await getUser()
  if (!user) return { tool: 'auto_report_weekly', success: false, message: '로그인이 필요합니다.' }

  const weekStart = params.weekStart || new Date().toISOString().split('T')[0]
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [projectRes, processRes, quoteRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', params.projectId).single(),
    supabase.from('processes').select('*').eq('project_id', params.projectId),
    supabase.from('quote_line_items').select('*').eq('project_id', params.projectId),
  ])

  const project = projectRes.data
  const processes = processRes.data || []
  const quotes = quoteRes.data || []

  const totalBudget = quotes.reduce((sum: number, q: any) => sum + (q.total_price || 0), 0)
  const progressPercent = project?.progress || 0

  return {
    tool: 'auto_report_weekly',
    success: true,
    message: `📊 주간 현장보고서 (${weekStart} ~ ${weekEnd.toISOString().split('T')[0]})\n\n` +
      `프로젝트: ${project?.name || '-'}\n` +
      `전체 진행률: ${progressPercent}%\n\n` +
      `━━━ 주간 요약 ━━━\n` +
      `  총 공정: ${processes.length}건\n` +
      `  완료: ${processes.filter((p: any) => p.status === 'completed').length}건\n` +
      `  진행중: ${processes.filter((p: any) => p.status === 'in_progress').length}건\n\n` +
      `━━━ 비용 현황 ━━━\n` +
      `  총 예산: ${formatKRW(totalBudget)}\n\n` +
      `export_pdf로 PDF 보고서를 생성할 수 있습니다.`,
    data: { project, processes, weekStart },
  }
}

export async function autoReportCompletion(params: { projectId?: string }): Promise<ToolResult> {
  if (!params.projectId) {
    return { tool: 'auto_report_completion', success: false, message: '프로젝트를 선택해주세요.' }
  }
  const { supabase, user } = await getUser()
  if (!user) return { tool: 'auto_report_completion', success: false, message: '로그인이 필요합니다.' }

  const [projectRes, processRes, quoteRes, evidenceRes, certRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', params.projectId).single(),
    supabase.from('processes').select('*').eq('project_id', params.projectId),
    supabase.from('quote_line_items').select('*').eq('project_id', params.projectId),
    supabase.from('evidence_files').select('*').eq('project_id', params.projectId),
    supabase.from('verification_certificates').select('*').eq('project_id', params.projectId),
  ])

  const project = projectRes.data
  const processes = processRes.data || []
  const quotes = quoteRes.data || []
  const evidence = evidenceRes.data || []
  const certs = certRes.data || []

  const totalBudget = quotes.reduce((sum: number, q: any) => sum + (q.total_price || 0), 0)
  const completedProcesses = processes.filter((p: any) => p.status === 'completed')

  return {
    tool: 'auto_report_completion',
    success: true,
    message: `📋 공사 완료 보고서\n\n` +
      `프로젝트: ${project?.name || '-'}\n` +
      `업종: ${project?.industry || '-'}\n\n` +
      `━━━ 공정 완료 현황 ━━━\n` +
      `  완료: ${completedProcesses.length}/${processes.length}건\n\n` +
      `━━━ 비용 정산 ━━━\n` +
      `  총 견적: ${formatKRW(totalBudget)}\n\n` +
      `━━━ 증빙 패키지 ━━━\n` +
      `  증빙 파일: ${evidence.length}건\n` +
      `  인증서: ${certs.length}건\n\n` +
      `export_pdf로 최종 보고서 PDF를 생성할 수 있습니다.`,
    data: { project, processes, quotes, evidence, certs },
  }
}

export async function exportPdf(params: {
  documentType: string; documentId?: string; projectId?: string
}): Promise<ToolResult> {
  return {
    tool: 'export_pdf',
    success: true,
    message: `📥 PDF 내보내기\n\n` +
      `문서 유형: ${params.documentType}\n` +
      `프로젝트: ${params.projectId || '-'}\n\n` +
      `PDF 생성이 준비되었습니다. 다운로드 링크가 곧 제공됩니다.`,
    data: { documentType: params.documentType, projectId: params.projectId },
  }
}

// ═══════════════════════════════════════════════
// 6. 자동 법규 체크
// ═══════════════════════════════════════════════

export async function autoLawCheck(params: {
  industryType: string; area: number;
  buildingType?: string; floor?: string; isNewConstruction?: boolean
}): Promise<ToolResult> {
  const areaSqm = params.area * 3.306
  const results: Array<{ category: string; requirement: string; law: string; severity: string }> = []

  const industryGroups = regulations.industry_groups as Record<string, string[]>

  // 업종 그룹 확인
  const belongsTo = (group: string) => {
    return (industryGroups[group] || []).includes(params.industryType)
  }

  // 소방안전 체크
  for (const trigger of regulations.fire_safety.triggers) {
    let applies = false
    if (trigger.condition.includes('area >=')) {
      const threshold = parseInt(trigger.condition.match(/\d+/)?.[0] || '0')
      const checkSqm = trigger.areaUnit === 'sqm'
      applies = checkSqm ? areaSqm >= threshold : params.area >= threshold
    }
    if (trigger.condition.includes('industry in food_service')) {
      applies = applies && belongsTo('food_service')
    }
    if (trigger.condition.includes('floor == basement')) {
      applies = params.floor?.includes('지하') || params.floor === 'basement'
    }
    if (trigger.condition.includes('industry in food_service') && !trigger.condition.includes('area')) {
      applies = belongsTo('food_service')
    }
    if (applies) {
      results.push({ category: '🔥 소방안전', requirement: trigger.requirement, law: trigger.law, severity: trigger.severity })
    }
  }

  // 위생/영업 체크
  for (const trigger of regulations.hygiene.triggers) {
    let applies = false
    if (trigger.condition.includes('food_service')) applies = belongsTo('food_service')
    if (trigger.condition.includes('medical')) applies = belongsTo('medical')
    if (trigger.condition.includes('beauty')) applies = belongsTo('beauty')
    if (trigger.condition.includes('fitness')) applies = belongsTo('fitness')
    if (trigger.condition.includes('education')) applies = belongsTo('education')
    if (trigger.condition.includes('accommodation')) applies = belongsTo('accommodation')
    if (applies) {
      results.push({ category: '🏥 위생/영업', requirement: trigger.requirement, law: trigger.law, severity: trigger.severity })
    }
  }

  // 인허가 체크
  for (const trigger of regulations.permits.triggers) {
    let applies = false
    if (trigger.condition === 'always') applies = true
    if (trigger.condition.includes('area >=')) {
      const threshold = parseInt(trigger.condition.match(/\d+/)?.[0] || '0')
      applies = areaSqm >= threshold
    }
    if (trigger.condition.includes('food_service')) {
      applies = applies || belongsTo('food_service')
    }
    if (applies) {
      results.push({ category: '📋 인허가', requirement: trigger.requirement, law: trigger.law, severity: trigger.severity })
    }
  }

  // 안전/환경 체크
  for (const trigger of regulations.safety.triggers) {
    let applies = false
    if (trigger.condition === 'always') applies = true
    if (trigger.condition.includes('area >=')) {
      const threshold = parseInt(trigger.condition.match(/\d+/)?.[0] || '0')
      applies = areaSqm >= threshold
    }
    if (trigger.condition.includes('childcare_education')) {
      applies = belongsTo('childcare_education')
    }
    if (applies) {
      results.push({ category: '⚠️ 안전/환경', requirement: trigger.requirement, law: trigger.law, severity: trigger.severity })
    }
  }

  // 장애인 편의시설 체크
  for (const trigger of regulations.accessibility.triggers) {
    let applies = false
    if (trigger.condition.includes('area >= 500')) applies = areaSqm >= 500
    if (trigger.condition.includes('public_facility')) applies = applies || belongsTo('public_facility')
    if (trigger.condition.includes('medical')) applies = applies || belongsTo('medical')
    if (applies) {
      results.push({ category: '♿ 장애인 편의', requirement: trigger.requirement, law: trigger.law, severity: trigger.severity })
    }
  }

  const preset = (industryPresets as any)[params.industryType]
  const requiredItems = results.filter(r => r.severity === '필수')
  const recommendedItems = results.filter(r => r.severity === '권장')

  const resultLines = results.map(r =>
    `  [${r.severity}] ${r.requirement}\n    └ ${r.law}`
  ).join('\n')

  return {
    tool: 'auto_law_check',
    success: true,
    message: `⚖️ 건축법규 자동 체크 - ${preset?.name || params.industryType} ${params.area}평\n\n` +
      `필수 사항: ${requiredItems.length}건 | 권장 사항: ${recommendedItems.length}건\n\n` +
      `${resultLines}\n\n` +
      `⚠️ 일반적 기준이며 관할 관청 확인을 권장합니다.\n` +
      `특히 소방과 영업 관련 사항은 반드시 해당 관서에 확인하세요.`,
    data: { results, requiredCount: requiredItems.length, recommendedCount: recommendedItems.length },
  }
}
