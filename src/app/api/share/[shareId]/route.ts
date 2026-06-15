/**
 * GET /api/share/[shareId]
 * Public share data projection via service-role.
 * Returns allowlisted fields only. No broad anon SELECT required.
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: { shareId: string } }
) {
  try {
    const supabase = createAdminClient()

    // 1. Look up share by token — named columns only
    const { data: shareLink, error: shareError } = await supabase
      .from('shares')
      .select('id, project_id, share_token, expires_at, created_at, is_active, view_count')
      .eq('share_token', params.shareId)
      .single()

    if (shareError || !shareLink) {
      return NextResponse.json(
        { error: '유효하지 않은 공유 링크입니다.' },
        { status: 404 }
      )
    }

    // 2. Check expiry
    if (new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '만료된 공유 링크입니다.' },
        { status: 410 }
      )
    }

    // 3. Check active status if field exists
    if (shareLink.is_active === false) {
      return NextResponse.json(
        { error: '비활성화된 공유 링크입니다.' },
        { status: 410 }
      )
    }

    // 4. Increment view_count
    if (shareLink.view_count !== undefined) {
      await supabase
        .from('shares')
        .update({ view_count: (shareLink.view_count || 0) + 1 })
        .eq('id', shareLink.id)
    }

    // 5. Fetch project — allowlisted columns only
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('id, name, industry, risk_score, progress, status, start_date, end_date, created_at')
      .eq('id', shareLink.project_id)
      .single()

    if (projError || !project) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 6. Parallel fetch — named columns only
    const [processesRes, quoteRes, changeRes, diagnosticRes, certRes] = await Promise.all([
      supabase.from('processes')
        .select('id, name, status, progress, start_date, end_date')
        .eq('project_id', project.id)
        .order('order_index'),
      supabase.from('quote_line_items')
        .select('quantity, unit_price')
        .eq('project_id', project.id),
      supabase.from('change_orders')
        .select('amount')
        .eq('project_id', project.id),
      supabase.from('diagnostic_responses')
        .select('checked')
        .eq('project_id', project.id),
      supabase.from('verification_certificates')
        .select('grade, overall_score')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    // 7. Compute aggregates server-side
    const quoteTotal = (quoteRes.data || []).reduce(
      (sum: number, item: { quantity: number; unit_price: number }) =>
        sum + (Number(item.quantity) * Number(item.unit_price)), 0
    )
    const changeTotal = (changeRes.data || []).reduce(
      (sum: number, item: { amount: number }) =>
        sum + (Number(item.amount) || 0), 0
    )
    const diagItems = diagnosticRes.data || []
    const checklistStats = {
      total: diagItems.length,
      completed: diagItems.filter((d: { checked: boolean }) => d.checked).length,
    }

    // 8. Risk grade
    const riskScore = project.risk_score || 0
    let riskGrade = 'A'
    if (riskScore > 80) riskGrade = 'F'
    else if (riskScore > 60) riskGrade = 'D'
    else if (riskScore > 40) riskGrade = 'C'
    else if (riskScore > 20) riskGrade = 'B'

    const certificate = certRes.data
      ? { grade: certRes.data.grade, score: certRes.data.overall_score }
      : null

    // 9. Return allowlisted projection
    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        industry: project.industry || '',
        risk_score: riskScore,
        risk_grade: riskGrade,
        progress: project.progress || 0,
        status: project.status || 'planning',
        start_date: project.start_date,
        end_date: project.end_date,
        created_at: project.created_at,
      },
      shareLink: {
        expires_at: shareLink.expires_at,
        created_at: shareLink.created_at,
      },
      processes: processesRes.data || [],
      quoteTotal,
      changeTotal,
      checklistStats,
      certificate,
    })
  } catch (err: unknown) {
    console.error('[share API]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
