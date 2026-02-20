/**
 * proactive-engine.ts — 체키 프로액티브 감지 엔진
 *
 * 사용자가 말하기 전에 체키가 먼저 감지하고 알린다.
 * 챗봇(반응형)이 아닌 AI 비서(능동형)의 핵심 엔진.
 *
 * 감지 항목:
 * 1. 하자담보 만료 임박 (D-30 이내)
 * 2. 미확인 AI 판정 (human_confirmed = false)
 * 3. 미해결 분쟁 징후
 * 4. 공정 완료 후 다음 단계 안내 미발송
 * 5. 오늘 일보 미작성
 */

import { createClient } from '@supabase/supabase-js'

// ═══════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════

export type ProactiveTriggerType =
  | 'WARRANTY_EXPIRING'      // 하자담보 만료 임박
  | 'AI_CHECK_PENDING'       // 미확인 AI 판정
  | 'DISPUTE_UNRESOLVED'     // 미해결 분쟁 징후
  | 'PROCESS_NEXT_STEP'      // 공정 완료 후 다음 단계
  | 'DAILY_REPORT_MISSING'   // 일보 미작성

export type ProactiveSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export interface ProactiveNotification {
  id: string
  triggerType: ProactiveTriggerType
  severity: ProactiveSeverity
  projectId: string | null
  projectName: string
  title: string
  message: string
  actionUrl: string | null
  actionLabel: string | null
  metadata: Record<string, unknown>
}

export interface ProactiveSummary {
  notifications: ProactiveNotification[]
  totalCount: number
  criticalCount: number
  warningCount: number
  infoCount: number
  hasUrgent: boolean
}

// ═══════════════════════════════════════════════════════════
// 개별 트리거 체크 함수
// ═══════════════════════════════════════════════════════════

/** 1. 하자담보 만료 임박 (D-30 이내) */
async function checkWarrantyExpiring(
  supabase: any,
  userId: string,
): Promise<ProactiveNotification[]> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

    const res = await supabase
      .from('warranty_tracking')
      .select('id, project_id, process_name, warranty_expires_date, projects(name, user_id)')
      .gte('warranty_expires_date', today)
      .lte('warranty_expires_date', thirtyDaysLater)
      .order('warranty_expires_date', { ascending: true })
      .limit(10)

    const data: any[] = (res as any).data ?? []
    if (data.length === 0) return []

    // 현재 사용자의 프로젝트만 필터링
    const userRecords: any[] = data.filter((r: any) => r.projects?.user_id === userId)

    return userRecords.map((record: any) => {
      const expiresDate = new Date(record.warranty_expires_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((expiresDate.getTime() - today.getTime()) / 86400000)
      const severity: ProactiveSeverity = daysLeft <= 7 ? 'CRITICAL' : 'WARNING'

      return {
        id: `warranty-${record.id}`,
        triggerType: 'WARRANTY_EXPIRING' as ProactiveTriggerType,
        severity,
        projectId: record.project_id,
        projectName: record.projects?.name ?? '알 수 없는 현장',
        title: `하자담보 만료 D-${daysLeft}`,
        message: `${record.projects?.name ?? '현장'}의 ${record.process_name} 하자담보가 ${daysLeft}일 후 만료돼요. 하자 있으면 지금 청구하세요!`,
        actionUrl: `/projects/${record.project_id}/process`,
        actionLabel: '공정 확인',
        metadata: {
          processName: record.process_name,
          expiresDate: record.warranty_expires_date,
          daysLeft,
        },
      }
    })
  } catch {
    return []
  }
}

