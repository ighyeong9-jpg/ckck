/**
 * alert-engine.ts — 이상 감지 및 알림 엔진
 *
 * 흐름:
 * 스케줄 / 이벤트 트리거
 *   → 프로젝트 현황 데이터 수집
 *   → 규칙 기반 이상 탐지 (즉시)
 *   → brain.ts alert-analyze 태스크 (AI 심층 분석)
 *   → Alert 목록 반환
 *   → RISK_HIGH_DETECTED 이벤트 발행
 */

import { brain } from '@/lib/ai/brain'

// ═══════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════

export type AlertSeverity = 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL'
export type AlertCategory =
  | 'DEADLINE'      // 마감 관련
  | 'CHECKLIST'     // 체크리스트 미완
  | 'RISK_SCORE'    // 리스크 점수 급등
  | 'PROCESS'       // 공정 지연/누락
  | 'MATERIAL'      // 자재 부족/지연
  | 'WORKFORCE'     // 인력 이상
  | 'DISPUTE'       // 기록 관리 징후
  | 'AI_DETECTED'   // AI 감지 이상

export interface Alert {
  id: string                   // 고유 ID (임시)
  projectId: string
  projectName: string
  severity: AlertSeverity
  category: AlertCategory
  title: string
  message: string              // 공감→설명→제안 톤
  action?: string              // 권장 액션 텍스트
  actionUrl?: string           // 바로가기 경로
  detectedAt: string           // ISO timestamp
  aiGenerated: boolean
}

export interface AlertContext {
  projectId: string
  projectName: string
  status: string
  endDate: string | null
  riskScore: number
  progress: number
  processes: {
    name: string
    status: string
    endDate: string | null
  }[]
  checklistProgress: {
    total: number
    completed: number
  }
  pendingChangeOrders: number
  materials: {
    name: string
    status: string
  }[]
  recentAiChecks: {
    goNoGo: string
    issues: string[]
  }[]
}

// ═══════════════════════════════════════════════════════════
// 규칙 기반 이상 탐지 (즉각 반응, AI 호출 없음)
// ═══════════════════════════════════════════════════════════

