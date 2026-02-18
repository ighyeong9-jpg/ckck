/**
 * POST /api/agent
 * AI Agent "체키" API 엔드포인트
 * - ANTHROPIC_API_KEY 있으면 → 실제 Claude API (나중에)
 * - 없으면 → Mock 모드 (키워드 기반 도구 실행)
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadProjectContext } from './context'
import { routeMessage } from './mockRouter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, projectId, pageContext } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '메시지가 필요합니다.' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    const userMessage = typeof lastMessage === 'string'
      ? lastMessage
      : lastMessage?.content || ''

    // 실제 Claude API 모드 (나중에 구현)
    if (process.env.ANTHROPIC_API_KEY) {
      // TODO: 실제 Claude API 호출
      // const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      // const response = await anthropic.messages.create({ ... })
      // 지금은 Mock과 동일하게 처리
    }

    // Mock 모드: 키워드 기반 도구 실행
    const ctx = projectId ? await loadProjectContext(projectId) : null
    const result = await routeMessage(userMessage, ctx)

    return NextResponse.json({
      success: true,
      message: result.message,
      tool: result.tool,
      toolSuccess: result.success,
      data: result.data || null,
    })
  } catch (error: any) {
    console.error('Agent API error:', error)
    return NextResponse.json(
      { success: false, message: `오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