/** 2. 미확인 AI 판정 (human_confirmed = false) */
async function checkAIPending(
  supabase: any,
  userId: string,
): Promise<ProactiveNotification[]> {
  try {
    const res = await supabase
      .from('ai_check_results')
      .select('id, project_id, go_no_go, created_at, projects(name, user_id)')
      .eq('human_confirmed', false)
      .order('created_at', { ascending: false })
      .limit(20)

    const data: any[] = (res as any).data ?? []
    if (data.length === 0) return []

    const userRecords: any[] = data.filter((r: any) => r.projects?.user_id === userId)
    if (userRecords.length === 0) return []

    // 프로젝트별로 그룹화
    const byProject = userRecords.reduce((acc: Record<string, any[]>, r: any) => {
      const pid = r.project_id
      if (!acc[pid]) acc[pid] = []
      acc[pid].push(r)
      return acc
    }, {})

    return (Object.entries(byProject) as [string, any[]][]).map(([projectId, records]) => {
      const sample = records[0]
      const noGoCount = records.filter((r: any) => r.go_no_go === 'NO-GO').length
      const severity: ProactiveSeverity = noGoCount > 0 ? 'CRITICAL' : 'INFO'

      return {
        id: `ai-pending-${projectId}`,
        triggerType: 'AI_CHECK_PENDING' as ProactiveTriggerType,
        severity,
        projectId,
        projectName: sample?.projects?.name ?? '알 수 없는 현장',
        title: `확인 대기 AI 판정 ${records.length}건${noGoCount > 0 ? ` (NO-GO ${noGoCount}건)` : ''}`,
        message: `${sample?.projects?.name ?? '현장'}에서 확인 대기 중인 AI 판정이 ${records.length}건 있어요${noGoCount > 0 ? ` — NO-GO 판정 포함!` : ''} 👀`,
        actionUrl: `/projects/${projectId}/evidence-package`,
        actionLabel: '판정 확인',
        metadata: { total: records.length, noGoCount },
      }
    })
  } catch {
    return []
  }
}

/** 3. 미해결 분쟁 징후 */
async function checkDisputeSignals(
  supabase: any,
  userId: string,
): Promise<ProactiveNotification[]> {
  try {
    const res = await supabase
      .from('dispute_signals')
      .select('id, project_id, signal_type, description, created_at, projects(name, user_id)')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(20)

    const data: any[] = (res as any).data ?? []
    if (data.length === 0) return []

    const userRecords: any[] = data.filter((r: any) => r.projects?.user_id === userId || r.user_id === userId)
    if (userRecords.length === 0) return []

    // 프로젝트별로 그룹화
    const byProject = userRecords.reduce((acc: Record<string, any[]>, r: any) => {
      const pid = r.project_id ?? 'no-project'
      if (!acc[pid]) acc[pid] = []
      acc[pid].push(r)
      return acc
    }, {})

    return (Object.entries(byProject) as [string, any[]][]).map(([projectId, records]) => {
      const sample = records[0]
      return {
        id: `dispute-${projectId}`,
        triggerType: 'DISPUTE_UNRESOLVED' as ProactiveTriggerType,
        severity: 'WARNING' as ProactiveSeverity,
        projectId: projectId === 'no-project' ? null : projectId,
        projectName: sample?.projects?.name ?? '알 수 없는 현장',
        title: `분쟁 징후 ${records.length}건 감지`,
        message: `${sample?.projects?.name ?? '현장'}에서 분쟁 징후가 감지됐어요 ⚠️ ${sample?.description ?? ''}`,
        actionUrl: projectId !== 'no-project' ? `/projects/${projectId}/changes` : '/dashboard',
        actionLabel: '분쟁 확인',
        metadata: { count: records.length, types: records.map((r: any) => r.signal_type) },
      }
    })
  } catch {
    return []
  }
}