function detectRuleBasedAlerts(ctx: AlertContext): Alert[] {
  const alerts: Alert[] = []
  const now = new Date()

  // 1. 마감 임박/초과
  if (ctx.endDate && ctx.status !== 'completed') {
    const endDate = new Date(ctx.endDate)
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000)

    if (daysLeft < 0) {
      alerts.push({
        id: `deadline-overdue-${ctx.projectId}`,
        projectId: ctx.projectId,
        projectName: ctx.projectName,
        severity: 'CRITICAL',
        category: 'DEADLINE',
        title: '마감일이 지났어요',
        message: `${ctx.projectName} 프로젝트의 예정 마감일(${ctx.endDate})이 ${Math.abs(daysLeft)}일 지났습니다. 고객과 일정을 조율하고, 지연 사유와 새 마감일을 합의서에 기록해두세요.`,
        action: '합의서 작성',
        actionUrl: `/projects/${ctx.projectId}/agreement`,
        detectedAt: now.toISOString(),
        aiGenerated: false,
      })
    } else if (daysLeft <= 3) {
      alerts.push({
        id: `deadline-soon-${ctx.projectId}`,
        projectId: ctx.projectId,
        projectName: ctx.projectName,
        severity: 'DANGER',
        category: 'DEADLINE',
        title: `마감 ${daysLeft}일 전이에요`,
        message: `${ctx.projectName}의 마감이 ${daysLeft}일 남았어요. 완료되지 않은 공정이 있다면 지금 바로 확인이 필요합니다.`,
        action: '공정 현황 확인',
        actionUrl: `/projects/${ctx.projectId}/process`,
        detectedAt: now.toISOString(),
        aiGenerated: false,
      })
    } else if (daysLeft <= 7) {
      alerts.push({
        id: `deadline-week-${ctx.projectId}`,
        projectId: ctx.projectId,
        projectName: ctx.projectName,
        severity: 'WARNING',
        category: 'DEADLINE',
        title: `마감 1주일 전이에요`,
        message: `${ctx.projectName}의 마감이 7일 이내예요. 남은 작업을 점검하고 일정을 정리해두세요.`,
        action: '일정 확인',
        actionUrl: `/projects/${ctx.projectId}/process`,
        detectedAt: now.toISOString(),
        aiGenerated: false,
      })
    }
  }

  // 2. 고위험 리스크 점수
  if (ctx.riskScore >= 80) {
    alerts.push({
      id: `risk-critical-${ctx.projectId}`,
      projectId: ctx.projectId,
      projectName: ctx.projectName,
      severity: 'CRITICAL',
      category: 'RISK_SCORE',
      title: '리스크 점수가 매우 높아요',
      message: `현재 리스크 점수가 ${ctx.riskScore}점으로 F등급입니다. 즉시 체크리스트를 확인하고 리스크 요인을 해소해주세요. 방치하면 기록 관리 또는 법적 문제로 이어질 수 있습니다.`,
      action: '진단 체크리스트 확인',
      actionUrl: `/projects/${ctx.projectId}/diagnostic`,
      detectedAt: now.toISOString(),
      aiGenerated: false,
    })
  } else if (ctx.riskScore >= 60) {
    alerts.push({
      id: `risk-high-${ctx.projectId}`,
      projectId: ctx.projectId,
      projectName: ctx.projectName,
      severity: 'DANGER',
      category: 'RISK_SCORE',
      title: '리스크 점수를 확인해주세요',
      message: `현재 리스크 점수가 ${ctx.riskScore}점(D등급)입니다. 체크리스트 미완료 항목과 공정 현황을 점검하세요.`,
      action: '리스크 분석 보기',
      actionUrl: `/projects/${ctx.projectId}/diagnostic`,
      detectedAt: now.toISOString(),
      aiGenerated: false,
    })
  }

  // 3. 체크리스트 완료율 저조
  const { total, completed } = ctx.checklistProgress
  if (total > 0) {
    const pct = Math.round((completed / total) * 100)
    if (pct < 30 && ctx.progress > 50) {
      alerts.push({
        id: `checklist-low-${ctx.projectId}`,
        projectId: ctx.projectId,
        projectName: ctx.projectName,
        severity: 'WARNING',
        category: 'CHECKLIST',
        title: '체크리스트 완료율이 낮아요',
        message: `공정 진행률(${ctx.progress}%)에 비해 체크리스트 완료율(${pct}%)이 너무 낮습니다. 기록되지 않은 작업은 추후 기록 관리 시 시공 기록이 없을 수 있어요. 지금 체크리스트를 작성해주세요.`,
        action: '체크리스트 작성',
        actionUrl: `/projects/${ctx.projectId}/diagnostic`,
        detectedAt: now.toISOString(),
        aiGenerated: false,
      })
    }
  }

  // 4. 지연된 공정
  const delayedProcesses = ctx.processes.filter(p => p.status === 'delayed')
  if (delayedProcesses.length > 0) {
    alerts.push({
      id: `process-delayed-${ctx.projectId}`,
      projectId: ctx.projectId,
      projectName: ctx.projectName,
      severity: 'WARNING',
      category: 'PROCESS',
      title: `지연 중인 공정 ${delayedProcesses.length}건`,
      message: `${delayedProcesses.map(p => p.name).join(', ')} 공정이 지연 중입니다. 지연 사유를 기록하고 변경관리에 반영해주세요.`,
      action: '변경관리 등록',
      actionUrl: `/projects/${ctx.projectId}/changes`,
      detectedAt: now.toISOString(),
      aiGenerated: false,
    })
  }

  // 5. 승인 대기 변경사항
  if (ctx.pendingChangeOrders > 0) {
    alerts.push({
      id: `change-pending-${ctx.projectId}`,
      projectId: ctx.projectId,
      projectName: ctx.projectName,
      severity: 'INFO',
      category: 'DISPUTE',
      title: `승인 대기 변경사항 ${ctx.pendingChangeOrders}건`,
      message: `검토가 필요한 변경사항이 ${ctx.pendingChangeOrders}건 있어요. 고객 확인 전에 공사를 진행하면 추후 기록 관리이 생길 수 있습니다.`,
      action: '변경사항 확인',
      actionUrl: `/projects/${ctx.projectId}/changes`,
      detectedAt: now.toISOString(),
      aiGenerated: false,
    })
  }

  // 6. AI 체크 위험 확인
  const noGoChecks = ctx.recentAiChecks.filter(c => c.goNoGo === '위험 확인')
  if (noGoChecks.length > 0) {
    const issues = noGoChecks.flatMap(c => c.issues).slice(0, 3)
    alerts.push({
      id: `ai-nogo-${ctx.projectId}`,
      projectId: ctx.projectId,
      projectName: ctx.projectName,
      severity: 'DANGER',
      category: 'AI_DETECTED',
      title: 'AI가 현장 이상을 감지했어요',
      message: `최근 사진 분석에서 기준 미달 항목이 발견되었습니다. ${issues.length > 0 ? issues[0] : '증빙 패키지에서 상세 내용을 확인하세요.'}`,
      action: '증빙 확인',
      actionUrl: `/projects/${ctx.projectId}/evidence-package`,
      detectedAt: now.toISOString(),
      aiGenerated: true,
    })
  }

  return alerts
}

// ═══════════════════════════════════════════════════════════
// AI 심층 분석 (복합 패턴 감지)
// ═══════════════════════════════════════════════════════════

