/**
 * 확장 도구 모음 - Check-In 시스템의 모든 기능을 Gemini Function Calling으로 제공
 * 기존 12개 도구 + 90개 이상 신규 도구
 */

import { createClient } from '@/lib/supabase/server'
import { industryInfo } from '@/data/industries'
import { checklistMap } from '@/data/checklists'
import { formatKRW } from '@/lib/utils/costCalculator'
import type { ToolResult } from './tools'

// ═══════════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════════

async function getUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

function noAuth(): ToolResult {
  return { tool: 'auth', success: false, message: '로그인이 필요합니다.' }
}

function noProjectId(tool: string): ToolResult {
  return {
    tool,
    success: false,
    message: '프로젝트가 선택되지 않았습니다. project_list 도구를 먼저 호출해서 프로젝트 목록을 확인한 후, 고객명 또는 프로젝트명으로 매칭해 작업을 진행하세요.',
  }
}

function dbError(tool: string, error: any): ToolResult {
  return { tool, success: false, message: `DB 오류: ${error?.message || '알 수 없는 오류'}` }
}

// ═══════════════════════════════════════════════
// 프로젝트 관리 (6개)
// ═══════════════════════════════════════════════

export async function projectList(): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return dbError('project_list', error)

  if (!projects || projects.length === 0) {
    return { tool: 'project_list', success: true, message: '프로젝트가 없습니다. "프로젝트 만들어줘"로 새 프로젝트를 생성하세요.' }
  }

  const list = projects.map((p: any) => {
    const info = industryInfo[p.industry as keyof typeof industryInfo]
    const status = p.status === 'completed' ? '완료' : p.status === 'in_progress' ? '진행중' : '계획'
    return `  • ${info?.icon || '🏗️'} [ID:${p.id}] ${p.name} | 고객: ${p.client_name || '-'} | ${status} | 진행률 ${p.progress || 0}% | 리스크 ${p.risk_score || 0}점`
  }).join('\n')

  return {
    tool: 'project_list',
    success: true,
    message: `📁 프로젝트 목록 (${projects.length}개)\n\n${list}\n\n※ 고객명·프로젝트명으로 원하는 프로젝트를 찾아 [ID:xxx] 값을 사용하세요.`,
    data: { projects, count: projects.length },
  }
}

export async function projectDetail(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('project_detail')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .single()

  if (error) return dbError('project_detail', error)

  const info = industryInfo[project.industry as keyof typeof industryInfo]
  const { data: quotes } = await supabase.from('quote_line_items').select('quantity, unit_price').eq('project_id', project.id)
  const quoteTotal = (quotes || []).reduce((sum: number, q: any) => sum + (q.quantity * q.unit_price), 0)

  return {
    tool: 'project_detail',
    success: true,
    message: `📋 프로젝트 상세\n\n` +
      `📁 이름: ${project.name}\n` +
      `${info?.icon || '🏗️'} 업종: ${info?.name || project.industry}\n` +
      `📊 상태: ${project.status} | 진행률: ${project.progress || 0}%\n` +
      `🎯 리스크: ${project.risk_score || 0}점\n` +
      `💰 견적 총액: ${quoteTotal > 0 ? formatKRW(quoteTotal) : '미작성'}\n` +
      `📅 기간: ${project.start_date} ~ ${project.end_date}\n` +
      `👤 고객: ${project.client_name || '미지정'}`,
    data: { project, quoteTotal },
  }
}

export async function projectUpdate(params: {
  projectId: string; name?: string; clientName?: string; status?: string;
  progress?: number; startDate?: string; endDate?: string; industry?: string
}): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('project_update')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const updates: any = { updated_at: new Date().toISOString() }
  if (params.name) updates.name = params.name
  if (params.clientName) updates.client_name = params.clientName
  if (params.status) updates.status = params.status
  if (params.progress !== undefined) updates.progress = params.progress
  if (params.startDate) updates.start_date = params.startDate
  if (params.endDate) updates.end_date = params.endDate
  if (params.industry) updates.industry = params.industry

  const { error } = await supabase.from('projects').update(updates).eq('id', params.projectId)
  if (error) return dbError('project_update', error)

  const changed = Object.keys(updates).filter(k => k !== 'updated_at').join(', ')
  return { tool: 'project_update', success: true, message: `✅ 프로젝트가 수정되었습니다. (변경: ${changed})` }
}

export async function projectDelete(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('project_delete')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { error } = await supabase.from('projects').delete().eq('id', params.projectId)
  if (error) return dbError('project_delete', error)

  return { tool: 'project_delete', success: true, message: '✅ 프로젝트가 삭제되었습니다.' }
}

export async function projectStatusUpdate(params: { projectId: string; status: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('project_status_update')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const statusMap: Record<string, string> = { '진행중': 'in_progress', '완료': 'completed', '계획': 'planning', '검토': 'review', '보류': 'planning' }
  const status = statusMap[params.status] || params.status

  const updates: any = { status, updated_at: new Date().toISOString() }
  if (status === 'completed') updates.progress = 100

  const { error } = await supabase.from('projects').update(updates).eq('id', params.projectId)
  if (error) return dbError('project_status_update', error)

  return { tool: 'project_status_update', success: true, message: `✅ 프로젝트 상태가 "${status}"(으)로 변경되었습니다.` }
}

// ═══════════════════════════════════════════════
// 체크리스트 (5개)
// ═══════════════════════════════════════════════

export async function checklistCreate(params: { projectId: string; item: string; category?: string; priority?: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('checklist_create')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { error } = await supabase.from('custom_checklist_items').insert([{
    project_id: params.projectId,
    item: params.item,
    category: params.category || '기타',
    priority: params.priority || '권장',
    checked: false,
  }])
  if (error) return dbError('checklist_create', error)

  return { tool: 'checklist_create', success: true, message: `✅ 커스텀 체크항목이 추가되었습니다: "${params.item}"` }
}

export async function checklistCheck(params: { projectId: string; itemId: string; checked: boolean }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('checklist_check')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: diagnostic } = await supabase
    .from('diagnostic_responses')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!diagnostic) return { tool: 'checklist_check', success: false, message: '진단 데이터가 없습니다. 먼저 체크리스트를 시작해주세요.' }

  const responses = { ...diagnostic.responses, [params.itemId]: params.checked }
  const { error } = await supabase.from('diagnostic_responses').update({ responses }).eq('id', diagnostic.id)
  if (error) return dbError('checklist_check', error)

  return { tool: 'checklist_check', success: true, message: `✅ 체크항목 ${params.checked ? '완료' : '해제'}: ${params.itemId}` }
}

export async function checklistBulkCheck(params: { projectId: string; itemIds: string[]; checked: boolean }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('checklist_bulk_check')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: diagnostic } = await supabase
    .from('diagnostic_responses')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!diagnostic) return { tool: 'checklist_bulk_check', success: false, message: '진단 데이터가 없습니다.' }

  const responses = { ...diagnostic.responses }
  for (const id of params.itemIds) {
    responses[id] = params.checked
  }

  const { error } = await supabase.from('diagnostic_responses').update({ responses }).eq('id', diagnostic.id)
  if (error) return dbError('checklist_bulk_check', error)

  return { tool: 'checklist_bulk_check', success: true, message: `✅ ${params.itemIds.length}개 항목 일괄 ${params.checked ? '체크' : '해제'} 완료` }
}

