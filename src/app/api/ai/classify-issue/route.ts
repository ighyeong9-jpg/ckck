/**
 * POST /api/ai/classify-issue
 * 현장 이슈 AI 자동 분류 + DB 저장
 *
 * Body: { projectId, issueText, reporterNote?, photos? }
 * Response: { issueId, classification }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyIssue } from '@/lib/ai/issue-classifier'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, issueText, reporterNote } = body

    if (!issueText || issueText.trim().length < 5) {
      return NextResponse.json({ error: '이슈 내용을 5자 이상 입력해주세요.' }, { status: 400 })
    }

    if (issueText.length > 2000) {
      return NextResponse.json({ error: '이슈 내용은 2000자 이하로 입력해주세요.' }, { status: 400 })
    }

    if (reporterNote && reporterNote.length > 2000) {
      return NextResponse.json({ error: '추가 메모는 2000자 이하로 입력해주세요.' }, { status: 400 })
    }

    // 프로젝트명 조회 (선택)
    let projectName: string | undefined
    if (projectId) {
      const { data: proj } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()
      projectName = proj?.name
    }

    // AI 분류
    const classification = await classifyIssue(issueText, projectName)

    // DB 저장
    const { data: saved, error: dbError } = await supabase
      .from('site_issues')
      .insert({
        project_id: projectId ?? null,
        user_id: user.id,
        issue_text: issueText,
        reporter_note: reporterNote ?? null,
        category: classification.category,
        severity: classification.severity,
        title: classification.title,
        summary: classification.summary,
        recommended_actions: classification.recommended_actions,
        legal_basis: classification.legal_basis ?? null,
        cost_impact: classification.cost_impact ?? null,
        schedule_impact: classification.schedule_impact ?? null,
        requires_approval: classification.requires_approval,
        urgency_hours: classification.urgency_hours,
        status: 'open',
      })
      .select('id')
      .single()

    if (dbError) {
      console.warn('[classify-issue] DB 저장 실패:', dbError.message)
    }

    return NextResponse.json({
      issueId: saved?.id ?? null,
      classification,
    })
  } catch (err: any) {
    console.error('[API /ai/classify-issue] 오류:', err)
    return NextResponse.json(
      { error: '이슈 분류 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
