/**
 * AI Brain — 중앙 AI 라우터
 *
 * 모든 AI 호출은 이 파일을 통한다.
 * 직접 Gemini/Claude를 import하지 말 것.
 *
 * 폴백 체인: Gemini 2.5 Flash → Claude Sonnet (ANTHROPIC_API_KEY 필요)
 */

import { callGemini } from '@/lib/ai/gemini-provider'
import type { ProjectContext } from '@/app/api/agent/context'
import { injectPersonaContext } from '@/lib/ai/personas'
import { retrieve, buildRAGPrompt } from '@/lib/knowledge/retriever'

// ═══════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════

export type AITask =
  | 'chat'              // 이해관계자 채팅
  | 'vision-check'      // 사진 → 자동 체크
  | 'rag-search'        // 법규/공법 검색
  | 'report-write'      // 일보 자동 작성
  | 'risk-predict'      // 리스크 예측
  | 'alert-analyze'     // 이상 감지 분석
  | 'notebook-analyze'  // 문서/이미지 분석 → 인사이트

export type UserPersona =
  | 'customer'      // 고객 (집주인, 세입자)
  | 'designer'      // 인테리어 디자이너
  | 'contractor'    // 시공사/시공자
  | 'supervisor'    // 감리자
  | 'subcontractor' // 하도급 업체
  | 'self'          // 셀프인테리어
  | 'owner'         // 건물주/임대인

export interface Source {
  title: string
  law?: string      // 법령명 (예: "중대재해처벌법")
  article?: string  // 조문 (예: "제4조 제1항")
  url?: string
}

export interface CheckResult {
  itemId: string
  itemName: string
  result: 'PASS' | 'FAIL' | 'UNCERTAIN'
  reason: string
  legalBasis?: string
}

export interface BrainRequest {
  task: AITask
  persona?: UserPersona
  context: {
    siteId?: string
    projectId?: string
    checklist?: unknown[]
    photos?: string[]
    userMessage?: string
    recentEvents?: unknown[]
    projectCtx?: ProjectContext | null
    conversationHistory?: Array<{ role: string; content: string }>
    imageData?: { base64: string; mimeType: string }
  }
}

export interface BrainResponse {
  answer: string
  sources: Source[]
  autoChecked?: CheckResult[]
  riskLevel?: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL'
  suggestedActions?: string[]
  confidence: number
  model: 'gemini' | 'claude'
}

// ═══════════════════════════════════════════════════════════
// Claude fallback (raw fetch, SDK 불필요)
// ═══════════════════════════════════════════════════════════

async function callClaude(prompt: string, systemPrompt?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.')

  const messages: Array<{ role: string; content: string }> = [
    { role: 'user', content: prompt },
  ]

  const body: Record<string, unknown> = {
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages,
  }
  if (systemPrompt) body.system = systemPrompt

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API 오류 (${res.status}): ${err.substring(0, 200)}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ═══════════════════════════════════════════════════════════
// Gemini → Claude 자동 fallback
// ═══════════════════════════════════════════════════════════

async function callWithFallback(
  prompt: string,
  task: AITask,
  projectCtx: ProjectContext | null = null,
  conversationHistory?: Array<{ role: string; content: string }>,
  imageData?: { base64: string; mimeType: string },
  systemPrompt?: string,
): Promise<{ text: string; model: 'gemini' | 'claude' }> {
  // 1순위: Gemini
  try {
    const result = await callGemini(prompt, projectCtx, conversationHistory, imageData)
    return { text: result.message, model: 'gemini' }
  } catch (geminiError: any) {
    console.warn(`[Brain] Gemini 실패 (task=${task}):`, geminiError?.message?.substring(0, 100))
  }

  // 2순위: Claude (ANTHROPIC_API_KEY 없으면 원본 에러 재발생)
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('AI 서비스 일시 오류: Gemini 실패 + ANTHROPIC_API_KEY 미설정')
  }

  console.log(`[Brain] Claude fallback 실행 (task=${task})`)
  const text = await callClaude(prompt, systemPrompt)
  return { text, model: 'claude' }
}

// ═══════════════════════════════════════════════════════════
// Brain 메인 함수 — 태스크별 라우팅
// ═══════════════════════════════════════════════════════════