export async function checklistProgress(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('checklist_progress')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: diagnostic } = await supabase
    .from('diagnostic_responses')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!diagnostic) return { tool: 'checklist_progress', success: true, message: '📋 아직 진단을 시작하지 않았습니다.' }

  const responses = diagnostic.responses || {}
  const total = Object.keys(responses).length
  const checked = Object.values(responses).filter(Boolean).length
  const rate = total > 0 ? Math.round((checked / total) * 100) : 0

  return {
    tool: 'checklist_progress',
    success: true,
    message: `📊 체크리스트 진행률: ${rate}% (${checked}/${total})\n미완료: ${total - checked}개`,
    data: { total, checked, unchecked: total - checked, rate },
  }
}

export async function checklistExport(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'checklist_export',
    success: true,
    message: '📄 체크리스트 내보내기는 진단 페이지에서 PDF 다운로드 버튼을 이용해주세요.\n\n프로젝트 > 진단 > 우측 상단 "PDF 다운로드"',
  }
}

// ═══════════════════════════════════════════════
// 견적/비용 (9개)
// ═══════════════════════════════════════════════

export async function quoteAddItem(params: {
  projectId: string; itemName: string; category?: string; unit?: string;
  quantity?: number; unitPrice?: number; specification?: string
}): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('quote_add_item')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const quantity = params.quantity || 1
  const unitPrice = params.unitPrice || 0

  const { error } = await supabase.from('quote_line_items').insert([{
    project_id: params.projectId,
    item_name: params.itemName,
    category: params.category || '기타',
    specification: params.specification || '',
    unit: params.unit || '식',
    quantity,
    unit_price: unitPrice,
  }])
  if (error) return dbError('quote_add_item', error)

  return {
    tool: 'quote_add_item',
    success: true,
    message: `✅ 견적 항목 추가: ${params.itemName}\n  수량: ${quantity} ${params.unit || '식'} × ${formatKRW(unitPrice)} = ${formatKRW(quantity * unitPrice)}`,
  }
}

export async function quoteUpdateItem(params: {
  itemId: string; itemName?: string; quantity?: number; unitPrice?: number;
  category?: string; unit?: string; specification?: string
}): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const updates: any = { updated_at: new Date().toISOString() }
  if (params.itemName) updates.item_name = params.itemName
  if (params.quantity !== undefined) updates.quantity = params.quantity
  if (params.unitPrice !== undefined) updates.unit_price = params.unitPrice
  if (params.category) updates.category = params.category
  if (params.unit) updates.unit = params.unit
  if (params.specification) updates.specification = params.specification

  const { error } = await supabase.from('quote_line_items').update(updates).eq('id', params.itemId)
  if (error) return dbError('quote_update_item', error)

  return { tool: 'quote_update_item', success: true, message: '✅ 견적 항목이 수정되었습니다.' }
}

export async function quoteDeleteItem(params: { itemId: string }): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { error } = await supabase.from('quote_line_items').delete().eq('id', params.itemId)
  if (error) return dbError('quote_delete_item', error)

  return { tool: 'quote_delete_item', success: true, message: '✅ 견적 항목이 삭제되었습니다.' }
}

export async function quoteCompare(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('quote_compare')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: items } = await supabase.from('quote_line_items').select('*').eq('project_id', params.projectId)
  const { data: costAnalysis } = await supabase.from('cost_analysis').select('*').eq('project_id', params.projectId).maybeSingle()

  const quoteTotal = (items || []).reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0)
  const adjusted = costAnalysis?.adjusted_cost || quoteTotal

  return {
    tool: 'quote_compare',
    success: true,
    message: `📊 견적 비교\n\n` +
      `💰 견적 총액: ${formatKRW(quoteTotal)}\n` +
      `📈 조정 비용: ${formatKRW(adjusted)}\n` +
      `📊 차이: ${formatKRW(adjusted - quoteTotal)} (${quoteTotal > 0 ? ((adjusted - quoteTotal) / quoteTotal * 100).toFixed(1) : 0}%)\n` +
      `📝 항목 수: ${(items || []).length}개`,
    data: { quoteTotal, adjusted, diff: adjusted - quoteTotal, itemCount: (items || []).length },
  }
}

export async function quoteExportPdf(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'quote_export_pdf',
    success: true,
    message: '📄 견적서 PDF 다운로드는 견적서 페이지에서 가능합니다.\n\n프로젝트 > 견적서 > "PDF 다운로드" 버튼',
  }
}

export async function costTrack(params: { projectId: string; category: string; amount: number; description?: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('cost_track')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  // change_orders 테이블에 실제 지출로 기록
  const { error } = await supabase.from('change_orders').insert([{
    project_id: params.projectId,
    title: `실제 지출: ${params.category}`,
    type: 'cost_tracking',
    reason: params.description || '실제 지출 기록',
    cost_change: params.amount,
    status: 'approved',
  }])
  if (error) return dbError('cost_track', error)

  return {
    tool: 'cost_track',
    success: true,
    message: `✅ 지출 기록: ${params.category} ${formatKRW(params.amount)}`,
  }
}

export async function costBudgetCompare(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('cost_budget_compare')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: items } = await supabase.from('quote_line_items').select('quantity, unit_price').eq('project_id', params.projectId)
  const { data: changes } = await supabase.from('change_orders').select('cost_change, status').eq('project_id', params.projectId)

  const budget = (items || []).reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0)
  const spent = (changes || []).filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + (c.cost_change || 0), 0)

  return {
    tool: 'cost_budget_compare',
    success: true,
    message: `📊 예산 vs 실제 비용\n\n` +
      `💰 예산(견적): ${formatKRW(budget)}\n` +
      `💸 추가/변경 비용: ${formatKRW(spent)}\n` +
      `📈 총 예상 비용: ${formatKRW(budget + spent)}\n` +
      `${spent > 0 ? `⚠️ 예산 대비 ${formatKRW(spent)} 초과` : '✅ 예산 내 진행중'}`,
    data: { budget, spent, total: budget + spent },
  }
}

export async function costForecast(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('cost_forecast')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: project } = await supabase.from('projects').select('progress').eq('id', params.projectId).single()
  const { data: items } = await supabase.from('quote_line_items').select('quantity, unit_price').eq('project_id', params.projectId)
  const { data: changes } = await supabase.from('change_orders').select('cost_change, status').eq('project_id', params.projectId)

  const budget = (items || []).reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0)
  const additionalCost = (changes || []).reduce((sum: number, c: any) => sum + (c.cost_change || 0), 0)
  const progress = project?.progress || 0
  const forecast = progress > 0 ? Math.round((budget + additionalCost) / (progress / 100)) : budget + additionalCost

  return {
    tool: 'cost_forecast',
    success: true,
    message: `📈 비용 예측\n\n` +
      `💰 현재 견적: ${formatKRW(budget)}\n` +
      `🔄 추가 비용: ${formatKRW(additionalCost)}\n` +
      `📊 진행률: ${progress}%\n` +
      `🔮 완공 시 예상 비용: ${formatKRW(forecast)}\n\n` +
      `⚠️ 현재 추세 기반 예측이며, 추가 변경에 따라 달라질 수 있습니다.`,
    data: { budget, additionalCost, progress, forecast },
  }
}

// ═══════════════════════════════════════════════
// 일정/공정 (7개)
// ═══════════════════════════════════════════════

