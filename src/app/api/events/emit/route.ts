/**
 * POST /api/events/emit
 * 클라이언트 → 서버 이벤트 발행 엔드포인트
 *
 * Body: { event: CheckInEvent, projectId: string, data?: Record<string, unknown> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { eventBus, type CheckInEvent, makePayload } from '@/lib/events/event-bus'
import { registerEventHandlers } from '@/lib/events/handlers'

// 핸들러 등록
registerEventHandlers()

// 허용된 이벤트 (클라이언트에서 직접 발행 가능한 것만)
const ALLOWED_CLIENT_EVENTS: CheckInEvent[] = [
  'PHOTO_UPLOADED',
  'CHECKLIST_COMPLETED',
  'PROCESS_COMPLETED',
  'DEADLINE_OVERDUE',
]

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const { event, projectId, data } = body as {
      event: CheckInEvent
      projectId: string
      data?: Record<string, unknown>
    }

    if (!event || !projectId) {
      return NextResponse.json({ error: 'event, projectId 필드가 필요합니다.' }, { status: 400 })
    }

    if (!ALLOWED_CLIENT_EVENTS.includes(event)) {
      return NextResponse.json({ error: '허용되지 않은 이벤트입니다.' }, { status: 403 })
    }

    // 프로젝트 접근 권한 확인
    const { data: project } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 이벤트 발행
    await eventBus.emit(event, makePayload(projectId, {
      ...data,
      projectName: project.name,
    }, user.id))

    return NextResponse.json({ success: true, event, projectId })
  } catch (err: any) {
    console.error('[API /events/emit] 오류:', err)
    return NextResponse.json({ error: '이벤트 발행 실패' }, { status: 500 })
  }
}
