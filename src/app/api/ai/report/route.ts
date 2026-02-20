/**
 * POST /api/ai/report
 * 일일 현장 일보 자동 초안 생성
 *
 * Body: { projectId: string, date?: string }
 * Response: DailyReportDraft
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { collectDailyContext, writeDailyReport } from '@/lib/ai/report-writer'

export async function POST(req: NextRequest) {
  try {
    const { projectId, date } = await req.json() as {
      projectId: string
      date?: string
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId가 필요합니다.' }, { status: 400 })
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

    // 오늘 날짜 (기본값)
    const reportDate = date ?? new Date().toISOString().split('T')[0]

    // 컨텍스트 수집
    const ctx = await collectDailyContext(projectId, reportDate, supabase)
    if (!ctx) {
      return NextResponse.json({ error: '현장 데이터를 불러올 수 없습니다.' }, { status: 500 })
    }

    // 일보 초안 생성
    const draft = await writeDailyReport(ctx)

    return NextResponse.json(draft)
  } catch (err: any) {
    console.error('[API /ai/report] 오류:', err)
    return NextResponse.json(
      { error: '일보 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