export async function brain(req: BrainRequest): Promise<BrainResponse> {
  const { task, context } = req
  const {
    userMessage = '',
    projectCtx = null,
    conversationHistory,
    imageData,
  } = context

  switch (task) {
    // ─── 이해관계자 채팅 ───────────────────────────────────
    case 'chat': {
      // 1. 페르소나 컨텍스트 주입
      const messageWithPersona = req.persona
        ? injectPersonaContext(userMessage, req.persona)
        : userMessage

      // 2. RAG 검색 — 법규/공법 질문 감지 시 지식베이스 주입
      let ragSources: Source[] = []
      let finalMessage = messageWithPersona
      try {
        const ragResult = await retrieve(userMessage)
        if (ragResult.chunks.length > 0) {
          // RAG 컨텍스트를 페르소나 지침 뒤에 삽입
          const ragSection = `\n\n[관련 법규·공법 참고자료]\n${ragResult.context}`
          finalMessage = messageWithPersona + ragSection
          ragSources = ragResult.sources.map(s => ({ title: s }))
        }
      } catch {
        // RAG 실패해도 채팅은 계속
      }

      const { text, model } = await callWithFallback(
        finalMessage,
        task,
        projectCtx,
        conversationHistory,
        imageData,
      )
      return { answer: text, sources: ragSources, confidence: 0.9, model }
    }

    // ─── RAG 법규/공법 검색 ────────────────────────────────
    case 'rag-search': {
      let sources: Source[] = []
      let prompt = userMessage
      try {
        const ragResult = await retrieve(userMessage)
        prompt = buildRAGPrompt(userMessage, ragResult)
        sources = ragResult.sources.map(s => ({ title: s }))
      } catch {
        // RAG 실패 시 순수 LLM 응답
      }
      const { text, model } = await callWithFallback(
        prompt,
        task,
        projectCtx,
        conversationHistory,
      )
      return { answer: text, sources, confidence: 0.85, model }
    }

    // ─── 사진 자동 체크 ───────────────────────────────────
    // STEP 3에서 lib/ai/auto-checker.ts 구현 후 연결
    case 'vision-check': {
      const prompt = imageData
        ? `현장 사진을 분석해주세요. ${userMessage}`
        : `현장 사진 분석 요청: ${userMessage}`
      const { text, model } = await callWithFallback(
        prompt,
        task,
        projectCtx,
        conversationHistory,
        imageData,
      )
      return { answer: text, sources: [], confidence: 0.7, model }
    }

    // ─── 일보 자동 작성 ───────────────────────────────────
    // STEP 5에서 lib/ai/report-writer.ts 구현 후 연결
    case 'report-write': {
      const { text, model } = await callWithFallback(
        `일보 초안 작성 요청. 오늘 현황: ${userMessage}`,
        task,
        projectCtx,
        conversationHistory,
      )
      return { answer: text, sources: [], confidence: 0.85, model }
    }

    // ─── 리스크 예측 ──────────────────────────────────────
    // STEP 5에서 lib/ai/prediction-engine.ts 구현 후 연결
    case 'risk-predict': {
      const { text, model } = await callWithFallback(
        `다음 공종 리스크 예측: ${userMessage}`,
        task,
        projectCtx,
        conversationHistory,
      )
      return { answer: text, sources: [], confidence: 0.75, model }
    }

    // ─── 이상 감지 분석 ───────────────────────────────────
    // STEP 5에서 lib/ai/alert-engine.ts 구현 후 연결
    case 'alert-analyze': {
      const { text, model } = await callWithFallback(
        `이상 감지 분석 요청: ${userMessage}`,
        task,
        projectCtx,
        conversationHistory,
      )
      return { answer: text, sources: [], confidence: 0.8, model }
    }

    // ─── 노트북 문서 분석 ─────────────────────────────────
    case 'notebook-analyze': {
      const { text, model } = await callWithFallback(
        userMessage,
        task,
        projectCtx,
        conversationHistory,
        imageData,
      )
      return { answer: text, sources: [], confidence: 0.85, model }
    }

    default: {
      const { text, model } = await callWithFallback(userMessage, task, projectCtx)
      return { answer: text, sources: [], confidence: 0.5, model }
    }
  }
}
