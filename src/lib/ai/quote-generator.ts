/**
 * quote-generator.ts — AI 예산 가이드 Gemini 엔진
 *
 * 공간 유형 + 평수 + 등급 + 일정 → 예산 가이드 JSON 생성
 * 정확한 견적이 아닌 예산 감잡기 도구.
 *
 * 패턴: quote-analyzer.ts와 동일하게 callGemini 직접 호출
 */

import { callGemini } from '@/lib/ai/gemini-provider'
import type { BudgetGuideResult, SpaceType, MaterialGradeOption, ScheduleOption } from './quote-chat'

// ═══════════════════════════════════════════════════════════
// System Prompt
// ═══════════════════════════════════════════════════════════

const BUDGET_GUIDE_SYSTEM_PROMPT = `너는 대한민국 인테리어 예산 전문 AI다.
고객이 예산 감을 잡을 수 있도록 쉽고 친절하게 안내한다.
이건 예산 가이드다. 정확한 견적이 아니다.

반드시 반영:
- 공간 유형별 단가 차이 (상업 = 주거의 1.5~3배)
- 카페: 인허가/소방/주방설비 추가
- 사무실: 네트워크/파티션/조명 특수
- 병원: 위생/의료가스/특수 마감
- 헬스장: 환기/바닥재/락커 특수
- 등급별 3가지 범위 (경제/표준/고급)
- 촉박 일정 할증 (1주: +15%, 2주: +10%)
- 숨겨진 비용 자동 감지 (인허가, 소방, 환기, 설비 등)
- 왜 비싼지/싼지 자동 분석
- 공사 전 확인사항 (체크리스트)
- 금액은 반드시 최소~최대 범위로 (단일 금액 절대 금지)

공간별 평당 단가 기준 (서울 기준):
주거 부분 리모델링: 70~150만원/평
주거 전체 리모델링: 150~300만원/평
카페/음식점: 100~300만원/평
사무실: 80~200만원/평
병원/클리닉: 200~500만원/평
헬스장: 150~350만원/평
상가/매장: 100~200만원/평
오피스텔/원룸: 80~150만원/평

반드시 JSON만 반환. 설명 텍스트 없이.`

// ═══════════════════════════════════════════════════════════
// 예산 가이드 생성
// ═══════════════════════════════════════════════════════════

export async function generateBudgetGuide(
  spaceType: SpaceType,
  areaPyeong: number,
  grade: MaterialGradeOption,
  schedule: ScheduleOption,
): Promise<BudgetGuideResult> {
  const scheduleNote = schedule.surchargeRate > 0
    ? ` 공사 기간이 촉박해 ${Math.round(schedule.surchargeRate * 100)}% 할증이 적용됩니다.`
    : ''

  const prompt = `
공간: ${spaceType.label} (${spaceType.category === 'commercial' ? '상업공간' : '주거공간'})
면적: ${areaPyeong}평
선호 자재 등급: ${grade.label} (${grade.description})
공사 일정: ${schedule.label}${scheduleNote}

위 조건으로 예산 가이드를 작성해주세요.

다음 JSON 형식으로만 반환하세요:
{
  "summary": "한줄요약 (예: 30평 카페 인테리어 예산은 3,600~7,500만원 수준이에요)",
  "grades": {
    "economy": {
      "label": "경제형",
      "min": 숫자(만원 단위),
      "max": 숫자(만원 단위),
      "per_pyeong": "X~Y만원/평",
      "good_for": "어떤 상황에 좋은지 한 줄",
      "risks": ["주의사항 1", "주의사항 2"]
    },
    "standard": {
      "label": "표준형",
      "min": 숫자,
      "max": 숫자,
      "per_pyeong": "X~Y만원/평",
      "good_for": "어떤 상황에 좋은지 한 줄",
      "risks": []
    },
    "premium": {
      "label": "고급형",
      "min": 숫자,
      "max": 숫자,
      "per_pyeong": "X~Y만원/평",
      "good_for": "어떤 상황에 좋은지 한 줄",
      "risks": []
    }
  },
  "hidden_costs": ["항목명: 금액 범위", ...],
  "why_expensive": ["이유1", "이유2", ...],
  "why_cheap_risks": ["리스크1", "리스크2", ...],
  "checklist": ["확인사항1", "확인사항2", ...],
  "disclaimer": "실측 없이 작성한 참고용 예산 범위입니다."
}
`.trim()

  const result = await callGemini(
    prompt,
    null,
    undefined,
    undefined,
  )

  // JSON 파싱
  const text = result.message
  const jsonMatch = text.match(/\{[\s\S]+\}/)
  if (!jsonMatch) {
    throw new Error('AI 응답에서 JSON을 파싱할 수 없습니다.')
  }

  const parsed = JSON.parse(jsonMatch[0])

  return {
    ...parsed,
    space_type: spaceType.id,
    area_pyeong: areaPyeong,
    grade: grade.id,
    schedule: schedule.id,
    generated_at: new Date().toISOString(),
  } as BudgetGuideResult
}

// ═══════════════════════════════════════════════════════════
// 금액 포맷
// ═══════════════════════════════════════════════════════════

export function formatAmount(amountInMan: number): string {
  if (amountInMan >= 10000) {
    const eok = Math.floor(amountInMan / 10000)
    const man = amountInMan % 10000
    if (man === 0) return `${eok}억원`
    return `${eok}억 ${man.toLocaleString()}만원`
  }
  return `${amountInMan.toLocaleString()}만원`
}

export function formatRange(min: number, max: number): string {
  return `${formatAmount(min)} ~ ${formatAmount(max)}`
}
