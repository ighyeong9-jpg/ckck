/**
 * POST /api/ai/chat
 * 역할별 AI 채팅 엔드포인트
 *
 * Body: {
 *   message: string
 *   persona: UserPersona
 *   projectId?: string
 *   history?: Array<{ role: 'user'|'assistant', content: string }>
 * }
 * Response: { message: string, sources: Source[], persona: string, model: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { brain } from '@/lib/ai/brain'
import type { UserPersona } from '@/lib/ai/brain'
import { PERSONAS } from '@/lib/ai/personas'
import { loadProjectContext } from '@/app/api/agent/context'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      message,
      persona = 'customer',
      projectId,
      history = [],
    } = body as {
      message: string
      persona?: UserPersona
      projectId?: string
      history?: Array<{ role: string; content: string }>
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    // 페르소나 유효성 확인
    if (!PERSONAS[persona]) {
      return NextResponse.json({ error: '유효하지 않은 역할입니다.' }, { status: 400 })
    }

    // 인증 확인
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 프로젝트 컨텍스트 (선택)
    const projectCtx = projectId ? await loadProjectContext(projectId) : null

    // Brain 호출
    const result = await brain({
      task: 'chat',
      persona,
      context: {
        userMessage: message,
        projectId,
        userId: user.id,
        projectCtx,
        conversationHistory: history.slice(-10),   // 최근 10개
      },
    })

    return NextResponse.json({
      message: result.answer,
      sources: result.sources,
      persona,
      model: result.model,
    })
  } catch (err: any) {
    console.error('[API /ai/chat] 오류:', err)
    return NextResponse.json(
      { error: err?.message || 'AI 응답 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
