/**
 * POST /api/ai/quote-analyze
 * 견적서 AI 과다청구 분석 엔드포인트
 *
 * Body: { projectId: string }
 * Response: QuoteAnalysisResult (overcharge_items, undercharge_items, overall_risk, ai_comment)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { brain } from '@/lib/ai/brain'
import type { QuoteAnalysisResult } from '@/lib/ai/quote-analyzer'

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json() as { projectId?: string }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId가 필요합니다.' }, { status: 400 })
    }

    // 인증 확인
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 프로젝트 소유권 확인
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: '프로젝트 접근 권한이 없습니다.' }, { status: 403 })
    }

    // brain을 통해 견적 분석 실행
    const brainResult = await brain({
      task: 'quote-analyze',
      context: {
        projectId,
        userId: user.id,
      },
    })

    // brain.answer는 JSON 문자열 — 파싱 후 반환
    const analysis: QuoteAnalysisResult = JSON.parse(brainResult.answer)

    return NextResponse.json({ analysis })
  } catch (err: any) {
    console.error('[API /ai/quote-analyze] 오류:', err)
    return NextResponse.json(
      { error: err?.message || '견적 분석 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