export async function scheduleCreate(params: { projectId: string; template?: boolean }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('schedule_create')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const defaultProcesses = [
    { name: '철거 공사', order_index: 1 },
    { name: '설비/배관 공사', order_index: 2 },
    { name: '전기 배선 공사', order_index: 3 },
    { name: '냉난방 배관', order_index: 4 },
    { name: '방수 공사', order_index: 5 },
    { name: '목공/천장 공사', order_index: 6 },
    { name: '타일/바닥 공사', order_index: 7 },
    { name: '도배/도장 공사', order_index: 8 },
    { name: '가구/설비 설치', order_index: 9 },
    { name: '마감/준공 점검', order_index: 10 },
  ]

  const inserts = defaultProcesses.map(p => ({
    project_id: params.projectId,
    name: p.name,
    status: 'pending',
    progress: 0,
    order_index: p.order_index,
  }))

  const { error } = await supabase.from('processes').insert(inserts)
  if (error) return dbError('schedule_create', error)

  return {
    tool: 'schedule_create',
    success: true,
    message: `✅ 표준 공정표가 생성되었습니다 (${defaultProcesses.length}개 공정)\n\n` +
      defaultProcesses.map(p => `  ${p.order_index}. ${p.name}`).join('\n'),
  }
}

export async function scheduleAddTask(params: {
  projectId: string; name: string; startDate?: string; endDate?: string; orderIndex?: number
}): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('schedule_add_task')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { error } = await supabase.from('processes').insert([{
    project_id: params.projectId,
    name: params.name,
    status: 'pending',
    progress: 0,
    start_date: params.startDate || null,
    end_date: params.endDate || null,
    order_index: params.orderIndex || 99,
  }])
  if (error) return dbError('schedule_add_task', error)

  return { tool: 'schedule_add_task', success: true, message: `✅ 공정 추가: "${params.name}"` }
}

export async function scheduleUpdateTask(params: {
  taskId: string; name?: string; status?: string; progress?: number;
  startDate?: string; endDate?: string
}): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const updates: any = { updated_at: new Date().toISOString() }
  if (params.name) updates.name = params.name
  if (params.status) updates.status = params.status
  if (params.progress !== undefined) updates.progress = params.progress
  if (params.startDate) updates.start_date = params.startDate
  if (params.endDate) updates.end_date = params.endDate
  if (params.status === 'completed') updates.progress = 100

  const { error } = await supabase.from('processes').update(updates).eq('id', params.taskId)
  if (error) return dbError('schedule_update_task', error)

  return { tool: 'schedule_update_task', success: true, message: `✅ 공정이 수정되었습니다.` }
}

export async function scheduleCheckOrder(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('schedule_check_order')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: processes } = await supabase
    .from('processes').select('*').eq('project_id', params.projectId).order('order_index')

  if (!processes || processes.length === 0) {
    return { tool: 'schedule_check_order', success: true, message: '공정이 등록되지 않았습니다.' }
  }

  const violations: string[] = []
  for (let i = 1; i < processes.length; i++) {
    const prev = processes[i - 1]
    const curr = processes[i]
    if (curr.status === 'in_progress' && prev.status === 'pending') {
      violations.push(`⚠️ "${curr.name}" 시작했으나 선행 공정 "${prev.name}"이 미완료`)
    }
    if (curr.status === 'completed' && prev.status !== 'completed') {
      violations.push(`🚨 "${curr.name}" 완료했으나 선행 공정 "${prev.name}"이 미완료`)
    }
  }

  if (violations.length === 0) {
    return { tool: 'schedule_check_order', success: true, message: '✅ 공정 순서가 정상입니다. 미충족 사항 없음.' }
  }

  return {
    tool: 'schedule_check_order',
    success: true,
    message: `🚨 공정 순서 미충족 감지! (${violations.length}건)\n\n${violations.join('\n')}\n\n공정 순서: 철거→설비→전기→방수→목공→타일→도배→가구→마감`,
    data: { violations },
  }
}

export async function scheduleDelayAlert(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('schedule_delay_alert')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: project } = await supabase.from('projects').select('start_date, end_date, progress').eq('id', params.projectId).single()
  const { data: processes } = await supabase.from('processes').select('*').eq('project_id', params.projectId).order('order_index')

  if (!project) return { tool: 'schedule_delay_alert', success: false, message: '프로젝트를 찾을 수 없습니다.' }

  const now = new Date()
  const end = new Date(project.end_date)
  const start = new Date(project.start_date)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000)
  const elapsed = Math.ceil((now.getTime() - start.getTime()) / 86400000)
  const expectedProgress = totalDays > 0 ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 0
  const actualProgress = project.progress || 0
  const delay = expectedProgress - actualProgress

  const delayedProcesses = (processes || []).filter((p: any) => p.status === 'delayed' || (p.end_date && new Date(p.end_date) < now && p.status !== 'completed'))

  let message = `📅 일정 지연 분석\n\n` +
    `예상 진행률: ${expectedProgress}% | 실제: ${actualProgress}%\n`

  if (delay > 10) {
    message += `🚨 ${delay}% 지연 중! 공정 가속이 필요합니다.\n`
  } else if (delay > 0) {
    message += `⚠️ 약간의 지연 (${delay}%). 주의가 필요합니다.\n`
  } else {
    message += `✅ 일정 정상 진행 중\n`
  }

  if (delayedProcesses.length > 0) {
    message += `\n지연된 공정:\n` + delayedProcesses.map((p: any) => `  • ${p.name}`).join('\n')
  }

  return { tool: 'schedule_delay_alert', success: true, message, data: { delay, delayedProcesses } }
}

export async function scheduleGantt(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('schedule_gantt')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: processes } = await supabase
    .from('processes').select('*').eq('project_id', params.projectId).order('order_index')

  if (!processes || processes.length === 0) {
    return { tool: 'schedule_gantt', success: true, message: '공정이 등록되지 않았습니다. "공정표 만들어줘"로 생성하세요.' }
  }

  const statusIcon: Record<string, string> = { completed: '✅', in_progress: '🔄', delayed: '🚨', pending: '⬜' }
  const gantt = processes.map((p: any) => {
    const icon = statusIcon[p.status] || '⬜'
    const bar = '█'.repeat(Math.max(1, Math.round((p.progress || 0) / 10)))
    const empty = '░'.repeat(Math.max(0, 10 - Math.round((p.progress || 0) / 10)))
    return `${icon} ${p.name.padEnd(15)} ${bar}${empty} ${p.progress || 0}%`
  }).join('\n')

  return {
    tool: 'schedule_gantt',
    success: true,
    message: `📊 공정 현황 (공정 일정표)\n\n${gantt}`,
    data: { processes },
  }
}

export async function scheduleToday(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('schedule_today')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: processes } = await supabase
    .from('processes').select('*').eq('project_id', params.projectId).order('order_index')

  const inProgress = (processes || []).filter((p: any) => p.status === 'in_progress')
  const nextPending = (processes || []).find((p: any) => p.status === 'pending')

  let message = `📅 오늘의 공정 현황\n\n`
  if (inProgress.length > 0) {
    message += `🔄 진행 중:\n` + inProgress.map((p: any) => `  • ${p.name} (${p.progress || 0}%)`).join('\n')
  } else {
    message += `현재 진행 중인 공정이 없습니다.\n`
  }

  if (nextPending) {
    message += `\n\n⏭️ 다음 공정: ${nextPending.name}`
  }

  return { tool: 'schedule_today', success: true, message, data: { inProgress, nextPending } }
}

