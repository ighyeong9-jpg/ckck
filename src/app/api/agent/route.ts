/**
 * POST /api/agent
 * AI Agent "체키" API 엔드포인트
 *
 * 우선순위:
 * 1. GEMINI_API_KEY → Gemini (2.5-flash → 2.0-flash 자동 폴백)
 * 2. ANTHROPIC_API_KEY → Claude (나중에 구현)
 * 3. 둘 다 없음 → Mock 모드 (키워드 기반 도구 실행)
 *
 * Gemini 할당량 초과(429) → 다음 모델로 자동 전환
 * 모든 모델 실패 시 → Mock 모드로 폴백
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadProjectContext } from './context'
import { routeMessage } from './mockRouter'
import { callGemini } from '@/lib/ai/gemini-provider'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, projectId, pageContext, image } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '메시지가 필요합니다.' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    const userMessage = typeof lastMessage === 'string'
      ? lastMessage
      : lastMessage?.content || ''

    // 프로젝트 컨텍스트 로드
    const ctx = projectId ? await loadProjectContext(projectId) : null

    // ── 1순위: Gemini API ──
    if (process.env.GEMINI_API_KEY) {
      try {
        // 대화 히스토리 구성 (최근 10개만)
        const history = messages.slice(0, -1).map((msg: any) => ({
          role: typeof msg === 'string' ? 'user' : (msg.role || 'user'),
          content: typeof msg === 'string' ? msg : (msg.content || ''),
        })).slice(-10)

        const result = await callGemini(userMessage, ctx, history, image || undefined)

        return NextResponse.json({
          success: true,
          message: result.message,
          tool: result.tool || null,
          toolSuccess: result.toolSuccess || false,
          data: result.data || null,
          provider: 'gemini',
        })
      } catch (geminiError: any) {
        // Gemini 실패 시 Mock으로 폴백
        console.error('Gemini API 오류, Mock 모드로 폴백:', geminiError?.message)
        const fallbackResult = await routeMessage(userMessage, ctx)

        return NextResponse.json({
          success: true,
          message: fallbackResult.message,
          tool: fallbackResult.tool,
          toolSuccess: fallbackResult.success,
          data: fallbackResult.data || null,
          provider: 'mock (gemini 폴백)',
        })
      }
    }

    // ── 2순위: Claude API (나중에 구현) ──
    if (process.env.ANTHROPIC_API_KEY) {
      // TODO: Claude API 연동
      // 지금은 Mock과 동일하게 처리
    }

    // ── 3순위: Mock 모드 (키워드 기반) ──
    const result = await routeMessage(userMessage, ctx)

    return NextResponse.json({
      success: true,
      message: result.message,
      tool: result.tool,
      toolSuccess: result.success,
      data: result.data || null,
      provider: 'mock',
    })
  } catch (error: any) {
    console.error('Agent API 오류:', error)
    return NextResponse.json(
      { success: false, message: `오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
