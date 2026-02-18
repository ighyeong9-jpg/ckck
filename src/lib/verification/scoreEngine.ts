/**
 * AI 검증 점수 엔진
 * 4개 항목 × 25점 = 100점 만점
 *
 * 1. 비용 적정성 (cost_score): 견적 항목 존재, 비용분석 수행, 카테고리 다양성
 * 2. 공정 완성도 (process_score): 공정 등록, 완료율, 일정 설정
 * 3. 계약 안정성 (contract_score): 합의서, 증빙파일, 변경관리
 * 4. 일정 유효성 (schedule_score): 기한 내 진행, 지연 없음, 일정 설정 완료
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  ScoreBreakdown,
  CertificateGrade,
  CostScoreDetail,
  ProcessScoreDetail,
  ContractScoreDetail,
  ScheduleScoreDetail,
} from '@/types/verification'

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAdmin = ReturnType<typeof createAdminClient>

function getGrade(total: number): CertificateGrade {
  if (total >= 90) return 'A'
  if (total >= 75) return 'B'
  if (total >= 60) return 'C'
  if (total >= 40) return 'D'
  return 'F'
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

// ─── 1. 비용 적정성 (25점) ───────────────────────────

async function calculateCostScore(
  supabase: SupabaseAdmin,
  projectId: string
): Promise<{ score: number; details: CostScoreDetail }> {
  const { data: rawQuote } = await supabase
    .from('quote_line_items')
    .select('id, category, amount')
    .eq('project_id', projectId)

  const { data: rawCost } = await supabase
    .from('cost_analysis')
    .select('id, base_cost, adjusted_cost')
    .eq('project_id', projectId)

  const items = (rawQuote as any[] | null) || []
  const analysis = (rawCost as any[] | null) || []
  const hasQuoteItems = items.length > 0
  const hasCostAnalysis = analysis.length > 0

  const categories = new Set(items.map((i: any) => i.category))
  const categoryCount = categories.size

  let costVarianceRate: number | null = null
  if (hasCostAnalysis && analysis[0]) {
    const base = analysis[0].base_cost || 0
    const adjusted = analysis[0].adjusted_cost || 0
    if (base > 0) {
      costVarianceRate = Math.abs((adjusted - base) / base) * 100
    }
  }

  let score = 0

  // 견적 항목 존재 여부 (8점)
  if (hasQuoteItems) {
    if (items.length >= 10) score += 8
    else if (items.length >= 5) score += 6
    else score += 3
  }

  // 비용분석 수행 여부 (7점)
  if (hasCostAnalysis) score += 7

  // 카테고리 다양성 (5점)
  if (categoryCount >= 5) score += 5
  else if (categoryCount >= 3) score += 3
  else if (categoryCount >= 1) score += 1

  // 비용 차이율 적정성 (5점)
  if (costVarianceRate !== null) {
    if (costVarianceRate <= 5) score += 5
    else if (costVarianceRate <= 15) score += 3
    else if (costVarianceRate <= 30) score += 1
  }

  return {
    score: clamp(score, 0, 25),
    details: { hasQuoteItems, hasCostAnalysis, quoteItemCount: items.length, costVarianceRate, categoryCount },
  }
}

// ─── 2. 공정 완성도 (25점) ───────────────────────────

async function calculateProcessScore(
  supabase: SupabaseAdmin,
  projectId: string
): Promise<{ score: number; details: ProcessScoreDetail }> {
  const { data: rawProc } = await supabase
    .from('processes')
    .select('id, status, progress, start_date, end_date')
    .eq('project_id', projectId)

  const items = (rawProc as any[] | null) || []
  const total = items.length
  const completed = items.filter((p: any) => p.status === 'completed').length
  const inProgress = items.filter((p: any) => p.status === 'in_progress').length
  const delayed = items.filter((p: any) => p.status === 'delayed').length
  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const withDates = items.filter((p: any) => p.start_date && p.end_date).length
  const hasAllDates = total > 0 && withDates === total

  let score = 0

  // 공정 등록 (6점)
  if (total >= 8) score += 6
  else if (total >= 5) score += 4
  else if (total >= 1) score += 2

  // 완료율 (10점)
  score += Math.round((completionRate / 100) * 10)

  // 일정 설정 완료 (5점)
  if (hasAllDates) score += 5
  else if (total > 0) score += Math.round((withDates / total) * 5)

  // 지연 없음 보너스 (4점)
  if (total > 0) {
    if (delayed === 0) score += 4
    else if (delayed <= 1) score += 2
    else if (delayed <= 2) score += 1
  }

  return {
    score: clamp(score, 0, 25),
    details: { totalProcesses: total, completedProcesses: completed, inProgressProcesses: inProgress, delayedProcesses: delayed, completionRate: Math.round(completionRate), hasAllDates },
  }
}

// ─── 3. 계약 안정성 (25점) ───────────────────────────

async function calculateContractScore(
  supabase: SupabaseAdmin,
  projectId: string
): Promise<{ score: number; details: ContractScoreDetail }> {
  const { data: rawAgree } = await supabase
    .from('agreements')
    .select('id, status')
    .eq('project_id', projectId)

  const { data: rawEvid } = await supabase
    .from('evidence_files')
    .select('id')
    .eq('project_id', projectId)

  const { data: rawChange } = await supabase
    .from('change_orders')
    .select('id, status')
    .eq('project_id', projectId)

  const agreeItems = (rawAgree as any[] | null) || []
  const evidItems = (rawEvid as any[] | null) || []
  const changeItems = (rawChange as any[] | null) || []

  const hasAgreement = agreeItems.length > 0
  const hasEvidenceFiles = evidItems.length > 0
  const resolvedChanges = changeItems.filter(
    (c: any) => c.status === 'approved' || c.status === 'completed'
  ).length

  let score = 0

  // 합의서 존재 (8점)
  if (hasAgreement) {
    if (agreeItems.length >= 3) score += 8
    else if (agreeItems.length >= 2) score += 6
    else score += 4
  }

  // 증빙 파일 (8점)
  if (hasEvidenceFiles) {
    if (evidItems.length >= 10) score += 8
    else if (evidItems.length >= 5) score += 6
    else if (evidItems.length >= 1) score += 3
  }

  // 변경관리 (9점)
  if (changeItems.length === 0) {
    score += 7
  } else {
    const resolveRate = resolvedChanges / changeItems.length
    score += Math.round(resolveRate * 9)
  }

  return {
    score: clamp(score, 0, 25),
    details: { hasAgreement, hasEvidenceFiles, agreementCount: agreeItems.length, evidenceFileCount: evidItems.length, changeOrderCount: changeItems.length, resolvedChangeCount: resolvedChanges },
  }
}

// ─── 4. 일정 유효성 (25점) ───────────────────────────

async function calculateScheduleScore(
  supabase: SupabaseAdmin,
  projectId: string
): Promise<{ score: number; details: ScheduleScoreDetail }> {
  const { data: rawProject } = await supabase
    .from('projects')
    .select('start_date, end_date, status')
    .eq('id', projectId)
    .single()

  const project = rawProject as { start_date: string; end_date: string; status: string } | null

  const { data: rawProc } = await supabase
    .from('processes')
    .select('id, status, start_date, end_date')
    .eq('project_id', projectId)

  const procs = (rawProc as any[] | null) || []
  const delayed = procs.filter((p: any) => p.status === 'delayed').length
  const withDates = procs.filter((p: any) => p.start_date && p.end_date).length

  const now = new Date()
  let isWithinSchedule = true
  let daysRemaining: number | null = null
  let totalDuration: number | null = null

  if (project?.start_date && project?.end_date) {
    const start = new Date(project.start_date)
    const end = new Date(project.end_date)
    totalDuration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    isWithinSchedule = now <= end
  }

  let score = 0

  // 프로젝트 기한 내 진행 (8점)
  if (project?.start_date && project?.end_date) {
    if (isWithinSchedule) score += 8
    else if (daysRemaining !== null && daysRemaining >= -7) score += 4
    else score += 1
  }

  // 지연 공정 없음 (8점)
  if (procs.length > 0) {
    if (delayed === 0) score += 8
    else if (delayed === 1) score += 5
    else if (delayed <= 2) score += 2
  } else {
    score += 4
  }

  // 공정 일정 설정 비율 (5점)
  if (procs.length > 0) {
    score += Math.round((withDates / procs.length) * 5)
  }

  // 총 공기 적절성 (4점)
  if (totalDuration !== null) {
    if (totalDuration >= 14 && totalDuration <= 365) score += 4
    else if (totalDuration >= 7) score += 2
    else score += 1
  }

  return {
    score: clamp(score, 0, 25),
    details: { isWithinSchedule, daysRemaining, totalDuration, delayedProcessCount: delayed, processesWithDates: withDates, totalProcesses: procs.length },
  }
}

// ─── 통합 점수 계산 ───────────────────────────────────

export async function calculateVerificationScore(
  projectId: string
): Promise<ScoreBreakdown> {
  const supabase = createAdminClient()

  const [cost, process, contract, schedule] = await Promise.all([
    calculateCostScore(supabase, projectId),
    calculateProcessScore(supabase, projectId),
    calculateContractScore(supabase, projectId),
    calculateScheduleScore(supabase, projectId),
  ])

  const total = cost.score + process.score + contract.score + schedule.score
  const grade = getGrade(total)

  return { cost, process, contract, schedule, total, grade }
}
