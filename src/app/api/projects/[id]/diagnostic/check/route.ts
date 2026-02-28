/**
 * POST /api/projects/:id/diagnostic/check
 * 체크리스트 항목 체크 → cascade 트리거
 *
 * 통합 플로우:
 *   1. diagnostic_responses UPSERT
 *   2. projects.progress 업데이트
 *   3. 리스크 점수 재계산 (riskEngine)
 *
 * Body: { question_id, checked, category?, risk_factor? }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAndSaveRiskScore } from '@/lib/engines/riskEngine'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { question_id, checked, category = '', risk_factor = 'Ch' } = body

    if (!question_id || typeof checked !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'question_id와 checked(boolean)는 필수입니다.' },
        { status: 400 }
      )
    }

    // 1. diagnostic_responses UPSERT
    const { error: upsertError } = await supabase
      .from('diagnostic_responses')
      .upsert(
        {
          project_id: params.id,
          question_id,
          item_id: question_id,
          category,
          checked,
          risk_factor,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,question_id' }
      )

    if (upsertError) throw upsertError

    // 2. projects.progress 업데이트
    const { data: allResponses } = await supabase
      .from('diagnostic_responses')
      .select('checked')
      .eq('project_id', params.id)

    if (allResponses && allResponses.length > 0) {
      const done = allResponses.filter(r => r.checked).length
      const progress = Math.round((done / allResponses.length) * 100)
      await supabase
        .from('projects')
        .update({ progress })
        .eq('id', params.id)
    }

    // 3. 리스크 점수 재계산
    const riskResult = await calculateAndSaveRiskScore(params.id)

    return NextResponse.json({
      success: true,
      data: {
        question_id,
        checked,
        risk_score: riskResult.score,
        risk_grade: riskResult.grade,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