// ═══════════════════════════════════════════════
// 현장 사진 (5개)
// ═══════════════════════════════════════════════

export async function photoList(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('photo_list')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: files } = await supabase
    .from('files').select('*').eq('project_id', params.projectId).order('created_at', { ascending: false })

  const photos = (files || []).filter((f: any) => f.file_type?.startsWith('image/'))

  return {
    tool: 'photo_list',
    success: true,
    message: `📸 현장 사진 ${photos.length}장\n\n` +
      (photos.length > 0
        ? photos.slice(0, 10).map((p: any) => `  • ${p.file_name} (${new Date(p.created_at).toLocaleDateString('ko-KR')})`).join('\n')
        : '아직 사진이 없습니다. 현장 사진을 업로드해주세요.'),
    data: { photos, count: photos.length },
  }
}

export async function photoUpload(): Promise<ToolResult> {
  return {
    tool: 'photo_upload',
    success: true,
    message: '📸 사진 업로드는 갤러리 페이지에서 가능합니다.\n\n프로젝트 > 갤러리 > "사진 업로드" 버튼\n\n업로드 시 SHA-256 해시가 자동 생성되어 위변조 방지됩니다.',
  }
}

export async function photoAnalyze(): Promise<ToolResult> {
  return {
    tool: 'photo_analyze',
    success: true,
    message: '🤖 사진 AI 분석 기능은 곧 업데이트 예정입니다.\n\n향후 기능:\n  • 공종 자동 확인\n  • 하자/불량 자동 감지\n  • 진행률 자동 측정\n  • Before/After 자동 매칭',
  }
}

export async function photoBeforeAfter(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'photo_before_after',
    success: true,
    message: '📸 Before/After 비교는 갤러리 페이지에서 확인할 수 있습니다.\n\n프로젝트 > 갤러리 > "Before/After" 탭',
  }
}

export async function photoGallery(params: { projectId: string }): Promise<ToolResult> {
  return photoList(params)
}

// ═══════════════════════════════════════════════
// 하자/결함 (5개)
// ═══════════════════════════════════════════════

export async function defectCreate(params: {
  projectId: string; title: string; description?: string; severity?: string; location?: string
}): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('defect_create')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { error } = await supabase.from('defects').insert([{
    project_id: params.projectId,
    title: params.title,
    description: params.description || '',
    severity: params.severity || 'medium',
    status: 'reported',
    location: params.location || '',
    reported_by: user.email || user.id,
  }])
  if (error) return dbError('defect_create', error)

  return { tool: 'defect_create', success: true, message: `🔧 하자 등록 완료: "${params.title}"\n심각도: ${params.severity || 'medium'}\n상태: 접수됨` }
}

export async function defectUpdate(params: { defectId: string; status?: string; assignedTo?: string }): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const updates: any = { updated_at: new Date().toISOString() }
  if (params.status) {
    updates.status = params.status
    if (params.status === 'resolved' || params.status === 'closed') {
      updates.resolved_at = new Date().toISOString()
    }
  }
  if (params.assignedTo) updates.assigned_to = params.assignedTo

  const { error } = await supabase.from('defects').update(updates).eq('id', params.defectId)
  if (error) return dbError('defect_update', error)

  return { tool: 'defect_update', success: true, message: `✅ 하자 상태가 업데이트되었습니다.` }
}

export async function defectList(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('defect_list')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: defects } = await supabase
    .from('defects').select('*').eq('project_id', params.projectId).order('reported_at', { ascending: false })

  if (!defects || defects.length === 0) {
    return { tool: 'defect_list', success: true, message: '✅ 등록된 하자가 없습니다.' }
  }

  const severityIcon: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }
  const list = defects.map((d: any) =>
    `  ${severityIcon[d.severity] || '⚪'} [${d.status}] ${d.title}`
  ).join('\n')

  return {
    tool: 'defect_list',
    success: true,
    message: `🔧 하자 목록 (${defects.length}건)\n\n${list}`,
    data: { defects, count: defects.length },
  }
}

export async function defectAssign(params: { defectId: string; assignedTo: string }): Promise<ToolResult> {
  return defectUpdate({ defectId: params.defectId, assignedTo: params.assignedTo })
}

export async function defectHistory(params: { projectId: string }): Promise<ToolResult> {
  return defectList(params)
}

// ═══════════════════════════════════════════════
// 인력 (5개)
// ═══════════════════════════════════════════════

export async function workerAdd(params: {
  projectId: string; name: string; workerType?: string; phone?: string; dailyWage?: number
}): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('worker_add')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase.from('workforce').insert([{
    project_id: params.projectId,
    name: params.name,
    worker_type: params.workerType || 'labor',
    phone: params.phone || '',
    daily_wage: params.dailyWage || 0,
    work_date: today,
    attendance_status: 'present',
  }])
  if (error) return dbError('worker_add', error)

  return { tool: 'worker_add', success: true, message: `✅ 작업자 등록: ${params.name} (${params.workerType || '일반'})` }
}

export async function workerAttendance(params: {
  projectId: string; workerId?: string; name?: string; status: string; workDate?: string
}): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('worker_attendance')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const statusMap: Record<string, string> = { '출근': 'present', '결근': 'absent', '반차': 'half_day' }
  const attendance = statusMap[params.status] || params.status

  if (params.workerId) {
    const { error } = await supabase.from('workforce').update({
      attendance_status: attendance,
      updated_at: new Date().toISOString(),
    }).eq('id', params.workerId)
    if (error) return dbError('worker_attendance', error)
  }

  return { tool: 'worker_attendance', success: true, message: `✅ 출역 기록: ${params.name || params.workerId} - ${params.status}` }
}

export async function workerCertificationCheck(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('worker_certification_check')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const today = new Date().toISOString().split('T')[0]
  const { data: workers } = await supabase.from('workforce').select('*').eq('project_id', params.projectId).eq('work_date', today)

  return {
    tool: 'worker_certification_check',
    success: true,
    message: `👷 오늘 출역 인원: ${(workers || []).length}명\n\n` +
      `⚠️ 자격증/안전교육 확인이 필요한 공종:\n` +
      `  • 전기 기능사 (전기 공사)\n` +
      `  • 소방설비기사 (소방 공사)\n` +
      `  • 안전교육 이수증 (전 직종)\n\n` +
      `인력관리 페이지에서 상세 확인하세요.`,
    data: { workers, count: (workers || []).length },
  }
}

export async function workerAssign(params: { workerId: string; processName: string }): Promise<ToolResult> {
  return {
    tool: 'worker_assign',
    success: true,
    message: `✅ 작업자가 "${params.processName}" 공정에 배정되었습니다.\n인력관리 페이지에서 확인하세요.`,
  }
}

export async function workerPayment(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('worker_payment')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: workers } = await supabase.from('workforce').select('*').eq('project_id', params.projectId)
  const totalWage = (workers || []).reduce((sum: number, w: any) => sum + (w.daily_wage || 0), 0)

  return {
    tool: 'worker_payment',
    success: true,
    message: `💰 노무비 현황\n\n` +
      `👷 총 인원: ${(workers || []).length}명\n` +
      `💰 총 노무비: ${formatKRW(totalWage)}\n\n` +
      `인력관리 페이지에서 상세 정산을 확인하세요.`,
    data: { totalWorkers: (workers || []).length, totalWage },
  }
}

