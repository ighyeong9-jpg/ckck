/**
 * prediction-engine.ts — 다음 공종 리스크 예측 엔진
 *
 * 흐름:
 * PROCESS_COMPLETED 이벤트
 *   → 현재 완료된 공종 + 프로젝트 데이터 수집
 *   → brain.ts risk-predict 태스크 호출
 *   → 다음 공종 리스크 레벨 + 주의사항 반환
 *   → NEXT_RISK_PREDICTED 이벤트 발행
 */

import { brain } from '@/lib/ai/brain'

// ═══════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════

export interface ProcessRiskContext {
  projectId: string
  projectName: string
  industry: string             // cafe, restaurant, apartment, ...
  completedProcess: {
    name: string
    status: 'completed' | 'delayed'
    progress: number
    delayDays?: number          // 지연된 경우
  }
  nextProcesses: {
    name: string
    status: string
    plannedStartDate?: string
  }[]
  overallProgress: number      // 전체 공정 진행률 (%)
  checklistScore: number       // 체크리스트 완료율 (%)
  hasOpenIssues: boolean       // 미해결 이슈 여부
}

export interface RiskPrediction {
  projectId: string
  nextProcess: string          // 다음 공종명
  riskLevel: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL'
  riskScore: number            // 0-100
  reasons: string[]            // 리스크 근거 (공감→설명→제안 톤)
  suggestions: string[]        // 대응 방안
  warnings: string[]           // 법적/안전 주의사항
  model: 'gemini' | 'claude'
}

// ═══════════════════════════════════════════════════════════
// 업종별 공종 위험도 기본값 (AI 예측 전 빠른 필터링)
// ═══════════════════════════════════════════════════════════

// 공종 전환 위험 쌍: 이전 공종 → 다음 공종이 위험한 조합
const HIGH_RISK_TRANSITIONS: Array<[string, string]> = [
  ['철거공사', '전기공사'],     // 철거 직후 전기는 누전 위험
  ['전기공사', '설비공사'],     // 전기-설비 간섭
  ['타일공사', '도장공사'],     // 습기 건조 전 도장 금지
  ['도장공사', '도배공사'],     // 도료 냄새/VOC 잔류
  ['목공사', '타일공사'],       // 하지 불량 시 타일 들뜸
]

function getTransitionRisk(completedName: string, nextName: string): 'HIGH' | null {
  for (const [from, to] of HIGH_RISK_TRANSITIONS) {
    if (completedName.includes(from.slice(0, 2)) && nextName.includes(to.slice(0, 2))) {
      return 'HIGH'
    }
  }
  return null
}

// ═══════════════════════════════════════════════════════════
// 예측 프롬프트 빌더
// ═══════════════════════════════════════════════════════════

function buildPredictionPrompt(ctx: ProcessRiskContext): string {
  const nextProcessList = ctx.nextProcesses
    .map(p => `- ${p.name} (${p.status === 'pending' ? '대기' : '진행중'}${p.plannedStartDate ? `, 예정: ${p.plannedStartDate}` : ''})`)
    .join('\n') || '다음 공종 없음'

  const delayNote = ctx.completedProcess.delayDays && ctx.completedProcess.delayDays > 0
    ? `⚠️ 방금 완료된 '${ctx.completedProcess.name}'는 ${ctx.completedProcess.delayDays}일 지연되었습니다.`
    : `'${ctx.completedProcess.name}'이 정상 완료되었습니다.`

  return `인테리어·건설 현장의 다음 공종 리스크를 예측해주세요.

프로젝트: ${ctx.projectName} (업종: ${ctx.industry})
전체 진행률: ${ctx.overallProgress}%
체크리스트 완료율: ${ctx.checklistScore}%
미해결 이슈: ${ctx.hasOpenIssues ? '있음 (주의 필요)' : '없음'}

${delayNote}

[다음 예정 공종]
${nextProcessList}

---
아래 JSON 형식으로 답변해주세요. 모든 텍스트는 현장 소장이 바로 이해할 수 있는 친근한 존댓말로, 공감→설명→제안 순서로 작성하세요:

{
  "nextProcess": "가장 먼저 시작될 공종명",
  "riskLevel": "LOW|MED|HIGH|CRITICAL",
  "riskScore": 0~100,
  "reasons": ["리스크 근거 1", "리스크 근거 2"],
  "suggestions": ["대응 방안 1", "대응 방안 2"],
  "warnings": ["법적/안전 주의사항 (해당 시)"]
}

주의: riskLevel이 HIGH 또는 CRITICAL이면 반드시 구체적인 법적 근거나 안전기준을 포함하세요.`
}

// ═══════════════════════════════════════════════════════════
// JSON 파싱 헬퍼
// ═══════════════════════════════════════════════════════════

