/**
 * Mock Router: API 키 없을 때 키워드 기반 도구 선택
 */

import type { ProjectContext } from './context'
import {
  projectSetup,
  checklistAnalyze,
  quoteGenerate,
  costAnalyze,
  riskCalculate,
  changeRecord,
  evidencePackage,
  agreementCreate,
  reportGenerate,
  scheduleCheck,
  verifyScore,
  getProjectSummary,
  type ToolResult,
} from './tools'

interface RouteMatch {
  tool: string
  handler: () => Promise<ToolResult>
  keywords: string[]
}

function extractIndustry(message: string): string {
  const map: Record<string, string> = {
    '카페': 'cafe', '커피': 'cafe',
    '음식점': 'restaurant', '식당': 'restaurant', '레스토랑': 'restaurant',
    '술집': 'bar', '바': 'bar', '펍': 'bar',
    '베이커리': 'bakery', '빵집': 'bakery',
    '미용실': 'beauty', '네일': 'beauty', '헤어': 'beauty',
    '병원': 'clinic', '의원': 'clinic', '클리닉': 'clinic',
    '헬스': 'fitness', '피트니스': 'fitness', '요가': 'fitness',
    '매장': 'retail', '소매': 'retail', '편의점': 'retail',
    '사무실': 'office', '오피스': 'office',
    '학원': 'academy',
    '아파트': 'apartment',
    '빌라': 'villa',
    '주택': 'house', '단독주택': 'house',
  }
  for (const [keyword, id] of Object.entries(map)) {
    if (message.includes(keyword)) return id
  }
  return 'cafe'
}

function extractArea(message: string): number {
  const match = message.match(/(\d+)\s*평/)
  return match ? parseInt(match[1]) : 20
}

function extractBudget(message: string): number | undefined {
  const match = message.match(/(\d+)\s*(만원|억)/)
  if (!match) return undefined
  const num = parseInt(match[1])
  return match[2] === '억' ? num * 100000000 : num * 10000
}

export async function routeMessage(
  message: string,
  ctx: ProjectContext | null,
): Promise<ToolResult> {
  const msg = message.toLowerCase()

  // 프로젝트 생성
  if (matchKeywords(msg, ['만들어', '생성', '시작', '새 프로젝트', '프로젝트 만', '프로젝트 생성', '프로젝트 시작'])) {
    const industry = extractIndustry(message)
    const area = extractArea(message)
    const budget = extractBudget(message)
    const nameMatch = message.match(/["']([^"']+)["']/)
    return projectSetup({ industry, area, budget, name: nameMatch?.[1] })
  }

  // 견적 생성
  if (matchKeywords(msg, ['견적', 'quote', '견적서', '견적 만', '표준 견적'])) {
    if (!ctx) return noProject()
    const area = extractArea(message) || 20
    return quoteGenerate(ctx, { area })
  }

  // 비용 분석
  if (matchKeywords(msg, ['비용 분석', '비용분석', '적정가', '적정성', '시세', 'cost'])) {
    if (!ctx) return noProject()
    return costAnalyze(ctx)
  }

  // 리스크 분석
  if (matchKeywords(msg, ['리스크', '위험', '진단', '분석해', 'risk'])) {
    if (!ctx) return noProject()
    // 리스크 + 체크리스트 분석 둘 다 실행
    const [riskResult, checkResult] = await Promise.all([
      riskCalculate(ctx),
      checklistAnalyze(ctx),
    ])
    return {
      tool: 'risk_calculate',
      success: true,
      message: riskResult.message + '\n\n---\n\n' + checkResult.message,
      data: { risk: riskResult.data, checklist: checkResult.data },
    }
  }

  // 변경 관리
  if (matchKeywords(msg, ['변경', '변경요청', '추가 공사', '추가공사'])) {
    if (!ctx) return noProject()
    return changeRecord(ctx, { title: message, reason: message })
  }

  // 리포트 생성
  if (matchKeywords(msg, ['리포트', '보고서', 'report', '보고'])) {
    if (!ctx) return noProject()
    return reportGenerate(ctx)
  }

  // AI 검증
  if (matchKeywords(msg, ['검증', '점수', '채점', '인증', 'verify', 'score'])) {
    if (!ctx) return noProject()
    return verifyScore(ctx)
  }

  // 일정 점검
  if (matchKeywords(msg, ['일정', '공정', '지연', '스케줄', 'schedule'])) {
    if (!ctx) return noProject()
    return scheduleCheck(ctx)
  }

  // 증빙
  if (matchKeywords(msg, ['증빙', '증거', '패키지', 'evidence'])) {
    if (!ctx) return noProject()
    return evidencePackage(ctx)
  }

  // 합의
  if (matchKeywords(msg, ['합의', '서명', '계약', 'agreement'])) {
    if (!ctx) return noProject()
    return agreementCreate(ctx)
  }

  // 인사/현황
  if (matchKeywords(msg, ['안녕', '현황', '상태', '요약', '도움', 'hello', 'hi', '뭐', '체키'])) {
    return getProjectSummary(ctx || { project: null, diagnosticCount: 0, quoteItems: [], costAnalysis: null, changeOrders: [], evidenceFiles: [], agreements: [], reports: [], processes: [], workforce: [], materials: [] })
  }

  // 기본 응답
  return {
    tool: 'help',
    success: true,
    message: `🤖 무엇을 도와드릴까요?\n\n` +
      `사용 가능한 명령:\n` +
      `• "카페 20평 프로젝트 만들어줘" - 프로젝트 생성\n` +
      `• "견적 만들어줘" - AI 표준 견적 생성\n` +
      `• "리스크 분석해줘" - 리스크 점수 계산\n` +
      `• "비용 분석해줘" - 비용 적정성 분석\n` +
      `• "리포트 생성해줘" - 종합 리포트\n` +
      `• "일정 점검해줘" - 공정/일정 확인\n` +
      `• "검증 점수 알려줘" - AI 검증 채점\n` +
      `• "현황 알려줘" - 프로젝트 요약`,
  }
}

function matchKeywords(message: string, keywords: string[]): boolean {
  return keywords.some(kw => message.includes(kw))
}

function noProject(): ToolResult {
  return {
    tool: 'error',
    success: false,
    message: '📌 프로젝트 페이지에서 프로젝트를 선택한 후 다시 시도해주세요.\n\n또는 "프로젝트 만들어줘"로 새 프로젝트를 생성할 수 있습니다.',
  }
}
