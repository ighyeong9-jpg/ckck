/**
 * report-writer.ts — 일보/주보 자동 작성 엔진
 *
 * 흐름:
 * 일과 종료 (DAILY_END 이벤트)
 *   → 오늘 현장 데이터 수집 (공정·인력·자재·체크리스트·이슈)
 *   → brain.ts report-write 태스크 호출
 *   → 일보 초안 생성
 *   → DB 저장 (human_confirmed = false)
 *   → 담당자는 [확인] 버튼 하나만
 */

import { brain } from '@/lib/ai/brain'

// ═══════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════

export interface DailyReportContext {
  projectId: string
  projectName: string
  date: string                          // YYYY-MM-DD
  processes: {
    name: string
    status: string
    progress: number
  }[]
  workforce: {
    name: string
    role: string
    status: string
    hoursWorked: number
  }[]
  materials: {
    name: string
    category: string
    status: string
    quantity: number
  }[]
  checklistProgress: {
    total: number
    completed: number
    percentage: number
  }
  changeOrders: {
    title: string
    status: string
    costChange: number
  }[]
  aiCheckResults?: {
    goNoGo: string
    detectedProcess: string
    issues: string[]
  }[]
  issues?: string[]                     // 현장 이슈 메모
}

export interface DailyReportDraft {
  title: string
  date: string
  projectName: string
  content: string                       // AI 생성 본문
  summary: {
    workersToday: number
    processesInProgress: number
    checklistProgress: number
    hasCriticalIssue: boolean
  }
  model: 'gemini' | 'claude'
}

// ═══════════════════════════════════════════════════════════
// 일보 프롬프트 생성
// ═══════════════════════════════════════════════════════════

function buildReportPrompt(ctx: DailyReportContext): string {
  const processLines = ctx.processes
    .map(p => `- ${p.name}: ${p.status === 'completed' ? '완료' : p.status === 'in_progress' ? '진행중' : '대기'} (${p.progress}%)`)
    .join('\n') || '공정 정보 없음'

  const workforceLines = ctx.workforce
    .filter(w => w.status !== 'absent')
    .map(w => `- ${w.name} (${w.role}): ${w.hoursWorked}시간 근무`)
    .join('\n') || '출근 인력 없음'

  const materialLines = ctx.materials
    .filter(m => m.status === 'delivered' || m.status === 'ordered')
    .map(m => `- ${m.name} (${m.category}): ${m.status === 'delivered' ? '입고완료' : '발주중'} ${m.quantity}개`)
    .join('\n') || '자재 변동 없음'

  const aiIssues = (ctx.aiCheckResults ?? [])
    .filter(r => r.goNoGo === '위험 확인')
    .flatMap(r => r.issues)

  const allIssues = [...(ctx.issues ?? []), ...aiIssues]
  const issueLines = allIssues.length > 0
    ? allIssues.map(i => `- ${i}`).join('\n')
    : '특이사항 없음'

  const changeLines = ctx.changeOrders
    .map(c => `- ${c.title}: ${c.status === 'approved' ? '승인됨' : '검토중'} (${c.costChange >= 0 ? '+' : ''}${c.costChange.toLocaleString()}원)`)
    .join('\n') || '변경사항 없음'

  return `다음 현장 데이터를 바탕으로 오늘(${ctx.date}) 현장 일보 초안을 작성해주세요.

프로젝트명: ${ctx.projectName}
작성일: ${ctx.date}

## 오늘 데이터

[공정 현황]
${processLines}
체크리스트 완료율: ${ctx.checklistProgress.percentage}% (${ctx.checklistProgress.completed}/${ctx.checklistProgress.total}항목)

[출근 인력]
${workforceLines}
총 출근: ${ctx.workforce.filter(w => w.status !== 'absent').length}명

[자재 현황]
${materialLines}

[변경사항]
${changeLines}

[현장 이슈]
${issueLines}

---
아래 형식으로 법적 효력이 있는 현장 일보를 작성해주세요:
1. 오늘 작업 요약 (2~3줄)
2. 공정별 진행 현황
3. 투입 인력 현황
4. 자재 입고/사용 현황
5. 특이사항 및 조치사항
6. 내일 예정 작업
7. 담당자 확인 필요 항목

존댓말, 간결하게, 담당자가 [확인] 버튼 하나로 완료할 수 있는 수준으로 작성하세요.`
}

