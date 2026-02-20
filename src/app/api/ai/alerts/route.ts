/**
 * GET /api/ai/alerts?projectId=xxx
 * 프로젝트 AI 알림 목록 조회
 *
 * Response: Alert[]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { collectAlertContext, analyzeProjectAlerts } from '@/lib/ai/alert-engine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId가 필요합니다.' }, { status: 400 })
    }

    const supabase = createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 알림 컨텍스트 수집
    const ctx = await collectAlertContext(projectId, supabase)
    if (!ctx) {
      return NextResponse.json({ alerts: [] })
    }

    // 알림 분석
    const alerts = await analyzeProjectAlerts(ctx)

    return NextResponse.json({ alerts })
  } catch (err: any) {
    console.error('[API /ai/alerts] 오류:', err)
    return NextResponse.json(
      { error: '알림 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