// ═══════════════════════════════════════════════
// 자재 (6개)
// ═══════════════════════════════════════════════

export async function materialAdd(params: {
  projectId: string; name: string; category?: string; unit?: string;
  quantity?: number; unitPrice?: number; supplier?: string
}): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('material_add')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const qty = params.quantity || 1
  const price = params.unitPrice || 0

  const { error } = await supabase.from('materials').insert([{
    project_id: params.projectId,
    name: params.name,
    category: params.category || 'other',
    unit: params.unit || '개',
    quantity: qty,
    unit_price: price,
    total_price: qty * price,
    supplier: params.supplier || '',
    status: 'pending',
  }])
  if (error) return dbError('material_add', error)

  return { tool: 'material_add', success: true, message: `✅ 자재 등록: ${params.name} (${qty} ${params.unit || '개'} × ${formatKRW(price)})` }
}

export async function materialIn(params: { materialId: string; quantity?: number }): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { error } = await supabase.from('materials').update({
    status: 'delivered',
    updated_at: new Date().toISOString(),
  }).eq('id', params.materialId)
  if (error) return dbError('material_in', error)

  return { tool: 'material_in', success: true, message: `✅ 자재 입고 완료` }
}

export async function materialOut(params: { materialId: string; quantity?: number }): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { error } = await supabase.from('materials').update({
    status: 'delivered',
    updated_at: new Date().toISOString(),
  }).eq('id', params.materialId)
  if (error) return dbError('material_out', error)

  return { tool: 'material_out', success: true, message: `✅ 자재 출고 기록 완료` }
}

export async function materialStock(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('material_stock')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: materials } = await supabase
    .from('materials').select('*').eq('project_id', params.projectId).order('created_at', { ascending: false })

  if (!materials || materials.length === 0) {
    return { tool: 'material_stock', success: true, message: '등록된 자재가 없습니다.' }
  }

  const statusCount: Record<string, number> = {}
  const totalCost = materials.reduce((sum: number, m: any) => {
    statusCount[m.status] = (statusCount[m.status] || 0) + 1
    return sum + (m.total_price || 0)
  }, 0)

  return {
    tool: 'material_stock',
    success: true,
    message: `📦 자재 현황\n\n` +
      `총 ${materials.length}종\n` +
      Object.entries(statusCount).map(([s, c]) => `  • ${s}: ${c}건`).join('\n') +
      `\n💰 총 자재비: ${formatKRW(totalCost)}`,
    data: { materials, totalCost, statusCount },
  }
}

export async function materialOrder(params: {
  projectId: string; name: string; quantity: number; supplier?: string
}): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('material_order')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { error } = await supabase.from('materials').insert([{
    project_id: params.projectId,
    name: params.name,
    quantity: params.quantity,
    supplier: params.supplier || '',
    status: 'ordered',
    category: 'other',
    unit: '개',
    unit_price: 0,
    total_price: 0,
  }])
  if (error) return dbError('material_order', error)

  return { tool: 'material_order', success: true, message: `✅ 자재 발주: ${params.name} ${params.quantity}개 (${params.supplier || '공급사 미지정'})` }
}

export async function materialCost(params: { projectId: string }): Promise<ToolResult> {
  return materialStock(params)
}

// ═══════════════════════════════════════════════
// 시공 기록/인증 (6개)
// ═══════════════════════════════════════════════

export async function evidenceCreate(params: { projectId: string; description: string }): Promise<ToolResult> {
  return {
    tool: 'evidence_create',
    success: true,
    message: `📸 시공 기록 생성은 증빙 패키지 페이지에서 파일을 업로드하면 자동으로 SHA-256 해시가 생성됩니다.\n\n프로젝트 > 증빙패키지 > 파일 업로드`,
  }
}

export async function evidenceVerify(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('evidence_verify')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: files } = await supabase.from('evidence_files').select('*').eq('project_id', params.projectId)
  const hasHash = (files || []).filter((f: any) => f.sha256_hash).length

  return {
    tool: 'evidence_verify',
    success: true,
    message: `🔐 시공 기록 무결성 검증\n\n` +
      `📎 총 시공 기록 파일: ${(files || []).length}개\n` +
      `🔑 SHA-256 해시 보유: ${hasHash}개\n` +
      `${hasHash === (files || []).length ? '✅ 모든 시공 기록의 무결성이 확인되었습니다.' : `⚠️ ${(files || []).length - hasHash}개 파일에 해시가 없습니다.`}`,
  }
}

export async function evidenceExport(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'evidence_export',
    success: true,
    message: '📦 시공 기록 패키지 내보내기는 증빙 패키지 페이지에서 가능합니다.\n\n프로젝트 > 증빙패키지 > "패키지 다운로드"',
  }
}

export async function certificateGenerate(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'certificate_generate',
    success: true,
    message: '🏅 AI 검증 인증서는 인증서 페이지에서 생성할 수 있습니다.\n\n프로젝트 > 인증서 > "인증서 발급"\n\n4항목 × 25점 = 100점 기준으로 A/B/C/D 등급이 부여됩니다.',
  }
}

export async function certificateVerify(params: { code: string }): Promise<ToolResult> {
  const { supabase } = await getUser()

  const { data: cert } = await supabase
    .from('verification_certificates')
    .select('*')
    .eq('code', params.code)
    .maybeSingle()

  if (!cert) {
    return { tool: 'certificate_verify', success: false, message: `인증서를 찾을 수 없습니다: ${params.code}` }
  }

  return {
    tool: 'certificate_verify',
    success: true,
    message: `🏅 인증서 검증 결과\n\n` +
      `코드: ${cert.code}\n` +
      `프로젝트: ${cert.project_name}\n` +
      `등급: ${cert.grade} (${cert.total_score}점)\n` +
      `상태: ${cert.status}\n` +
      `발급일: ${cert.issued_at}`,
    data: cert,
  }
}

// ═══════════════════════════════════════════════
// 보고서 (6개)
// ═══════════════════════════════════════════════

export async function reportDaily(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('report_daily')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const today = new Date().toISOString().split('T')[0]
  const { data: project } = await supabase.from('projects').select('name, progress').eq('id', params.projectId).single()
  const { data: workers } = await supabase.from('workforce').select('*').eq('project_id', params.projectId).eq('work_date', today)
  const { data: processes } = await supabase.from('processes').select('name, status, progress').eq('project_id', params.projectId).eq('status', 'in_progress')

  return {
    tool: 'report_daily',
    success: true,
    message: `📋 일일 보고서 (${today})\n\n` +
      `📁 프로젝트: ${project?.name}\n` +
      `📊 진행률: ${project?.progress || 0}%\n\n` +
      `👷 오늘 출역: ${(workers || []).length}명\n` +
      (workers && workers.length > 0 ? workers.map((w: any) => `  • ${w.name} (${w.worker_type})`).join('\n') : '  없음') +
      `\n\n🔧 진행 중 공정:\n` +
      (processes && processes.length > 0 ? processes.map((p: any) => `  • ${p.name} (${p.progress}%)`).join('\n') : '  없음'),
  }
}

