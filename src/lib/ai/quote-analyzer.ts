/**
 * quote-analyzer.ts — 견적 과다청구 AI 분석기
 *
 * 흐름:
 * 1. DB에서 quote_line_items 조회
 * 2. materials.json 시장 단가를 컨텍스트로 주입
 * 3. Gemini로 항목별 시세 초과율 계산 (20% 이상 → 경고)
 * 4. "이 항목은 평균 시세보다 35% 높습니다 (적정 범위: X~Y원/㎡)" 형태로 반환
 * 5. quote_analyses 테이블에 저장
 */

import { createClient } from '@supabase/supabase-js'
import { callGemini } from '@/lib/ai/gemini-provider'
import { loadChunksByCategory } from '@/lib/knowledge/loader'

// ─── Claude fallback (Gemini 할당량 초과 시) ─────────────

async function callClaudeForQuoteAnalysis(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API 오류 (${res.status}): ${err.substring(0, 200)}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ─── 타입 ─────────────────────────────────────────────────

export interface OverchargeItem {
  item_name: string
  quoted_price: number
  market_price_min: number
  market_price_max: number
  unit: string
  difference_pct: number   // 시세 중간값 대비 초과율 (양수)
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  message: string          // "이 항목은 평균 시세보다 35% 높습니다 (적정 범위: ...)"
}

export interface UnderchargeItem {
  item_name: string
  quoted_price: number
  market_price_min: number
  market_price_max: number
  unit: string
  difference_pct: number   // 음수: 시세 하한보다 낮음 (품질 의심)
  message: string
}

export interface QuoteAnalysisResult {
  project_id: string
  total_amount: number
  overcharge_items: OverchargeItem[]
  undercharge_items: UnderchargeItem[]
  overall_risk: 'LOW' | 'MEDIUM' | 'HIGH'
  ai_comment: string
  analyzed_at?: string
}

// ─── 시장 단가 컨텍스트 로드 ──────────────────────────────

function loadMaterialsContext(): string {
  const chunks = loadChunksByCategory('material')
  if (chunks.length === 0) return ''
  return chunks.map(c => `[${c.source}]\n${c.content}`).join('\n\n')
}

// ─── 메인 분석 함수 ───────────────────────────────────────

/**
 * 프로젝트 견적서를 AI로 분석하고 quote_analyses에 저장한다.
 * brain.ts의 'quote-analyze' 케이스에서 호출.
 */
export async function analyzeQuote(projectId: string): Promise<QuoteAnalysisResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수 미설정')

  const supabase = createClient(url, key)

  // 1. quote_line_items 조회
  const { data: items, error: fetchError } = await supabase
    .from('quote_line_items')
    .select('id, item_name, specification, unit, quantity, unit_price, category')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (fetchError) throw new Error(`견적 항목 조회 실패: ${fetchError.message}`)
  if (!items || items.length === 0) throw new Error('분석할 견적 항목이 없습니다.')

  const totalAmount = items.reduce(
    (sum, item) => sum + (item.unit_price ?? 0) * (item.quantity ?? 1),
    0,
  )

  // 2. materials.json 시장 단가 컨텍스트
  const materialsCtx = loadMaterialsContext()

  // 3. 견적 항목 텍스트 구성
  const itemsText = items.map(item =>
    `- ID: ${item.id} | 항목: ${item.item_name}${item.specification ? ` (${item.specification})` : ''} | 단위: ${item.unit} | 단가: ${(item.unit_price ?? 0).toLocaleString()}원 | 수량: ${item.quantity ?? 1}`,
  ).join('\n')

  // 4. AI 분석 프롬프트
  const prompt = `당신은 한국 인테리어 공사 견적 전문가입니다.
아래 [시장 단가 참고자료]를 기준으로 [견적 항목]의 각 단가를 분석하세요.
20% 이상 시세를 초과한 항목은 overcharge_items에, 시세 하한보다 20% 이상 낮은 항목(품질 의심)은 undercharge_items에 포함하세요.

[시장 단가 참고자료 — 2024~2025 서울 기준]
${materialsCtx}

[견적 항목]
${itemsText}

[총 견적금액] ${totalAmount.toLocaleString()}원

다음 JSON 형식으로만 응답하세요 (앞뒤 텍스트 없이 JSON만):
{
  "overcharge_items": [
    {
      "item_name": "항목명(견적서와 동일)",
      "quoted_price": 견적단가(숫자),
      "market_price_min": 시장단가최소(숫자),
      "market_price_max": 시장단가최대(숫자),
      "unit": "단위(㎡·m·장·식 등)",
      "difference_pct": 시장중간값대비초과율(양의정수, 예: 35),
      "risk_level": "HIGH"
    }
  ],
  "undercharge_items": [
    {
      "item_name": "항목명",
      "quoted_price": 견적단가(숫자),
      "market_price_min": 시장단가최소(숫자),
      "market_price_max": 시장단가최대(숫자),
      "unit": "단위",
      "difference_pct": 시장하한대비차이율(음의정수, 예: -30)
    }
  ],
  "overall_risk": "HIGH|MEDIUM|LOW",
  "ai_comment": "전체 견적 종합 의견 (소비자 관점, 2~3문장, 구체적 수치 포함)"
}

판정 기준:
- HIGH: 시장 중간값 대비 30% 초과
- MEDIUM: 시장 중간값 대비 20~30%
- LOW: 시장 중간값 대비 20% 미만 (overcharge_items 미포함)
- 시장 단가 참고자료에 없는 항목은 건너뜀 (overcharge_items 미포함)
- overcharge_items, undercharge_items 없으면 빈 배열 []`

  let parsed = {
    overcharge_items: [] as Omit<OverchargeItem, 'message'>[],
    undercharge_items: [] as Omit<UnderchargeItem, 'message'>[],
    overall_risk: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH',
    ai_comment: '',
  }

  try {
    let message: string
    try {
      const result = await callGemini(prompt, null)
      message = result.message
    } catch (geminiError: any) {
      console.warn('[QuoteAnalyzer] Gemini 실패, Claude로 폴백:', geminiError?.message?.substring(0, 100))
      message = await callClaudeForQuoteAnalysis(prompt)
    }
    const jsonMatch = message.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0])
      parsed = {
        overcharge_items: Array.isArray(raw.overcharge_items) ? raw.overcharge_items : [],
        undercharge_items: Array.isArray(raw.undercharge_items) ? raw.undercharge_items : [],
        overall_risk: (['LOW', 'MEDIUM', 'HIGH'].includes(raw.overall_risk)
          ? raw.overall_risk : 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH',
        ai_comment: typeof raw.ai_comment === 'string' ? raw.ai_comment : '',
      }
    }
  } catch (err: any) {
    console.warn('[QuoteAnalyzer] AI 분석 실패:', err.message)
    parsed.ai_comment = '자동 분석 중 오류가 발생했습니다. 수동으로 견적서를 검토해주세요.'
  }

  // 5. 메시지 문자열 생성: "이 항목은 평균 시세보다 35% 높습니다 (적정 범위: 40,000~60,000원/㎡)"
  const overchargeItems: OverchargeItem[] = parsed.overcharge_items.map(item => ({
    ...item,
    message: `이 항목은 평균 시세보다 ${item.difference_pct}% 높습니다 (적정 범위: ${item.market_price_min.toLocaleString()}~${item.market_price_max.toLocaleString()}원/${item.unit})`,
  }))

  const underchargeItems: UnderchargeItem[] = parsed.undercharge_items.map(item => ({
    ...item,
    message: `이 항목은 시세보다 ${Math.abs(item.difference_pct)}% 낮습니다 — 자재 품질 저하 가능성 (시세 범위: ${item.market_price_min.toLocaleString()}~${item.market_price_max.toLocaleString()}원/${item.unit})`,
  }))

  const result: QuoteAnalysisResult = {
    project_id: projectId,
    total_amount: totalAmount,
    overcharge_items: overchargeItems,
    undercharge_items: underchargeItems,
    overall_risk: parsed.overall_risk,
    ai_comment: parsed.ai_comment,
  }

  // 6. DB 저장
  const { error: saveError } = await supabase.from('quote_analyses').insert({
    project_id: projectId,
    total_amount: totalAmount,
    overcharge_items: overchargeItems,
    undercharge_items: underchargeItems,
    overall_risk: parsed.overall_risk,
    ai_comment: parsed.ai_comment,
  })
  if (saveError) console.warn('[QuoteAnalyzer] DB 저장 실패:', saveError.message)

  return result
}

/**
 * 프로젝트의 최신 견적 분석 결과를 조회한다.
 */
export async function getLatestQuoteAnalysis(projectId: string): Promise<QuoteAnalysisResult | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('quote_analyses')
    .select('*')
    .eq('project_id', projectId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as QuoteAnalysisResult
}
