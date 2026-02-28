/**
 * AI Brain — 중앙 AI 라우터
 *
 * 모든 AI 호출은 이 파일을 통한다.
 * 직접 Gemini/Claude를 import하지 말 것.
 *
 * 폴백 체인: Gemini 2.5 Flash → Claude Sonnet (ANTHROPIC_API_KEY 필요)
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { callGemini, CHEKI_SYSTEM_PROMPT } from '@/lib/ai/gemini-provider'
import type { ProjectContext } from '@/app/api/agent/context'
import { injectPersonaContext } from '@/lib/ai/personas'
import { retrieve, buildRAGPrompt } from '@/lib/knowledge/retriever'
import { detectDisputeSignals, buildDisputeContext, type DisputeAlert } from '@/lib/ai/dispute-preventer'
import { searchCases, needsCaseSearch, buildCaseContext } from '@/lib/knowledge/case-search'
import { autoCheckFromPhoto } from '@/lib/ai/auto-checker'

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
  | 'quote-analyze'     // 견적 과다청구 분석 (materials.json 시세 비교)

export type UserPersona =
  | 'customer'      // 고객 (집주인, 세입자)
  | 'designer'      // 인테리어 디자이너
  | 'contractor'    // 시공사/작업자
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
    userId?: string
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
// 기록 관리 징후 DB 저장 (fire-and-forget)
// ═══════════════════════════════════════════════════════════

async function saveDisputeSignalsToDB(
  alert: DisputeAlert,
  projectId?: string,
  userId?: string,
  sourceText?: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !userId || !alert.detected) return

  const supabase = createSupabaseClient(url, key)
  const inserts = alert.types.map(signal => ({
    project_id: projectId ?? null,
    user_id: userId,
    signal_type: signal.type,
    description: signal.warningMessage,
    detected_from: 'chat',
    source_text: sourceText?.substring(0, 500) ?? null,
    legal_basis: signal.legalBasis,
    recommended_action: signal.recommendedAction,
  }))

  const { error } = await supabase.from('dispute_signals').insert(inserts)
  if (error) throw new Error(error.message)
}

// ═══════════════════════════════════════════════════════════
// Claude fallback (raw fetch, SDK 불필요)
// ═══════════════════════════════════════════════════════════

async function callClaude(
  prompt: string,
  systemPrompt?: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  imageData?: { base64: string; mimeType: string },
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.')

  // 대화 히스토리를 Claude 메시지 형식으로 변환 (user/assistant 교대, user로 시작해야 함)
  const messages: Array<{ role: string; content: any }> = []
  if (conversationHistory && conversationHistory.length > 0) {
    // user로 시작하도록 앞의 assistant 메시지 제거
    let start = 0
    while (start < conversationHistory.length && conversationHistory[start].role !== 'user') start++
    for (let i = start; i < conversationHistory.length; i++) {
      const role = conversationHistory[i].role === 'user' ? 'user' : 'assistant'
      messages.push({ role, content: conversationHistory[i].content })
    }
  }

  // 마지막 사용자 메시지 (이미지 포함 시 vision 형식)
  if (imageData?.base64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: imageData.mimeType || 'image/jpeg', data: imageData.base64 } },
        { type: 'text', text: prompt },
      ],
    })
  } else {
    messages.push({ role: 'user', content: prompt })
  }

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
// 법적 면책 고지 자동 추가 (AI 불신파 대응)
// ═══════════════════════════════════════════════════════════

const LEGAL_DISCLAIMER = `\n\n---\n⚠️ 이 답변은 참고용 정보예요. 법적 효력이 있는 판단은 전문 변호사나 관련 기관에 확인하세요.`

const LEGAL_KEYWORDS = ['조', '법', '민법', '건산법', '하도급법', '건설산업기본법', '중대재해', '산업안전', '소방법', '건축법', '집합건물법', '주택법', '하자담보']

function appendLegalDisclaimer(text: string): string {
  const hasLegal = LEGAL_KEYWORDS.some(kw => text.includes(kw))
  if (!hasLegal) return text
  // 이미 면책 고지가 포함된 경우 중복 추가 안 함
  if (text.includes('참고용 정보')) return text
  return text + LEGAL_DISCLAIMER
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
    return { text: appendLegalDisclaimer(result.message), model: 'gemini' }
  } catch (geminiError: any) {
    console.warn(`[Brain] Gemini 실패 (task=${task}):`, geminiError?.message?.substring(0, 100))
  }

  // 2순위: Claude (ANTHROPIC_API_KEY 없으면 원본 에러 재발생)
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('AI 서비스 일시 오류: Gemini 실패 + ANTHROPIC_API_KEY 미설정')
  }

  console.log(`[Brain] Claude fallback 실행 (task=${task})`)
  const text = await callClaude(prompt, systemPrompt ?? CHEKI_SYSTEM_PROMPT, conversationHistory, imageData)
  return { text: appendLegalDisclaimer(text), model: 'claude' }
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
    projectId,
    userId,
  } = context

  // ─── 예산 가이드 키워드 감지 (chat 진입 전 — 빠른 리다이렉트 힌트)
  const BUDGET_KEYWORDS = ['견적', '얼마', '비용', '공사비', '예산', '단가', '평당', '가격', '금액']
  const isBudgetQuery = BUDGET_KEYWORDS.some(kw => userMessage.includes(kw))

  switch (task) {
    // ─── 이해관계자 채팅 ───────────────────────────────────
    case 'chat': {
      // 0. 예산 관련 질문이면 예산 가이드 힌트 앞에 붙이기
      const budgetHint = isBudgetQuery
        ? `[시스템 힌트: 사용자가 비용/예산 관련 질문을 했습니다. 답변 말미에 "더 정확한 예산은 [AI 예산 가이드](/quotes/new)에서 공간·면적·등급을 선택하면 자동으로 계산돼요." 를 자연스럽게 추가하세요.]\n\n`
        : ''

      // 1. 기록 관리 징후 자동 감지 + DB 저장 (fire-and-forget)
      const disputeAlert = detectDisputeSignals(userMessage)
      const disputeContext = buildDisputeContext(disputeAlert)
      if (disputeAlert.detected) {
        saveDisputeSignalsToDB(disputeAlert, projectId, userId, userMessage)
          .catch(e => console.warn('[Brain] dispute_signals 저장 실패:', e.message))
      }

      // 2. 페르소나 컨텍스트 주입
      const messageWithPersona = req.persona
        ? injectPersonaContext(userMessage, req.persona)
        : userMessage

      // 3. RAG 검색 — 법규/공법 질문 감지 시 지식베이스 주입
      let ragSources: Source[] = []
      let finalMessage = messageWithPersona
      try {
        const ragResult = await retrieve(userMessage)
        if (ragResult.chunks.length > 0) {
          const ragSection = `\n\n[관련 법규·공법 참고자료]\n${ragResult.context}`
          finalMessage = messageWithPersona + ragSection
          ragSources = ragResult.sources.map(s => ({ title: s }))
        }
      } catch {
        // RAG 실패해도 채팅은 계속
      }

      // 4. 기록 관리 컨텍스트 주입 (감지된 경우만)
      if (disputeContext) {
        finalMessage = finalMessage + disputeContext
      }

      // 4-1. 판례 RAG 주입 (기록 관리 관련 키워드 감지 시)
      if (needsCaseSearch(userMessage)) {
        try {
          const caseResults = searchCases(userMessage, 2)
          if (caseResults.length > 0) {
            const caseContext = `\n\n[관련 판례 참고]\n${buildCaseContext(caseResults)}`
            finalMessage = finalMessage + caseContext
            ragSources = [...ragSources, ...caseResults.map(c => ({ title: c.source }))]
          }
        } catch {
          // 판례 검색 실패해도 채팅 계속
        }
      }

      // 5. 예산 힌트 앞에 붙이기
      if (budgetHint) {
        finalMessage = budgetHint + finalMessage
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
    case 'vision-check': {
      if (!imageData) {
        return { answer: '사진이 필요합니다.', sources: [], confidence: 0, model: 'gemini' }
      }
      const result = await autoCheckFromPhoto(imageData, projectId || '')
      return {
        answer: JSON.stringify(result),
        sources: [],
        confidence: result.goNoGo === 'GO' ? 0.85 : 0.75,
        model: 'gemini',
      }
    }

    // ─── 일보 자동 작성 ───────────────────────────────────
    // Note: 이 케이스는 /api/ai/report 에서 직접 처리하므로 여기서는 기본 응답만
    case 'report-write': {
      return { answer: '일보 작성은 /api/ai/report에서 처리합니다.', sources: [], confidence: 1.0, model: 'gemini' }
    }

    // ─── 리스크 예측 ──────────────────────────────────────
    // Note: 이 케이스는 /api/ai/predict 에서 직접 처리하므로 여기서는 기본 응답만
    case 'risk-predict': {
      return { answer: '리스크 예측은 /api/ai/predict에서 처리합니다.', sources: [], confidence: 1.0, model: 'gemini' }
    }

    // ─── 이상 감지 분석 ───────────────────────────────────
    // Note: 이 케이스는 /api/ai/alerts 에서 직접 처리하므로 여기서는 기본 응답만
    case 'alert-analyze': {
      return { answer: '알림 분석은 /api/ai/alerts에서 처리합니다.', sources: [], confidence: 1.0, model: 'gemini' }
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

    // ─── 견적 과다청구 분석 ───────────────────────────────
    case 'quote-analyze': {
      if (!projectId) throw new Error('projectId가 필요합니다.')
      const { analyzeQuote } = await import('@/lib/ai/quote-analyzer')
      const result = await analyzeQuote(projectId)
      return {
        answer: JSON.stringify(result),
        sources: [],
        confidence: 0.85,
        model: 'gemini',
      }
    }

    default: {
      const { text, model } = await callWithFallback(userMessage, task, projectCtx)
      return { answer: text, sources: [], confidence: 0.5, model }
    }
  }
}
