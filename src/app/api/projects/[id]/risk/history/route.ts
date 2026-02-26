/**
 * GET /api/projects/:id/risk/history
 * 리스크 점수 이력 조회
 *
 * Query params:
 *   from: 시작일 (ISO date, 예: 2026-01-01)
 *   to:   종료일 (ISO date, 예: 2026-02-26)
 *   limit: 최대 개수 (기본 30)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const from  = searchParams.get('from')
    const to    = searchParams.get('to')
    const limit = Math.min(Number(searchParams.get('limit') || 30), 100)

    let query = supabase
      .from('risk_scores')
      .select('id, score, grade, fp_score, oc_score, ch_score, calculated_at')
      .eq('project_id', params.id)
      .order('calculated_at', { ascending: true })
      .limit(limit)

    if (from) query = query.gte('calculated_at', from)
    if (to)   query = query.lte('calculated_at', to + 'T23:59:59Z')

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
      meta: { count: data?.length || 0, from, to },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
