/**
 * POST /api/ai/budget-guide
 * AI 예산 가이드 생성
 *
 * Body: { spaceType, areaPyeong, grade, schedule }
 * Response: BudgetGuideResult
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBudgetGuide } from '@/lib/ai/quote-generator'
import { SPACE_TYPES, MATERIAL_GRADES, SCHEDULE_OPTIONS } from '@/lib/ai/quote-chat'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const { spaceTypeId, areaPyeong, gradeId, scheduleId } = body

    // 유효성 검사
    const spaceType = SPACE_TYPES.find(s => s.id === spaceTypeId)
    const grade = MATERIAL_GRADES.find(g => g.id === gradeId)
    const schedule = SCHEDULE_OPTIONS.find(s => s.id === scheduleId)

    if (!spaceType || !grade || !schedule) {
      return NextResponse.json({ error: '잘못된 요청 파라미터입니다.' }, { status: 400 })
    }

    if (!areaPyeong || areaPyeong < 1 || areaPyeong > 10000) {
      return NextResponse.json({ error: '면적을 올바르게 입력해주세요.' }, { status: 400 })
    }

    // AI 예산 가이드 생성
    const result = await generateBudgetGuide(spaceType, areaPyeong, grade, schedule)

    // DB 저장 (비동기 fire-and-forget)
    supabase
      .from('quote_analyses')
      .insert({
        project_id: null,  // 독립형 예산 가이드 (프로젝트 없음)
        space_type: spaceType.id,
        space_detail: spaceType.label,
        area_pyeong: areaPyeong,
        grade_economy: result.grades.economy,
        grade_standard: result.grades.standard,
        grade_premium: result.grades.premium,
        why_expensive: result.why_expensive,
        why_cheap_risks: result.why_cheap_risks,
        hidden_costs: result.hidden_costs,
        checklist: result.checklist,
        is_budget_guide: true,
        ai_comment: result.summary,
      })
      .then(({ error }) => {
        if (error) console.warn('[budget-guide] DB 저장 실패:', error.message)
      })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[API /ai/budget-guide] 오류:', err)
    return NextResponse.json(
      { error: 'AI 예산 가이드 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
