/**
 * GET /api/projects/:id/risk
 * 최신 리스크 점수 조회
 *
 * GET /api/projects/:id/risk?go_nogo=true
 * GO/NO-GO 판정 포함 조회
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGoNoGo } from '@/lib/engines/riskEngine'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const includeGoNoGo = searchParams.get('go_nogo') === 'true'

    // 최신 리스크 점수 (risk_scores 테이블)
    const { data: latest } = await supabase
      .from('risk_scores')
      .select('*')
      .eq('project_id', params.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single()

    // risk_scores 이력이 없으면 projects.risk_score 사용
    if (!latest) {
      const { data: project } = await supabase
        .from('projects')
        .select('risk_score')
        .eq('id', params.id)
        .single()

      return NextResponse.json({
        success: true,
        data: {
          score: project?.risk_score || 0,
          grade: 'safe',
          source: 'projects_table',
        },
      })
    }

    const responseData: Record<string, unknown> = { ...latest }

    if (includeGoNoGo) {
      responseData.go_nogo_result = await getGoNoGo(params.id)
    }

    return NextResponse.json({ success: true, data: responseData })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
