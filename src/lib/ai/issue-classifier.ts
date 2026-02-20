/**
 * issue-classifier.ts — 현장 이슈 AI 분류기 (서버 전용)
 *
 * 현장 변수(이슈)를 Gemini로 분류 → 심각도/카테고리/권고 액션 반환
 * callGemini 직접 호출 (brain.ts의 chat은 Function Calling이라 JSON 출력 불가)
 *
 * 타입·상수 → issue-types.ts (클라이언트 컴포넌트에서 import)
 * AI 로직  → 이 파일 (서버 컴포넌트/API route에서만 import)
 */

import { callGemini } from '@/lib/ai/gemini-provider'
import type { IssueClassifyResult } from './issue-types'

// ═══════════════════════════════════════════════════════════
// Claude fallback (Gemini 할당량 초과 시)
// ═══════════════════════════════════════════════════════════

async function callClaudeForIssueClassify(prompt: string): Promise<string> {
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
      max_tokens: 1024,
      system: ISSUE_CLASSIFIER_PROMPT,
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

// 타입·상수 re-export (서버 측 코드 편의용)
export type {
  IssueSeverity,
  IssueCategory,
  IssueStatus,
  IssueClassifyResult,
} from './issue-types'
export { SEVERITY_CONFIG, CATEGORY_CONFIG } from './issue-types'

// ═══════════════════════════════════════════════════════════
// 시스템 프롬프트
// ═══════════════════════════════════════════════════════════

const ISSUE_CLASSIFIER_PROMPT = `너는 대한민국 인테리어·건설 현장 이슈 분류 AI다.
현장 담당자가 보고한 이슈를 분석해 JSON으로만 반환한다.

카테고리:
- safety: 안전사고·추락·화재 위험
- quality: 자재불량·시공불량·하자
- cost: 추가비용·원자재가격 변동
- schedule: 공정지연·날씨·인력부족
- legal: 허가·법규·안전검사
- material: 자재미달·배송지연·단종
- labor: 인력이탈·파업·전문인력 부족
- weather: 기상악화·동절기·장마
- design_change: 고객 요구 변경·설계변경
- other: 위 분류 외

심각도:
- critical: 즉시 공사중지 필요, 인명위험
- high: 24시간 내 대응 필요
- medium: 48~72시간 내 대응
- low: 정기 보고로 충분

반드시 JSON만 반환. 설명 없이.`

// ═══════════════════════════════════════════════════════════
// 분류 함수
// ═══════════════════════════════════════════════════════════

export async function classifyIssue(
  issueText: string,
  projectName?: string,
): Promise<IssueClassifyResult> {
  const prompt = `
현장명: ${projectName ?? '미지정'}

이슈 내용:
${issueText}

다음 JSON 형식으로만 반환하세요:
{
  "category": "safety|quality|cost|schedule|legal|material|labor|weather|design_change|other",
  "severity": "low|medium|high|critical",
  "title": "3~10자 요약 제목",
  "summary": "한 문장 요약",
  "recommended_actions": ["조치1", "조치2", "조치3"],
  "legal_basis": "관련 법규 또는 null",
  "cost_impact": "예상 비용 영향 또는 null",
  "schedule_impact": "예상 일정 영향 또는 null",
  "requires_approval": true,
  "urgency_hours": 48
}
`.trim()

  let text: string
  try {
    const result = await callGemini(prompt, null, undefined, undefined)
    text = result.message
  } catch (geminiError: any) {
    console.warn('[issue-classifier] Gemini 실패, Claude로 폴백:', geminiError?.message?.substring(0, 100))
    text = await callClaudeForIssueClassify(prompt)
  }
  const jsonMatch = text.match(/\{[\s\S]+?\}/s)
  if (!jsonMatch) {
    throw new Error('이슈 분류 AI 응답 파싱 실패')
  }
  return JSON.parse(jsonMatch[0]) as IssueClassifyResult
}