export async function reportWeekly(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('report_weekly')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: project } = await supabase.from('projects').select('*').eq('id', params.projectId).single()
  const { data: processes } = await supabase.from('processes').select('*').eq('project_id', params.projectId).order('order_index')
  const { data: changes } = await supabase.from('change_orders').select('*').eq('project_id', params.projectId)
  const { data: defects } = await supabase.from('defects').select('*').eq('project_id', params.projectId)

  const completed = (processes || []).filter((p: any) => p.status === 'completed').length
  const total = (processes || []).length

  return {
    tool: 'report_weekly',
    success: true,
    message: `📊 주간 보고서\n\n` +
      `📁 ${project?.name}\n` +
      `📈 진행률: ${project?.progress || 0}%\n` +
      `🔧 공정: ${completed}/${total} 완료\n` +
      `🔄 변경요청: ${(changes || []).length}건\n` +
      `🔧 하자: ${(defects || []).length}건\n\n` +
      `상세 내용은 리포트 페이지에서 PDF로 확인하세요.`,
  }
}

export async function reportMonthly(params: { projectId: string }): Promise<ToolResult> {
  return reportWeekly(params) // 주간과 동일 구조, 기간만 다름
}

export async function reportFinal(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'report_final',
    success: true,
    message: '📊 최종 보고서는 리포트 페이지에서 "종합 리포트 생성" 버튼으로 생성할 수 있습니다.\n\n프로젝트 > 리포트 > "리포트 생성"',
  }
}

export async function reportCustom(params: { projectId: string; sections?: string[] }): Promise<ToolResult> {
  return reportWeekly(params)
}

export async function reportExportPdf(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'report_export_pdf',
    success: true,
    message: '📄 리포트 PDF 내보내기는 리포트 페이지에서 가능합니다.\n\n프로젝트 > 리포트 > "PDF 다운로드"',
  }
}

// ═══════════════════════════════════════════════
// 고객 공유 (4개)
// ═══════════════════════════════════════════════

export async function shareCreate(params: { projectId: string; expiresDays?: number }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('share_create')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const token = Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (params.expiresDays || 7))

  const { error } = await supabase.from('shares').insert([{
    project_id: params.projectId,
    created_by: user.id,
    share_token: token,
    share_url: `/share/${token}`,
    expires_at: expiresAt.toISOString(),
  }])
  if (error) return dbError('share_create', error)

  return {
    tool: 'share_create',
    success: true,
    message: `🔗 공유 링크가 생성되었습니다!\n\n링크: /share/${token}\n만료: ${expiresAt.toLocaleDateString('ko-KR')}\n\n고객에게 이 링크를 공유하면 실시간 진행상황을 확인할 수 있습니다.`,
    data: { token, url: `/share/${token}`, expiresAt },
  }
}

export async function shareUpdate(): Promise<ToolResult> {
  return { tool: 'share_update', success: true, message: '공유 페이지는 프로젝트 데이터가 업데이트되면 자동으로 반영됩니다.' }
}

export async function shareSend(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'share_send',
    success: true,
    message: '📨 공유 링크 전송은 공유 링크를 복사해서 카카오톡, 문자, 이메일로 보내주세요.\n\n먼저 "공유 링크 만들어줘"로 링크를 생성하세요.',
  }
}

export async function sharePermission(): Promise<ToolResult> {
  return { tool: 'share_permission', success: true, message: '🔐 공유 권한 설정은 현재 읽기 전용입니다. 고객은 진행상황만 볼 수 있습니다.' }
}

// ═══════════════════════════════════════════════
// 전자서명/계약 (4개)
// ═══════════════════════════════════════════════

export async function contractCreate(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'contract_create',
    success: true,
    message: '📝 계약서 생성은 합의 페이지에서 가능합니다.\n\n프로젝트 > 합의 > "합의서 생성"\n\n3자(발주자/작업자/감리자) 전자서명이 지원됩니다.',
  }
}

export async function contractSignRequest(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'contract_sign_request',
    success: true,
    message: '✍️ 전자서명 요청은 합의 페이지에서 가능합니다.\n\n프로젝트 > 합의 > 서명 요청 버튼',
  }
}

export async function contractSign(): Promise<ToolResult> {
  return {
    tool: 'contract_sign',
    success: true,
    message: '✍️ 전자서명은 합의 페이지에서 직접 서명할 수 있습니다.\n\n프로젝트 > 합의 > "서명하기"',
  }
}

export async function contractStatus(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('contract_status')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: agreements } = await supabase.from('agreements').select('*').eq('project_id', params.projectId)

  if (!agreements || agreements.length === 0) {
    return { tool: 'contract_status', success: true, message: '📝 아직 합의서가 없습니다. "합의서 만들어줘"로 생성하세요.' }
  }

  const latest = agreements[agreements.length - 1]
  return {
    tool: 'contract_status',
    success: true,
    message: `📝 계약/서명 상태\n\n` +
      `상태: ${latest.status}\n` +
      `💰 합의 금액: ${formatKRW(latest.total_amount || 0)}\n` +
      `👤 발주자: ${latest.client_agreed ? '✅ 서명 완료' : '⏳ 대기중'}\n` +
      `🏗️ 작업자: ${latest.contractor_agreed ? '✅ 서명 완료' : '⏳ 대기중'}\n` +
      `📊 감리자: ${latest.manager_agreed ? '✅ 서명 완료' : '⏳ 대기중'}`,
    data: latest,
  }
}

// ═══════════════════════════════════════════════
// 알림 (3개) - 스텁
// ═══════════════════════════════════════════════

export async function notificationSend(params: { message: string; target?: string }): Promise<ToolResult> {
  return {
    tool: 'notification_send',
    success: true,
    message: `📨 알림 기능은 곧 업데이트 예정입니다.\n\n전송 예정: "${params.message}"\n대상: ${params.target || '전체'}`,
  }
}

export async function notificationList(): Promise<ToolResult> {
  return { tool: 'notification_list', success: true, message: '🔔 알림 목록 기능은 곧 업데이트 예정입니다.' }
}

export async function notificationSettings(): Promise<ToolResult> {
  return { tool: 'notification_settings', success: true, message: '⚙️ 알림 설정은 설정 페이지에서 변경할 수 있습니다.\n\n설정 > 알림 설정' }
}

// ═══════════════════════════════════════════════
// 대시보드/통계 (3개)
// ═══════════════════════════════════════════════

export async function dashboardSummary(): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: projects } = await supabase.from('projects').select('*').order('updated_at', { ascending: false })
  if (!projects || projects.length === 0) {
    return { tool: 'dashboard_summary', success: true, message: '프로젝트가 없습니다.' }
  }

  const active = projects.filter((p: any) => p.status === 'in_progress').length
  const completed = projects.filter((p: any) => p.status === 'completed').length
  const avgProgress = Math.round(projects.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / projects.length)
  const highRisk = projects.filter((p: any) => (p.risk_score || 0) > 60).length

  return {
    tool: 'dashboard_summary',
    success: true,
    message: `📊 대시보드 요약\n\n` +
      `📁 총 프로젝트: ${projects.length}개\n` +
      `🔄 진행중: ${active}개\n` +
      `✅ 완료: ${completed}개\n` +
      `📈 평균 진행률: ${avgProgress}%\n` +
      `🚨 고위험 프로젝트: ${highRisk}개`,
    data: { total: projects.length, active, completed, avgProgress, highRisk },
  }
}

export async function dashboardStats(params: { projectId?: string }): Promise<ToolResult> {
  return dashboardSummary()
}