async function detectAIAlerts(ctx: AlertContext): Promise<Alert[]> {
  // 단순 케이스는 AI 없이 처리
  if (ctx.riskScore < 40 && ctx.processes.every(p => p.status !== 'delayed')) {
    return []
  }

  const prompt = `건설/인테리어 현장 데이터를 분석해서 숨겨진 리스크나 이상 징후를 찾아주세요.

프로젝트: ${ctx.projectName}
상태: ${ctx.status} | 리스크 점수: ${ctx.riskScore} | 진행률: ${ctx.progress}%
마감일: ${ctx.endDate ?? '미설정'}

공정 현황:
${ctx.processes.map(p => `- ${p.name}: ${p.status}${p.endDate ? ` (예정: ${p.endDate})` : ''}`).join('\n')}

체크리스트: ${ctx.checklistProgress.completed}/${ctx.checklistProgress.total} 완료
승인 대기 변경사항: ${ctx.pendingChangeOrders}건

---
위 데이터에서 명백한 이상이 아닌, 숨겨진 패턴이나 복합 리스크를 1~2개만 찾아주세요.
없으면 빈 배열 반환.

[{"title": "...", "message": "공감→설명→제안 톤 한국어", "severity": "WARNING|DANGER", "action": "권장 액션"}]`

  try {
    const result = await brain({
      task: 'alert-analyze',
      context: { userMessage: prompt, projectId: ctx.projectId },
    })

    const match = result.answer.match(/\[[\s\S]+\]/)
    if (!match) return []

    const parsed = JSON.parse(match[0]) as Array<{
      title: string
      message: string
      severity: string
      action?: string
    }>

    return parsed.slice(0, 2).map((item, i) => ({
      id: `ai-complex-${ctx.projectId}-${i}`,
      projectId: ctx.projectId,
      projectName: ctx.projectName,
      severity: (item.severity as AlertSeverity) ?? 'WARNING',
      category: 'AI_DETECTED' as AlertCategory,
      title: item.title,
      message: item.message,
      action: item.action,
      actionUrl: `/projects/${ctx.projectId}/diagnostic`,
      detectedAt: new Date().toISOString(),
      aiGenerated: true,
    }))
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════
// 메인 함수 — 프로젝트 알림 분석
// ═══════════════════════════════════════════════════════════

export async function analyzeProjectAlerts(ctx: AlertContext): Promise<Alert[]> {
  const [ruleAlerts, aiAlerts] = await Promise.all([
    Promise.resolve(detectRuleBasedAlerts(ctx)),
    detectAIAlerts(ctx),
  ])

  // 중복 제거 + 심각도 순 정렬
  const all = [...ruleAlerts, ...aiAlerts]
  const severityOrder: Record<AlertSeverity, number> = {
    CRITICAL: 0, DANGER: 1, WARNING: 2, INFO: 3
  }

  return all.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

// ═══════════════════════════════════════════════════════════
// Supabase에서 알림 컨텍스트 수집
// ═══════════════════════════════════════════════════════════

export async function collectAlertContext(
  projectId: string,
  supabaseClient: any,
): Promise<AlertContext | null> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const [
      { data: project },
      { data: processes },
      { data: diagnostics },
      { data: changeOrders },
      { data: materials },
      { data: aiChecks },
    ] = await Promise.all([
      supabaseClient.from('projects').select('name,status,end_date,risk_score,progress').eq('id', projectId).single(),
      supabaseClient.from('processes').select('name,status,end_date').eq('project_id', projectId),
      supabaseClient.from('diagnostic_responses').select('checked').eq('project_id', projectId),
      supabaseClient.from('change_orders').select('status').eq('project_id', projectId).eq('status', 'requested'),
      supabaseClient.from('materials').select('name,status').eq('project_id', projectId),
      supabaseClient.from('ai_check_results').select('go_no_go,issues').eq('project_id', projectId)
        .gte('created_at', `${yesterday}T00:00:00`),
    ])

    if (!project) return null

    return {
      projectId,
      projectName: project.name,
      status: project.status,
      endDate: project.end_date,
      riskScore: project.risk_score ?? 0,
      progress: project.progress ?? 0,
      processes: (processes ?? []).map((p: any) => ({
        name: p.name,
        status: p.status,
        endDate: p.end_date,
      })),
      checklistProgress: {
        total: (diagnostics ?? []).length,
        completed: (diagnostics ?? []).filter((d: any) => d.checked).length,
      },
      pendingChangeOrders: (changeOrders ?? []).length,
      materials: (materials ?? []).map((m: any) => ({ name: m.name, status: m.status })),
      recentAiChecks: (aiChecks ?? []).map((r: any) => ({
        goNoGo: r.go_no_go,
        issues: r.issues ?? [],
      })),
    }
  } catch (err) {
    console.error('[AlertEngine] 컨텍스트 수집 실패:', err)
    return null
  }
}
