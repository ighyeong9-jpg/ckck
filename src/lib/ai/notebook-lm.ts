/**
 * notebook-lm.ts — 문서/이미지 AI 분석 엔진
 *
 * 흐름:
 *   파일 업로드 (PDF / 이미지 / 계약서 / 도면)
 *   → 파일 유형별 전처리 (base64 인코딩 또는 텍스트 추출)
 *   → brain.ts notebook-analyze 태스크
 *   → NotebookInsight 반환 (요약, 핵심 발견, 리스크 플래그, 액션 아이템)
 */

import { brain } from '@/lib/ai/brain'

// ═══════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════

export type NotebookDocType =
  | 'contract'   // 계약서
  | 'drawing'    // 도면
  | 'photo'      // 현장 사진
  | 'report'     // 리포트/일보
  | 'estimate'   // 견적서
  | 'other'      // 기타 문서

export interface NotebookInsight {
  summary: string              // 문서 한줄 요약
  keyFindings: string[]        // 핵심 발견사항 (3~5개)
  riskFlags: string[]          // 리스크 플래그 (0~3개)
  actionItems: string[]        // 즉시 조치 사항
  documentType: NotebookDocType
  confidence: number           // 분석 신뢰도 (0~1)
  model: 'gemini' | 'claude'
  analyzedAt: string
}

// ═══════════════════════════════════════════════════════════
// 문서 유형 자동 감지
// ═══════════════════════════════════════════════════════════

function detectDocType(fileName: string, mimeType: string): NotebookDocType {
  const lower = fileName.toLowerCase()
  if (lower.includes('계약') || lower.includes('contract')) return 'contract'
  if (lower.includes('도면') || lower.includes('drawing') || lower.includes('cad')) return 'drawing'
  if (lower.includes('견적') || lower.includes('estimate') || lower.includes('quote')) return 'estimate'
  if (lower.includes('일보') || lower.includes('report')) return 'report'
  if (mimeType.startsWith('image/')) return 'photo'
  return 'other'
}

// ═══════════════════════════════════════════════════════════
// 분석 프롬프트 생성
// ═══════════════════════════════════════════════════════════

function buildAnalysisPrompt(
  docType: NotebookDocType,
  fileName: string,
  textContent?: string,
  userNote?: string,
): string {
  const docTypeLabel: Record<NotebookDocType, string> = {
    contract: '계약서',
    drawing: '도면',
    photo: '현장 사진',
    report: '리포트/일보',
    estimate: '견적서',
    other: '문서',
  }

  const docLabel = docTypeLabel[docType]

  const analysisGuide: Record<NotebookDocType, string> = {
    contract: `
- 계약 금액, 공사 범위, 시작/완료 예정일을 확인하세요.
- 하자 보수 조항, 지체상금, 계약 해지 조건을 명확히 파악하세요.
- 불명확하거나 누락된 조항이 있으면 리스크로 표시하세요.
- 소비자에게 불리한 조항이나 관련 법령 미충족 소지를 확인하세요.`,
    drawing: `
- 도면에 표시된 시공 범위와 마감재를 파악하세요.
- 치수 누락이나 불명확한 사항을 리스크로 표시하세요.
- 법적 허가가 필요한 공종이 있는지 확인하세요.
- 구조 변경이 포함되는지 확인하세요.`,
    photo: `
- 현장 시공 상태를 평가하세요.
- 안전 위험 요소를 우선 확인하세요.
- 시공 품질 이상(균열, 처짐, 부실 마감)을 감지하세요.
- 법적 기준 미달 여부를 확인하세요.`,
    estimate: `
- 총 견적 금액과 항목별 단가 적정성을 평가하세요.
- 누락된 공종이나 재료비가 없는지 확인하세요.
- 시장 표준 대비 이상한 가격을 리스크로 표시하세요.
- 추가 비용 발생 가능성을 파악하세요.`,
    report: `
- 오늘/이번 주 핵심 진행 사항을 파악하세요.
- 지연이나 문제 사항을 리스크로 표시하세요.
- 다음 단계 준비 사항을 액션 아이템으로 제시하세요.`,
    other: `
- 문서의 핵심 내용을 파악하세요.
- 주의가 필요한 사항을 리스크로 표시하세요.
- 즉시 처리해야 할 사항을 액션 아이템으로 제시하세요.`,
  }

  return `당신은 인테리어/건설 현장 전문 AI 분석가입니다.
다음 ${docLabel}를 분석하고 현장 소장에게 유용한 인사이트를 제공하세요.

파일명: ${fileName}
${userNote ? `사용자 메모: ${userNote}` : ''}
${textContent ? `\n[문서 내용]\n${textContent.substring(0, 8000)}` : '[이미지 분석 모드]'}

분석 가이드:${analysisGuide[docType]}

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없음):
{
  "summary": "문서를 한 문장으로 요약",
  "keyFindings": ["핵심 발견 1", "핵심 발견 2", "핵심 발견 3"],
  "riskFlags": ["리스크 1 (없으면 빈 배열)"],
  "actionItems": ["액션 아이템 1", "액션 아이템 2"]
}`
}

// ═══════════════════════════════════════════════════════════
// 메인 분석 함수
// ═══════════════════════════════════════════════════════════

export async function analyzeDocument(params: {
  fileName: string
  mimeType: string
  base64Data?: string       // 이미지 또는 PDF의 base64
  textContent?: string      // 텍스트 문서 내용
  userNote?: string         // 사용자 메모/질문
  projectId?: string
}): Promise<NotebookInsight> {
  const { fileName, mimeType, base64Data, textContent, userNote, projectId } = params

  const docType = detectDocType(fileName, mimeType)
  const isImage = mimeType.startsWith('image/')
  const isPdf = mimeType === 'application/pdf'

  const prompt = buildAnalysisPrompt(docType, fileName, textContent, userNote)

  const result = await brain({
    task: 'notebook-analyze',
    context: {
      userMessage: prompt,
      projectId,
      imageData: (isImage || isPdf) && base64Data
        ? { base64: base64Data, mimeType }
        : undefined,
    },
  })

  // JSON 파싱 시도
  try {
    const jsonMatch = result.answer.match(/\{[\s\S]+\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary ?? '분석 완료',
        keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings.slice(0, 5) : [],
        riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags.slice(0, 3) : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.slice(0, 4) : [],
        documentType: docType,
        confidence: result.confidence,
        model: result.model,
        analyzedAt: new Date().toISOString(),
      }
    }
  } catch {
    // JSON 파싱 실패 시 텍스트 응답 사용
  }

  // 파싱 실패 폴백
  return {
    summary: result.answer.substring(0, 200),
    keyFindings: ['분석이 완료되었으나 구조화된 결과를 추출하지 못했습니다.'],
    riskFlags: [],
    actionItems: ['AI 채팅에서 더 자세한 분석을 요청해보세요.'],
    documentType: docType,
    confidence: 0.3,
    model: result.model,
    analyzedAt: new Date().toISOString(),
  }
}