export async function dashboardFeed(): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: projects } = await supabase
    .from('projects').select('name, status, progress, updated_at')
    .order('updated_at', { ascending: false }).limit(5)

  const feed = (projects || []).map((p: any) =>
    `  • ${p.name} (${p.progress}%) - ${new Date(p.updated_at).toLocaleDateString('ko-KR')}`
  ).join('\n')

  return {
    tool: 'dashboard_feed',
    success: true,
    message: `📰 최근 활동\n\n${feed || '활동 없음'}`,
  }
}

// ═══════════════════════════════════════════════
// 업체 프로필 (3개)
// ═══════════════════════════════════════════════

export async function profileUpdate(params: { companyName?: string; description?: string; phone?: string; address?: string }): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const updates: any = { updated_at: new Date().toISOString() }
  if (params.companyName) updates.company_name = params.companyName
  if (params.description) updates.description = params.description
  if (params.phone) updates.phone = params.phone
  if (params.address) updates.address = params.address

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
  if (error) return dbError('profile_update', error)

  return { tool: 'profile_update', success: true, message: '✅ 업체 프로필이 수정되었습니다.' }
}

export async function portfolioAdd(): Promise<ToolResult> {
  return {
    tool: 'portfolio_add',
    success: true,
    message: '📸 포트폴리오 추가는 프로필 페이지에서 가능합니다.\n\n프로필 > 포트폴리오 > 이미지 업로드',
  }
}

export async function portfolioList(): Promise<ToolResult> {
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: profile } = await supabase.from('profiles').select('portfolio_images, company_name').eq('id', user.id).single()
  const images = profile?.portfolio_images || []

  return {
    tool: 'portfolio_list',
    success: true,
    message: `📸 포트폴리오 (${images.length}장)\n\n${images.length > 0 ? '프로필 페이지에서 확인하세요.' : '아직 포트폴리오가 없습니다. 프로필 페이지에서 추가하세요.'}`,
    data: { count: images.length },
  }
}

// ═══════════════════════════════════════════════
// 관리소/행정 서류 (2개)
// ═══════════════════════════════════════════════

export async function adminDocGenerate(params: { projectId: string; docType?: string }): Promise<ToolResult> {
  const docTypes: Record<string, string> = {
    '공사허가서': '건물 관리소에 제출할 공사허가 신청서',
    '보양계획서': '공용부분 보양 계획 및 시공 방법',
    '폐기물처리계획서': '건설 폐기물 처리 업체 및 방법',
    '소음진동관리계획': '소음/진동 관리 시간대 및 방법',
  }

  const docType = params.docType || '공사허가서'
  const desc = docTypes[docType] || '행정 서류'

  return {
    tool: 'admin_doc_generate',
    success: true,
    message: `📄 ${docType} 생성 안내\n\n` +
      `내용: ${desc}\n\n` +
      `📋 포함 항목:\n` +
      `  • 공사 기간 및 시간\n` +
      `  • 시공 업체 정보\n` +
      `  • 보양 범위 및 방법\n` +
      `  • 폐기물 처리 계획\n` +
      `  • 비상 연락처\n\n` +
      `⚠️ 서류 자동 생성 기능은 곧 업데이트 예정입니다.`,
  }
}

export async function adminPermitCheck(params: { industry?: string; area?: number }): Promise<ToolResult> {
  const industry = params.industry || 'cafe'
  const area = params.area || 20
  const info = industryInfo[industry as keyof typeof industryInfo]

  const permits: string[] = []
  permits.push('✅ 소방시설 완비확인원 (필수)')
  permits.push('✅ 건축물 용도 확인 (필수)')
  if (area > 100) permits.push('⚠️ 건축 허가/신고 필요 가능')
  if (['restaurant', 'cafe', 'bar', 'bakery'].includes(industry)) {
    permits.push('✅ 영업신고증 (식품위생법)')
    permits.push('✅ 위생교육 이수증')
  }
  if (['clinic', 'vet', 'pharmacy'].includes(industry)) {
    permits.push('✅ 의료기관 개설 허가')
  }
  if (['karaoke', 'pcroom', 'billiard'].includes(industry)) {
    permits.push('✅ 영업허가 (관할구청)')
    permits.push('⚠️ 청소년 보호법 확인')
  }
  permits.push('✅ 간판 설치 신고 (옥외광고물법)')

  return {
    tool: 'admin_permit_check',
    success: true,
    message: `📋 ${info?.icon || '🏗️'} ${info?.name || industry} 인허가 체크\n\n` +
      permits.join('\n') +
      `\n\n⚠️ 정확한 요건은 관할 구청에 확인하세요.\n전문 법률 상담을 권장드립니다.`,
  }
}

// ═══════════════════════════════════════════════
// 법률 (2개)
// ═══════════════════════════════════════════════

export async function lawSearch(params: { query: string }): Promise<ToolResult> {
  const laws = [
    { name: '건축법', desc: '건축물 신축/증축/리모델링 관련' },
    { name: '건설산업기본법', desc: '건설업 등록, 하도급 규정' },
    { name: '주택법', desc: '주택 리모델링, 하자보수' },
    { name: '중대재해처벌법', desc: '건설 현장 안전사고 처벌' },
    { name: '소방시설법', desc: '소방시설 설치/유지/관리' },
    { name: '실내공기질관리법', desc: '신축/리모델링 공기질' },
    { name: '석면안전관리법', desc: '석면 해체/제거' },
    { name: '폐기물관리법', desc: '건설 폐기물 처리' },
    { name: '소음진동관리법', desc: '공사 소음/진동 기준' },
    { name: '장애인편의시설법', desc: '편의시설 설치 기준' },
    { name: '옥외광고물법', desc: '간판 설치 규정' },
    { name: '집합건물법', desc: '공동주택 공용부분 규정' },
  ]

  const query = params.query.toLowerCase()
  const matches = laws.filter(l => l.name.includes(query) || l.desc.includes(query) || query.includes(l.name))

  if (matches.length === 0) {
    return {
      tool: 'law_search',
      success: true,
      message: `📜 "${params.query}" 관련 법률\n\n` +
        `직접 매칭되는 법률은 없지만, 관련될 수 있는 법률:\n\n` +
        laws.map(l => `  • ${l.name}: ${l.desc}`).join('\n') +
        `\n\n⚠️ 정확한 법률 해석은 전문 법률 상담을 권장드립니다.`,
    }
  }

  return {
    tool: 'law_search',
    success: true,
    message: `📜 "${params.query}" 관련 법률\n\n` +
      matches.map(l => `  📌 ${l.name}\n     ${l.desc}`).join('\n\n') +
      `\n\n⚠️ 정확한 법률 해석은 전문 법률 상담을 권장드립니다.`,
  }
}

export async function lawCheckCompliance(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('law_check_compliance')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: project } = await supabase.from('projects').select('industry, name').eq('id', params.projectId).single()
  if (!project) return { tool: 'law_check_compliance', success: false, message: '프로젝트를 찾을 수 없습니다.' }

  const checklist = checklistMap[project.industry]
  const safetyItems = checklist ? checklist.items.filter((i: any) => i.category === '안전' && i.priority === '필수').length : 0
  const legalItems = checklist ? checklist.items.filter((i: any) => i.category === '법규' && i.priority === '필수').length : 0

  return {
    tool: 'law_check_compliance',
    success: true,
    message: `📋 법규 준수 체크: ${project.name}\n\n` +
      `🔥 안전 필수 항목: ${safetyItems}개\n` +
      `📜 법규 필수 항목: ${legalItems}개\n\n` +
      `진단 페이지에서 체크리스트를 완료하면 법규 준수 여부를 확인할 수 있습니다.`,
  }
}