// ═══════════════════════════════════════════════════════════
// 메인 함수 — 일보 초안 생성
// ═══════════════════════════════════════════════════════════

export async function writeDailyReport(ctx: DailyReportContext): Promise<DailyReportDraft> {
  const prompt = buildReportPrompt(ctx)

  const result = await brain({
    task: 'report-write',
    context: {
      userMessage: prompt,
      projectId: ctx.projectId,
    },
  })

  const hasCriticalIssue =
    (ctx.aiCheckResults ?? []).some(r => r.goNoGo === '위험 확인') ||
    (ctx.issues ?? []).length > 0

  return {
    title: `${ctx.date} 현장 일보 — ${ctx.projectName}`,
    date: ctx.date,
    projectName: ctx.projectName,
    content: result.answer,
    summary: {
      workersToday: ctx.workforce.filter(w => w.status !== 'absent').length,
      processesInProgress: ctx.processes.filter(p => p.status === 'in_progress').length,
      checklistProgress: ctx.checklistProgress.percentage,
      hasCriticalIssue,
    },
    model: result.model,
  }
}

// ═══════════════════════════════════════════════════════════
// Supabase에서 일보 컨텍스트 데이터 수집
// ═══════════════════════════════════════════════════════════

export async function collectDailyContext(
  projectId: string,
  date: string,            // YYYY-MM-DD
  supabaseClient: any,
): Promise<DailyReportContext | null> {
  try {
    const [
      { data: project },
      { data: processes },
      { data: workforce },
      { data: materials },
      { data: diagnostics },
      { data: changeOrders },
      { data: aiChecks },
    ] = await Promise.all([
      supabaseClient.from('projects').select('name').eq('id', projectId).single(),
      supabaseClient.from('processes').select('name,status,progress').eq('project_id', projectId),
      supabaseClient.from('workforce').select('name,role,status,hours_worked').eq('project_id', projectId).eq('work_date', date),
      supabaseClient.from('materials').select('name,category,status,quantity').eq('project_id', projectId),
      supabaseClient.from('diagnostic_responses').select('checked').eq('project_id', projectId),
      supabaseClient.from('change_orders').select('title,status,cost_change').eq('project_id', projectId),
      supabaseClient.from('ai_check_results').select('go_no_go,detected_process,issues').eq('project_id', projectId).gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`),
    ])

    if (!project) return null

    const totalChecks = (diagnostics ?? []).length
    const completedChecks = (diagnostics ?? []).filter((d: any) => d.checked).length

    return {
      projectId,
      projectName: project.name,
      date,
      processes: (processes ?? []).map((p: any) => ({
        name: p.name,
        status: p.status,
        progress: p.progress,
      })),
      workforce: (workforce ?? []).map((w: any) => ({
        name: w.name,
        role: w.role,
        status: w.status,
        hoursWorked: w.hours_worked,
      })),
      materials: (materials ?? []).map((m: any) => ({
        name: m.name,
        category: m.category,
        status: m.status,
        quantity: m.quantity,
      })),
      checklistProgress: {
        total: totalChecks,
        completed: completedChecks,
        percentage: totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0,
      },
      changeOrders: (changeOrders ?? []).map((c: any) => ({
        title: c.title,
        status: c.status,
        costChange: c.cost_change,
      })),
      aiCheckResults: (aiChecks ?? []).map((r: any) => ({
        goNoGo: r.go_no_go,
        detectedProcess: r.detected_process,
        issues: r.issues ?? [],
      })),
    }
  } catch (err) {
    console.error('[ReportWriter] 컨텍스트 수집 실패:', err)
    return null
  }
}