function parseRiskJson(raw: string): Partial<RiskPrediction> | null {
  try {
    const match = raw.match(/\{[\s\S]+\}/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════
// 메인 함수 — 다음 공종 리스크 예측
// ═══════════════════════════════════════════════════════════

export async function predictNextPhaseRisk(ctx: ProcessRiskContext): Promise<RiskPrediction> {
  const nextProcess = ctx.nextProcesses[0]?.name ?? '다음 공종'

  // 빠른 전환 위험 체크
  const transitionRisk = getTransitionRisk(ctx.completedProcess.name, nextProcess)

  const prompt = buildPredictionPrompt(ctx)

  const result = await brain({
    task: 'risk-predict',
    context: {
      userMessage: prompt,
      projectId: ctx.projectId,
    },
  })

  const parsed = parseRiskJson(result.answer)

  // AI 결과 + 전환 위험 병합
  const riskLevel = ((): RiskPrediction['riskLevel'] => {
    const aiLevel = (parsed?.riskLevel ?? 'MED') as RiskPrediction['riskLevel']
    if (transitionRisk === 'HIGH' && (aiLevel === 'LOW' || aiLevel === 'MED')) return 'HIGH'
    return aiLevel
  })()

  const riskScore = parsed?.riskScore ?? (
    riskLevel === 'CRITICAL' ? 90 :
    riskLevel === 'HIGH' ? 70 :
    riskLevel === 'MED' ? 45 : 20
  )

  const reasons = parsed?.reasons ?? [
    `${ctx.completedProcess.name} 완료 후 ${nextProcess} 단계로 전환됩니다.`,
    '현장 상태를 꼼꼼히 확인하고 다음 공정을 시작하세요.',
  ]

  const suggestions = parsed?.suggestions ?? [
    '작업 전 체크리스트를 확인해주세요.',
    '안전 장비 착용을 반드시 확인하세요.',
  ]

  const warnings: string[] = parsed?.warnings ?? []
  if (transitionRisk === 'HIGH' && warnings.length === 0) {
    warnings.push(`${ctx.completedProcess.name}에서 ${nextProcess}으로의 공종 전환 시 주의가 필요합니다.`)
  }

  return {
    projectId: ctx.projectId,
    nextProcess: parsed?.nextProcess ?? nextProcess,
    riskLevel,
    riskScore,
    reasons,
    suggestions,
    warnings,
    model: result.model,
  }
}

// ═══════════════════════════════════════════════════════════
// Supabase에서 예측 컨텍스트 수집
// ═══════════════════════════════════════════════════════════

export async function collectPredictionContext(
  projectId: string,
  completedProcessId: string,
  supabaseClient: any,
): Promise<ProcessRiskContext | null> {
  try {
    const [
      { data: project },
      { data: allProcesses },
      { data: diagnostics },
    ] = await Promise.all([
      supabaseClient.from('projects').select('name, industry').eq('id', projectId).single(),
      supabaseClient.from('processes').select('*').eq('project_id', projectId).order('order_index'),
      supabaseClient.from('diagnostic_responses').select('checked').eq('project_id', projectId),
    ])

    if (!project || !allProcesses) return null

    const completedProcess = allProcesses.find((p: any) => p.id === completedProcessId)
    if (!completedProcess) return null

    const completedIndex = allProcesses.indexOf(completedProcess)
    const nextProcesses = allProcesses.slice(completedIndex + 1).filter(
      (p: any) => p.status !== 'completed'
    )

    // 전체 진행률: 완료된 공정 비율
    const totalProcesses = allProcesses.length
    const completedCount = allProcesses.filter((p: any) => p.status === 'completed').length
    const overallProgress = totalProcesses > 0
      ? Math.round((completedCount / totalProcesses) * 100)
      : 0

    // 체크리스트 완료율
    const totalChecks = (diagnostics ?? []).length
    const completedChecks = (diagnostics ?? []).filter((d: any) => d.checked).length
    const checklistScore = totalChecks > 0
      ? Math.round((completedChecks / totalChecks) * 100)
      : 0

    // 지연 일수 계산
    let delayDays: number | undefined
    if (completedProcess.end_date) {
      const planned = new Date(completedProcess.end_date)
      const actual = new Date()
      const diff = Math.ceil((actual.getTime() - planned.getTime()) / 86400000)
      if (diff > 0) delayDays = diff
    }

    // 미해결 이슈 여부 (open 또는 reviewing 상태)
    const { data: openIssues } = await supabaseClient
      .from('site_issues')
      .select('id')
      .eq('project_id', projectId)
      .in('status', ['open', 'reviewing'])
      .limit(1)

    return {
      projectId,
      projectName: project.name,
      industry: project.industry || 'general',
      completedProcess: {
        name: completedProcess.name,
        status: completedProcess.status === 'delayed' ? 'delayed' : 'completed',
        progress: completedProcess.progress ?? 100,
        delayDays,
      },
      nextProcesses: nextProcesses.slice(0, 3).map((p: any) => ({
        name: p.name,
        status: p.status,
        plannedStartDate: p.start_date ?? undefined,
      })),
      overallProgress,
      checklistScore,
      hasOpenIssues: (openIssues?.length ?? 0) > 0,
    }
  } catch (err) {
    console.error('[PredictionEngine] 컨텍스트 수집 실패:', err)
    return null
  }
}