/** 4. 공정 완료 후 다음 단계 안내 미발송 (완료된 지 24시간 이내) */
async function checkProcessNextStep(
  supabase: any,
  userId: string,
): Promise<ProactiveNotification[]> {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const res = await supabase
      .from('processes')
      .select('id, name, project_id, updated_at, projects(name, user_id)')
      .eq('status', 'completed')
      .gte('updated_at', yesterday)
      .order('updated_at', { ascending: false })
      .limit(10)

    const data: any[] = (res as any).data ?? []
    if (data.length === 0) return []

    const userRecords: any[] = data.filter((r: any) => r.projects?.user_id === userId)
    if (userRecords.length === 0) return []

    // 다음 공종 안내가 있는 경우만 (방수, 콘크리트, 전기 등)
    const NEXT_STEP_MAP: Record<string, string> = {
      방수: '24시간 양생 후 핀홀 테스트 → 타일 시공 가능',
      콘크리트: '28일 양생 확인 후 다음 공정 진행',
      방수공사: '24시간 양생 후 핀홀 테스트 → 타일 시공 가능',
      전기: '절연 테스트 후 마감 공정 진행',
      배관: '수압 테스트 후 마감 공정 진행',
      단열: '결로 방지 확인 후 마감 공정 진행',
      철거: '잔재물 처리 완료 후 다음 공정 진행',
    }

    return userRecords
      .filter((record: any) => {
        const name = record.name ?? ''
        return Object.keys(NEXT_STEP_MAP).some(k => name.includes(k))
      })
      .map((record: any) => {
        const name = record.name ?? ''
        const nextStep = Object.entries(NEXT_STEP_MAP).find(([k]) => name.includes(k))?.[1] ?? '다음 공정 확인 필요'
        return {
          id: `next-step-${record.id}`,
          triggerType: 'PROCESS_NEXT_STEP' as ProactiveTriggerType,
          severity: 'INFO' as ProactiveSeverity,
          projectId: record.project_id,
          projectName: record.projects?.name ?? '알 수 없는 현장',
          title: `${name} 완료 — 다음 단계 안내`,
          message: `${record.projects?.name ?? '현장'}의 ${name} 완료됐네요! ✅ ${nextStep}`,
          actionUrl: `/projects/${record.project_id}/process`,
          actionLabel: '공정 확인',
          metadata: { processName: name, nextStep },
        }
      })
  } catch {
    return []
  }
}

/** 5. 오늘 일보 미작성 (진행 중 프로젝트 중 오늘 일보 없는 것) */
async function checkDailyReportMissing(
  supabase: any,
  userId: string,
): Promise<ProactiveNotification[]> {
  try {
    const today = new Date().toISOString().split('T')[0]

    // 진행 중인 프로젝트 조회
    const projRes = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .limit(10)
    const projects: any[] = (projRes as any).data ?? []

    if (projects.length === 0) return []

    // 오늘 일보가 있는 프로젝트
    const repRes = await supabase
      .from('reports')
      .select('project_id')
      .in('project_id', projects.map((p: any) => p.id))
      .gte('created_at', `${today}T00:00:00`)
    const reports: any[] = (repRes as any).data ?? []

    const reportedProjectIds = new Set(reports.map((r: any) => r.project_id))
    const missingProjects: any[] = projects.filter((p: any) => !reportedProjectIds.has(p.id))

    if (missingProjects.length === 0) return []

    // 오전 9시 이후에만 알림 (너무 이른 알림 방지)
    const currentHour = new Date().getHours()
    if (currentHour < 17) return [] // 오후 5시 이후부터 알림

    return [{
      id: `daily-report-${today}`,
      triggerType: 'DAILY_REPORT_MISSING' as ProactiveTriggerType,
      severity: 'INFO' as ProactiveSeverity,
      projectId: missingProjects[0].id,
      projectName: missingProjects.length === 1
        ? missingProjects[0].name
        : `${missingProjects.length}개 현장`,
      title: `오늘 일보 ${missingProjects.length}건 미작성`,
      message: `${missingProjects.map((p: any) => p.name).join(', ')} 현장의 오늘 일보가 아직 없어요. 30초면 완료돼요 📋`,
      actionUrl: missingProjects.length === 1
        ? `/projects/${missingProjects[0].id}/report`
        : '/projects',
      actionLabel: '일보 작성',
      metadata: {
        projectCount: missingProjects.length,
        projects: missingProjects.map((p: any) => ({ id: p.id, name: p.name })),
      },
    }]
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════
// 메인 엔진 함수
// ═══════════════════════════════════════════════════════════

/**
 * 모든 프로액티브 트리거를 병렬로 체크하고 결과를 반환한다.
 * 서버 사이드에서만 호출 (SUPABASE_SERVICE_ROLE_KEY 필요).
 */
export async function runProactiveEngine(userId: string): Promise<ProactiveSummary> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return {
      notifications: [],
      totalCount: 0,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      hasUrgent: false,
    }
  }

  const supabase = createClient(url, key)

  // 5개 트리거 병렬 실행
  const [warranty, aiPending, disputes, nextStep, dailyReport] = await Promise.allSettled([
    checkWarrantyExpiring(supabase, userId),
    checkAIPending(supabase, userId),
    checkDisputeSignals(supabase, userId),
    checkProcessNextStep(supabase, userId),
    checkDailyReportMissing(supabase, userId),
  ])

  const notifications: ProactiveNotification[] = [
    ...(warranty.status === 'fulfilled' ? warranty.value : []),
    ...(aiPending.status === 'fulfilled' ? aiPending.value : []),
    ...(disputes.status === 'fulfilled' ? disputes.value : []),
    ...(nextStep.status === 'fulfilled' ? nextStep.value : []),
    ...(dailyReport.status === 'fulfilled' ? dailyReport.value : []),
  ]

  // 심각도 순으로 정렬
  const severityOrder: Record<ProactiveSeverity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 }
  notifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const criticalCount = notifications.filter(n => n.severity === 'CRITICAL').length
  const warningCount = notifications.filter(n => n.severity === 'WARNING').length
  const infoCount = notifications.filter(n => n.severity === 'INFO').length

  return {
    notifications,
    totalCount: notifications.length,
    criticalCount,
    warningCount,
    infoCount,
    hasUrgent: criticalCount > 0 || warningCount > 0,
  }
}

