/**
 * GET /api/projects/:id/law-checks
 * 최신 법령 체크 결과 목록 조회
 *
 * Query params:
 *   latest: true → 법령별 최신 결과 1개씩 (기본값)
 *   status: compliant|violated|not_applicable|pending → 필터
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
    const statusFilter = searchParams.get('status')

    // 최신 체크 결과: law_id별 최근 1건 (checked_at DESC)
    let query = supabase
      .from('law_checks')
      .select(`
        id,
        status,
        go_nogo,
        details,
        checked_at,
        checked_by,
        laws (
          id,
          code,
          name,
          article,
          title,
          description,
          violation_action,
          risk_weight,
          category
        )
      `)
      .eq('project_id', params.id)
      .order('checked_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) throw error

    // law_id별 최신 1건만 추출
    const latestByLaw = new Map<string, typeof data[0]>()
    for (const row of data || []) {
      const laws = row.laws as unknown as { id: string } | { id: string }[] | null
      const lawId = Array.isArray(laws) ? laws[0]?.id : laws?.id
      if (lawId && !latestByLaw.has(lawId)) {
        latestByLaw.set(lawId, row)
      }
    }

    const results = Array.from(latestByLaw.values())

    const summary = {
      total: results.length,
      compliant: results.filter(r => r.status === 'compliant').length,
      violated: results.filter(r => r.status === 'violated').length,
      not_applicable: results.filter(r => r.status === 'not_applicable').length,
      pending: results.filter(r => r.status === 'pending').length,
    }

    return NextResponse.json({ success: true, data: results, summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
