/**
 * POST /api/agent
 * AI Agent "체크인" API 엔드포인트
 *
 * 우선순위:
 * 1. GEMINI_API_KEY → Gemini (2.5-flash 자동 폴백)
 * 2. ANTHROPIC_API_KEY → Claude Haiku (Gemini 실패 시)
 * 3. 둘 다 없거나 실패 시 → Mock 모드 (키워드 기반 도구 실행)
 *
 * Gemini 할당량 초과(429) → Claude로 자동 전환
 * Claude 실패 시 → Mock 모드로 폴백
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadProjectContext } from './context'
import { routeMessage } from './mockRouter'
import { callGemini } from '@/lib/ai/gemini-provider'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { messages, projectId, pageContext, image } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '메시지가 필요합니다.' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    const userMessage = typeof lastMessage === 'string'
      ? lastMessage
      : lastMessage?.content || ''

    if (userMessage.length > 2000) {
      return NextResponse.json({ error: '메시지는 2000자 이하로 입력해주세요.' }, { status: 400 })
    }

    // 프로젝트 컨텍스트 로드
    // projectId 없으면 사용자의 가장 최근 진행 중 프로젝트를 자동 선택 (체크인 자율 실행 지원)
    let resolvedProjectId = projectId
    if (!resolvedProjectId) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (projects && projects.length > 0) {
        // 우선순위: 1) 진행중(in_progress) 중 최신 2) 전체 중 최신
        const inProgress = projects.filter((p: any) => p.status === 'in_progress')
        resolvedProjectId = inProgress.length > 0 ? inProgress[0].id : projects[0].id
      }
    }

    const ctx = resolvedProjectId ? await loadProjectContext(resolvedProjectId) : null

    // 대화 히스토리 구성 (최근 10개만) — Gemini/Claude 공용
    const msgHistory = messages.slice(0, -1).map((msg: any) => ({
      role: typeof msg === 'string' ? 'user' : (msg.role || 'user'),
      content: typeof msg === 'string' ? msg : (msg.content || ''),
    })).slice(-10)

    // ── 1순위: Gemini API ──
    if (process.env.GEMINI_API_KEY) {
      try {
        const result = await callGemini(userMessage, ctx, msgHistory, image || undefined)

        return NextResponse.json({
          success: true,
          message: result.message,
          tool: result.tool || null,
          toolSuccess: result.toolSuccess || false,
          data: result.data || null,
          provider: 'gemini',
        })
      } catch (geminiError: any) {
        // Gemini 실패 → Claude로 폴백
        console.error('Gemini API 오류, Claude로 폴백:', geminiError?.message)
      }
    }

    // ── 2순위: Claude API ──
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        // 프로젝트 컨텍스트 포함 시스템 프롬프트 구성
        let systemPrompt = `당신은 체크인(Check-In), 인테리어/건설 현장 전문 AI 비서입니다.
한국어로 답변하고 친근하고 전문적인 어조를 유지하세요.
인테리어/건설 관련 질문에 정확하고 실용적으로 답변하세요.
프로젝트 관리, 견적, 공정, 인력, 자재, 리스크 분석 등을 도와드립니다.`

        if (ctx?.project) {
          const p = ctx.project
          systemPrompt += `\n\n=== 현재 프로젝트 ===
프로젝트명: ${p.name}
업종: ${p.industry || '미지정'}
상태: ${p.status === 'in_progress' ? '진행 중' : p.status === 'completed' ? '완료' : p.status || '진행 중'}
시작일: ${p.start_date || '미정'} / 완공예정: ${p.end_date || '미정'}`

          if (ctx.quoteItems?.length) systemPrompt += `\n견적 항목: ${ctx.quoteItems.length}개`
          if (ctx.processes?.length) systemPrompt += `\n공정: 총 ${ctx.processes.length}개`
          if (ctx.workforce?.length) systemPrompt += `\n인력: ${ctx.workforce.length}명`
          if (ctx.materials?.length) systemPrompt += `\n자재: ${ctx.materials.length}종`
          if (ctx.changeOrders?.length) systemPrompt += `\n변경 주문: ${ctx.changeOrders.length}건`

          systemPrompt += `\n\n위 프로젝트 컨텍스트를 바탕으로 답변하세요. 프로젝트 ID를 사용자에게 묻지 마세요.`
        } else {
          systemPrompt += `\n\n현재 열려 있는 프로젝트가 없습니다. 일반 인테리어/건설 상담을 해드리세요.`
        }

        // 대화 히스토리 → Claude 메시지 형식 (user로 시작해야 함)
        const claudeMessages: any[] = []
        for (const h of msgHistory) {
          claudeMessages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })
        }

        // 마지막 사용자 메시지 (이미지 포함 시 vision 형식)
        if (image?.base64) {
          claudeMessages.push({
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: image.mimeType || 'image/jpeg', data: image.base64 } },
              { type: 'text', text: userMessage },
            ],
          })
        } else {
          claudeMessages.push({ role: 'user', content: userMessage })
        }

        const claudeBody = JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: systemPrompt,
          messages: claudeMessages,
        })

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: claudeBody,
        })

        if (!claudeRes.ok) throw new Error(`Claude HTTP ${claudeRes.status}`)

        const claudeData = await claudeRes.json()
        const claudeText = claudeData.content?.[0]?.text ?? ''

        return NextResponse.json({
          success: true,
          message: claudeText,
          tool: null,
          toolSuccess: false,
          data: null,
          provider: 'claude',
        })
      } catch (claudeError: any) {
        console.error('Claude API 오류, Mock 모드로 폴백:', claudeError?.message)
      }
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
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