// ═══════════════════════════════════════════════════════════
// DB 저장 (Cron용)
// ═══════════════════════════════════════════════════════════

/**
 * 프로액티브 알림을 proactive_notifications 테이블에 저장한다.
 * Vercel Cron POST 핸들러에서 호출.
 */
export async function saveNotificationsToDb(
  userId: string,
  notifications: ProactiveNotification[],
  supabase: any,
): Promise<void> {
  if (notifications.length === 0) return

  const rows = notifications.map(n => ({
    user_id: userId,
    project_id: n.projectId,
    trigger_type: n.triggerType,
    severity: n.severity,
    title: n.title,
    message: n.message,
    action_url: n.actionUrl,
    action_label: n.actionLabel,
    metadata: n.metadata,
    read: false,
  }))

  await supabase.from('proactive_notifications').insert(rows)
}

// ═══════════════════════════════════════════════════════════
// 브리핑 텍스트 생성 (AI 없이, 규칙 기반)
// ═══════════════════════════════════════════════════════════

/**
 * 프로액티브 알림을 바탕으로 오늘 브리핑 텍스트를 생성한다.
 * brain.ts를 거치지 않고 규칙 기반으로 빠르게 생성.
 */
export function generateBriefingText(
  summary: ProactiveSummary,
  userName: string = '소장님',
): string {
  if (summary.totalCount === 0) {
    return `안녕하세요 ${userName} 👋\n오늘은 특별히 확인할 긴급 사항이 없어요. 현장 잘 진행되고 있네요! 👍`
  }

  const lines: string[] = [`안녕하세요 ${userName} 👋\n오늘 확인할 것들이에요:\n`]

  for (const n of summary.notifications.slice(0, 5)) {
    const icon = n.severity === 'CRITICAL' ? '🚨'
      : n.severity === 'WARNING' ? '⚠️'
      : '📋'
    lines.push(`${icon} ${n.projectName} — ${n.title}`)
  }

  if (summary.totalCount > 5) {
    lines.push(`\n그 외 ${summary.totalCount - 5}건 더 있어요.`)
  }

  const urgent = summary.notifications.find(n => n.severity === 'CRITICAL' || n.severity === 'WARNING')
  if (urgent) {
    lines.push(`\n제일 급한 ${urgent.projectName}부터 볼까요?`)
  }

  return lines.join('\n')
}