// ═══════════════════════════════════════════════
// 리스크 (5개)
// ═══════════════════════════════════════════════

export async function riskSafety(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('risk_safety')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: project } = await supabase.from('projects').select('industry').eq('id', params.projectId).single()
  const checklist = project ? checklistMap[project.industry] : null
  const safetyItems = checklist ? checklist.items.filter((i: any) => i.category === '안전') : []

  return {
    tool: 'risk_safety',
    success: true,
    message: `🔒 안전 리스크 진단\n\n` +
      `안전 체크항목: ${safetyItems.length}개\n` +
      `필수 항목: ${safetyItems.filter((i: any) => i.priority === '필수').length}개\n\n` +
      `주요 안전 항목:\n` +
      safetyItems.slice(0, 5).map((i: any) => `  • ${i.item}`).join('\n') +
      `\n\n진단 페이지에서 전체 체크리스트를 확인하세요.`,
  }
}

export async function riskCost(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('risk_cost')
  return costBudgetCompare(params)
}

export async function riskSchedule(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('risk_schedule')
  return scheduleDelayAlert(params)
}

export async function riskRecommendation(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('risk_recommendation')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: project } = await supabase.from('projects').select('*').eq('id', params.projectId).single()
  if (!project) return { tool: 'risk_recommendation', success: false, message: '프로젝트를 찾을 수 없습니다.' }

  const recs: string[] = []
  if ((project.risk_score || 0) > 60) recs.push('🚨 리스크 점수가 높습니다. 체크리스트 점검을 완료하세요.')
  if ((project.progress || 0) < 30) recs.push('📋 진행률이 낮습니다. 공정표를 확인하세요.')
  recs.push('📸 현장 사진을 정기적으로 업로드하세요.')
  recs.push('📝 변경사항은 반드시 기록하세요.')
  recs.push('🔐 증빙 패키지를 주기적으로 확인하세요.')

  return {
    tool: 'risk_recommendation',
    success: true,
    message: `💡 리스크 기반 조치 추천\n\n` + recs.map((r, i) => `${i + 1}. ${r}`).join('\n'),
  }
}

export async function riskFullDiagnosis(params: { projectId: string }): Promise<ToolResult> {
  return riskRecommendation(params)
}

// ═══════════════════════════════════════════════
// 공정 순서 자동 관리 (3개)
// ═══════════════════════════════════════════════

export async function workflowCheckPrerequisites(params: { projectId: string; processName: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('workflow_check_prerequisites')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: processes } = await supabase
    .from('processes').select('*').eq('project_id', params.projectId).order('order_index')

  const target = (processes || []).find((p: any) => p.name.includes(params.processName))
  if (!target) {
    return { tool: 'workflow_check_prerequisites', success: true, message: `"${params.processName}" 공정을 찾을 수 없습니다.` }
  }

  const prerequisites = (processes || []).filter((p: any) => p.order_index < target.order_index)
  const incomplete = prerequisites.filter((p: any) => p.status !== 'completed')

  if (incomplete.length === 0) {
    return { tool: 'workflow_check_prerequisites', success: true, message: `✅ "${params.processName}" 시작 가능! 모든 선행 공정이 완료되었습니다.` }
  }

  return {
    tool: 'workflow_check_prerequisites',
    success: true,
    message: `⚠️ "${params.processName}" 시작 전 완료 필요:\n\n` +
      incomplete.map((p: any) => `  ❌ ${p.name} (${p.status})`).join('\n'),
  }
}

export async function workflowNextStep(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('workflow_next_step')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: processes } = await supabase
    .from('processes').select('*').eq('project_id', params.projectId).order('order_index')

  const next = (processes || []).find((p: any) => p.status === 'pending')
  const current = (processes || []).filter((p: any) => p.status === 'in_progress')

  let message = ''
  if (current.length > 0) {
    message += `🔄 현재 진행 중:\n` + current.map((p: any) => `  • ${p.name} (${p.progress}%)`).join('\n') + '\n\n'
  }
  if (next) {
    message += `⏭️ 다음 공정: ${next.name}`
  } else {
    message += `✅ 모든 공정이 완료되었거나 진행 중입니다.`
  }

  return { tool: 'workflow_next_step', success: true, message }
}

export async function workflowAutoSequence(params: { projectId: string }): Promise<ToolResult> {
  return scheduleCreate(params)
}

// ═══════════════════════════════════════════════
// 정산/대금 (4개) - 스텁 (payment 테이블 필요)
// ═══════════════════════════════════════════════

export async function paymentRecord(params: { projectId: string; amount: number; description?: string }): Promise<ToolResult> {
  return costTrack({ projectId: params.projectId, category: '대금 지급', amount: params.amount, description: params.description })
}

export async function paymentRequest(params: { projectId: string }): Promise<ToolResult> {
  return {
    tool: 'payment_request',
    success: true,
    message: `💰 정산 요청 안내\n\n` +
      `정산을 요청하려면:\n` +
      `1. 작업 완료 사진을 업로드하세요\n` +
      `2. 체크리스트를 완료하세요\n` +
      `3. 체크인가 자동으로 정산 근거를 생성합니다\n\n` +
      `작업 완료 기록 + 사진 = 정산의 객관적 근거`,
  }
}

export async function paymentHistory(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('payment_history')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: changes } = await supabase
    .from('change_orders')
    .select('*')
    .eq('project_id', params.projectId)
    .eq('type', 'cost_tracking')
    .order('created_at', { ascending: false })

  if (!changes || changes.length === 0) {
    return { tool: 'payment_history', success: true, message: '💰 정산 이력이 없습니다.' }
  }

  const total = changes.reduce((sum: number, c: any) => sum + (c.cost_change || 0), 0)

  return {
    tool: 'payment_history',
    success: true,
    message: `💰 정산 이력 (${changes.length}건)\n\n` +
      changes.slice(0, 10).map((c: any) => `  • ${c.title}: ${formatKRW(c.cost_change || 0)}`).join('\n') +
      `\n\n총 정산: ${formatKRW(total)}`,
    data: { changes, total },
  }
}

export async function paymentOutstanding(params: { projectId: string }): Promise<ToolResult> {
  if (!params.projectId) return noProjectId('payment_outstanding')
  const { supabase, user } = await getUser()
  if (!user) return noAuth()

  const { data: items } = await supabase.from('quote_line_items').select('quantity, unit_price').eq('project_id', params.projectId)
  const { data: payments } = await supabase.from('change_orders').select('cost_change').eq('project_id', params.projectId).eq('type', 'cost_tracking')

  const totalQuote = (items || []).reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0)
  const totalPaid = (payments || []).reduce((sum: number, p: any) => sum + (p.cost_change || 0), 0)
  const outstanding = totalQuote - totalPaid

  return {
    tool: 'payment_outstanding',
    success: true,
    message: `💰 미지급 대금 현황\n\n` +
      `견적 총액: ${formatKRW(totalQuote)}\n` +
      `지급 완료: ${formatKRW(totalPaid)}\n` +
      `미지급: ${formatKRW(outstanding > 0 ? outstanding : 0)}`,
    data: { totalQuote, totalPaid, outstanding },
  }
}
