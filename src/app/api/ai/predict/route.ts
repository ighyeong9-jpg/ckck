/**
 * POST /api/ai/predict
 * 다음 공종 리스크 예측
 *
 * Body: { projectId: string, completedProcessId: string }
 * Response: RiskPrediction
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { collectPredictionContext, predictNextPhaseRisk } from '@/lib/ai/prediction-engine'

export async function POST(req: NextRequest) {
  try {
    const { projectId, completedProcessId } = await req.json() as {
      projectId: string
      completedProcessId: string
    }

    if (!projectId || !completedProcessId) {
      return NextResponse.json(
        { error: 'projectId와 completedProcessId가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 프로젝트 소유권 확인
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 예측 컨텍스트 수집
    const ctx = await collectPredictionContext(projectId, completedProcessId, supabase)
    if (!ctx) {
      return NextResponse.json({ error: '공정 데이터를 불러올 수 없습니다.' }, { status: 500 })
    }

    // 리스크 예측
    const prediction = await predictNextPhaseRisk(ctx)

    return NextResponse.json(prediction)
  } catch (err: any) {
    console.error('[API /ai/predict] 오류:', err)
    return NextResponse.json(
      { error: '리스크 예측 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
