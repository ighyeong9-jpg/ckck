/**
 * AI Agent 도구 정의 및 실행기
 * 12개 도구: Mock이든 실제 Claude든 동일한 실행 로직
 */

import { createClient } from '@/lib/supabase/server'
import { checklistMap, checklistOptions } from '@/data/checklists'
import { industryInfo, industryRiskWeights } from '@/data/industries'
import { calculateRiskScore, getRiskGradeAndLevel, type RiskFactors } from '@/lib/utils/riskCalculator'
import { calculateCost, formatKRW, type CostFactor, DEFAULT_COST_FACTORS } from '@/lib/utils/costCalculator'
import type { ProjectContext } from './context'

export interface ToolResult {
  tool: string
  success: boolean
  message: string
  data?: any
}

// ═══════════════════════════════════════════════
// 1) project_setup: 프로젝트 생성 + 체크리스트 자동 생성
// ═══════════════════════════════════════════════
export async function projectSetup(params: {
  industry: string
  name?: string
  area?: number
  budget?: number
}): Promise<ToolResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tool: 'project_setup', success: false, message: '로그인이 필요합니다.' }

  const industry = params.industry || 'cafe'
  const info = industryInfo[industry as keyof typeof industryInfo]
  const name = params.name || `${info?.name || '새'} 프로젝트`
  const area = params.area || 20

  const now = new Date()
  const endDate = new Date(now)
  endDate.setMonth(endDate.getMonth() + 2)

  const { data: project, error } = await supabase
    .from('projects')
    .insert([{
      user_id: user.id,
      name,
      client_name: '',
      industry,
      status: 'planning',
      progress: 0,
      risk_score: 0,
      start_date: now.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    }])
    .select()
    .single()

  if (error) return { tool: 'project_setup', success: false, message: `프로젝트 생성 실패: ${error.message}` }

  // 체크리스트 자동 생성 (업종 기반)
  const checklist = checklistMap[industry]
  let checklistCount = 0
  if (checklist && project) {
    const responses: Record<string, boolean> = {}
    checklist.items.forEach((item: any) => {
      responses[item.id] = false
    })

    await supabase.from('diagnostic_responses').insert([{
      project_id: project.id,
      checklist_id: industry,
      responses,
      risk_scores: { Fp: 50, Oc: 50, Ch: 50 },
    }])
    checklistCount = checklist.items.length
  }

  return {
    tool: 'project_setup',
    success: true,
    message: `✅ "${name}" 프로젝트가 생성되었습니다!\n` +
      `📍 업종: ${info?.icon} ${info?.name}\n` +
      `📐 면적: ${area}평\n` +
      `📋 체크리스트: ${checklistCount}개 항목 자동 생성\n` +
      `🔗 프로젝트 페이지에서 확인하세요.`,
    data: { projectId: project.id, name, industry, checklistCount },
  }
}

// ═══════════════════════════════════════════════
// 2) checklist_analyze: 진단 완료율 + 리스크 분석
// ═══════════════════════════════════════════════
export async function checklistAnalyze(ctx: ProjectContext): Promise<ToolResult> {
  if (!ctx.project) return { tool: 'checklist_analyze', success: false, message: '프로젝트를 먼저 선택해주세요.' }

  const supabase = createClient()
  const { data: diagnostic } = await supabase
    .from('diagnostic_responses')
    .select('*')
    .eq('project_id', ctx.project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!diagnostic) {
    return { tool: 'checklist_analyze', success: true, message: '📋 아직 진단 데이터가 없습니다. 진단 페이지에서 체크리스트를 작성해주세요.' }
  }

  const responses = diagnostic.responses || {}
  const total = Object.keys(responses).length
  const checked = Object.values(responses).filter(Boolean).length
  const completionRate = total > 0 ? Math.round((checked / total) * 100) : 0
  const unchecked = total - checked

  const riskScores = diagnostic.risk_scores || { Fp: 50, Oc: 50, Ch: 50 }
  const weights = industryRiskWeights[ctx.project.industry as keyof typeof industryRiskWeights] || { Wf: 0.4, Wo: 0.35, Wc: 0.25 }
  const risk = calculateRiskScore(riskScores as RiskFactors, weights)

  return {
    tool: 'checklist_analyze',
    success: true,
    message: `📊 진단 분석 결과\n\n` +
      `✅ 완료율: ${completionRate}% (${checked}/${total})\n` +
      `⚠️ 미체크 항목: ${unchecked}건\n\n` +
      `🎯 리스크 점수: ${risk.total}점 (등급: ${risk.grade})\n` +
      `  💰 재정 위험: ${risk.breakdown.financial}점\n` +
      `  ⚙️ 운영 복잡도: ${risk.breakdown.operational}점\n` +
      `  🔄 변경 리스크: ${risk.breakdown.change}점\n\n` +
      `${risk.level === 'high' ? '🚨 고위험 - 즉시 조치가 필요합니다!' : risk.level === 'medium' ? '⚠️ 중간 위험 - 주의가 필요합니다.' : '✅ 저위험 - 양호한 상태입니다.'}`,
    data: { completionRate, unchecked, risk },
  }
}

// ═══════════════════════════════════════════════
// 3) quote_generate: 업종 기반 표준 견적 자동 생성
// ═══════════════════════════════════════════════
export async function quoteGenerate(ctx: ProjectContext, params?: { area?: number }): Promise<ToolResult> {
  if (!ctx.project) return { tool: 'quote_generate', success: false, message: '프로젝트를 먼저 선택해주세요.' }

  const supabase = createClient()
  const industry = ctx.project.industry || 'cafe'
  const area = params?.area || 20

  // 업종별 표준 공종 + 단가 (평당)
  const standardItems: Record<string, Array<{ name: string; category: string; spec: string; unit: string; qtyPerPyeong: number; unitPrice: number }>> = {
    cafe: [
      { name: '철거 공사', category: '철거', spec: '기존 시설 철거', unit: '식', qtyPerPyeong: 1, unitPrice: 150000 * area },
      { name: '바닥 타일 시공', category: '바닥', spec: '포세린 타일 600x600', unit: '평', qtyPerPyeong: 1, unitPrice: 85000 },
      { name: '벽체 도장', category: '도장', spec: '친환경 페인트 2회 도장', unit: '평', qtyPerPyeong: 2.5, unitPrice: 25000 },
      { name: '천장 경량틀+텍스', category: '천장', spec: '경량틀 T바 텍스', unit: '평', qtyPerPyeong: 1, unitPrice: 55000 },
      { name: '전기 배선 공사', category: '전기', spec: '콘센트+조명 배선', unit: '식', qtyPerPyeong: 1, unitPrice: 120000 * area },
      { name: '조명 설치', category: '전기', spec: 'LED 다운라이트+간접', unit: '식', qtyPerPyeong: 1, unitPrice: 80000 * area },
      { name: '에어컨 설치', category: '설비', spec: '천장형 시스템 에어컨', unit: '대', qtyPerPyeong: 0.05, unitPrice: 1800000 },
      { name: '상하수도 배관', category: '설비', spec: '급/배수 배관', unit: '식', qtyPerPyeong: 1, unitPrice: 100000 * area },
      { name: '카운터 제작', category: '가구', spec: '맞춤 카운터 + 싱크대', unit: '식', qtyPerPyeong: 1, unitPrice: 3500000 },
      { name: '간판 제작', category: '외부', spec: '채널 간판 + 돌출 간판', unit: '식', qtyPerPyeong: 1, unitPrice: 2500000 },
    ],
    restaurant: [
      { name: '철거 공사', category: '철거', spec: '기존 시설 철거', unit: '식', qtyPerPyeong: 1, unitPrice: 180000 * area },
      { name: '바닥 논슬립 타일', category: '바닥', spec: '논슬립 타일 주방+홀', unit: '평', qtyPerPyeong: 1, unitPrice: 90000 },
      { name: '주방 설비', category: '설비', spec: '후드+배기+급배수', unit: '식', qtyPerPyeong: 1, unitPrice: 250000 * area },
      { name: '벽체 도장+타일', category: '벽체', spec: '주방 타일+홀 도장', unit: '평', qtyPerPyeong: 2.5, unitPrice: 35000 },
      { name: '전기 배선', category: '전기', spec: '동력+콘센트+조명', unit: '식', qtyPerPyeong: 1, unitPrice: 150000 * area },
      { name: '에어컨 설치', category: '설비', spec: '천장형 시스템 에어컨', unit: '대', qtyPerPyeong: 0.05, unitPrice: 1800000 },
      { name: '가스 배관', category: '설비', spec: '가스 배관 공사', unit: '식', qtyPerPyeong: 1, unitPrice: 80000 * area },
      { name: '간판 제작', category: '외부', spec: '채널 간판', unit: '식', qtyPerPyeong: 1, unitPrice: 2000000 },
    ],
  }

  // 기본 공종 (업종 매핑 없는 경우)
  const defaultItems = [
    { name: '철거 공사', category: '철거', spec: '기존 시설 철거', unit: '식', qtyPerPyeong: 1, unitPrice: 150000 * area },
    { name: '바닥 공사', category: '바닥', spec: '바닥재 시공', unit: '평', qtyPerPyeong: 1, unitPrice: 80000 },
    { name: '도장 공사', category: '도장', spec: '벽면 도장', unit: '평', qtyPerPyeong: 2.5, unitPrice: 25000 },
    { name: '전기 공사', category: '전기', spec: '전기 배선', unit: '식', qtyPerPyeong: 1, unitPrice: 120000 * area },
    { name: '설비 공사', category: '설비', spec: '급/배수+에어컨', unit: '식', qtyPerPyeong: 1, unitPrice: 100000 * area },
    { name: '천장 공사', category: '천장', spec: '천장 마감', unit: '평', qtyPerPyeong: 1, unitPrice: 55000 },
  ]

  const items = standardItems[industry] || defaultItems

  const insertData = items.map(item => ({
    project_id: ctx.project.id,
    item_name: item.name,
    category: item.category,
    specification: item.spec,
    unit: item.unit,
    quantity: item.unit === '식' ? 1 : Math.ceil(area * item.qtyPerPyeong),
    unit_price: item.unitPrice,
  }))

  const { data: inserted, error } = await supabase
    .from('quote_line_items')
    .insert(insertData)
    .select()

  if (error) return { tool: 'quote_generate', success: false, message: `견적 생성 실패: ${error.message}` }

  const total = (inserted || []).reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const vat = Math.round(total * 0.1)

  return {
    tool: 'quote_generate',
    success: true,
    message: `⚡ 견적서가 생성되었습니다!\n\n` +
      `📐 기준 면적: ${area}평 | 업종: ${industryInfo[industry as keyof typeof industryInfo]?.name || industry}\n` +
      `📝 ${(inserted || []).length}개 공종 자동 생성\n\n` +
      `💰 소계: ${formatKRW(total)}\n` +
      `💰 VAT: ${formatKRW(vat)}\n` +
      `💰 총액: ${formatKRW(total + vat)}\n\n` +
      `견적서 페이지에서 상세 내역을 확인하고 수정하세요.`,
    data: { itemCount: (inserted || []).length, subtotal: total, vat, total: total + vat },
  }
}

// ═══════════════════════════════════════════════
// 4) cost_analyze: 비용 적정성 분석
// ═══════════════════════════════════════════════
export async function costAnalyze(ctx: ProjectContext): Promise<ToolResult> {
  if (!ctx.project) return { tool: 'cost_analyze', success: false, message: '프로젝트를 먼저 선택해주세요.' }

  if (ctx.quoteItems.length === 0) {
    return { tool: 'cost_analyze', success: true, message: '📊 견적 항목이 없습니다. 먼저 "견적 만들어줘"로 견적을 생성해주세요.' }
  }

  const baseCost = ctx.quoteItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)

  const factors: CostFactor[] = DEFAULT_COST_FACTORS.map(f => ({
    ...f,
    factor: Math.random() * 0.3 + 0.1, // Mock: 10~40% 영향도
  }))

  const result = calculateCost({ baseCost, factors })

  // DB 저장
  const supabase = createClient()
  await supabase.from('cost_analysis').upsert({
    project_id: ctx.project.id,
    base_cost: baseCost,
    adjusted_cost: result.adjustedCost,
    cost_difference: result.costDifference,
    complexity_weight: 0.15, complexity_factor: factors[0].factor,
    timeline_weight: 0.10, timeline_factor: factors[1].factor,
    material_weight: 0.12, material_factor: factors[2].factor,
    labor_weight: 0.08, labor_factor: factors[3].factor,
    risk_weight: 0.10, risk_factor: factors[4].factor,
    notes: 'AI 체키 자동 분석',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id' })

  return {
    tool: 'cost_analyze',
    success: true,
    message: `🤖 비용 적정성 분석 완료\n\n` +
      `💰 기본 비용(Cb): ${formatKRW(baseCost)}\n` +
      `📊 조정 비용(ΔC): ${formatKRW(result.adjustedCost)}\n` +
      `📈 차이: ${formatKRW(result.costDifference)} (+${(result.adjustmentRate * 100).toFixed(1)}%)\n\n` +
      `주요 비용 요인:\n` +
      result.factorContributions.slice(0, 3).map(fc =>
        `  • ${fc.name}: +${fc.contributionRate.toFixed(1)}%`
      ).join('\n') +
      `\n\n비용분석 페이지에서 상세 내역을 확인하세요.`,
    data: result,
  }
}

// ═══════════════════════════════════════════════
// 5) risk_calculate: 리스크 점수 계산
// ═══════════════════════════════════════════════
export async function riskCalculate(ctx: ProjectContext): Promise<ToolResult> {
  if (!ctx.project) return { tool: 'risk_calculate', success: false, message: '프로젝트를 먼저 선택해주세요.' }

  const industry = ctx.project.industry || 'cafe'
  const weights = industryRiskWeights[industry as keyof typeof industryRiskWeights] || { Wf: 0.4, Wo: 0.35, Wc: 0.25 }

  // 실제 데이터 기반 리스크 계산
  const quoteTotal = ctx.quoteItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
  const Fp = quoteTotal > 50000000 ? 70 : quoteTotal > 30000000 ? 50 : 30  // 재정 위험
  const Oc = ctx.processes.length > 0 ? Math.min(ctx.processes.length * 8, 80) : 40  // 운영 복잡도
  const Ch = ctx.changeOrders.length * 15  // 변경 리스크

  const factors: RiskFactors = { Fp, Oc, Ch: Math.min(Ch, 100) }
  const result = calculateRiskScore(factors, weights)

  // DB 업데이트
  const supabase = createClient()
  await supabase.from('projects').update({ risk_score: result.total }).eq('id', ctx.project.id)

  return {
    tool: 'risk_calculate',
    success: true,
    message: `🎯 리스크 분석 결과\n\n` +
      `R = Fp×Wf + Oc×Wo + Ch×Wc\n` +
      `R = ${Fp}×${weights.Wf} + ${Oc}×${weights.Wo} + ${Math.min(Ch, 100)}×${weights.Wc}\n\n` +
      `📊 총점: ${result.total}점 | 등급: ${result.grade} | ${result.level === 'high' ? '🔴 고위험' : result.level === 'medium' ? '🟡 중간' : '🟢 저위험'}\n\n` +
      `💰 재정 위험(Fp): ${result.breakdown.financial}점\n` +
      `⚙️ 운영 복잡도(Oc): ${result.breakdown.operational}점\n` +
      `🔄 변경 리스크(Ch): ${result.breakdown.change}점`,
    data: result,
  }
}

// ═══════════════════════════════════════════════
// 6) change_record: 변경관리 등록
// ═══════════════════════════════════════════════
export async function changeRecord(ctx: ProjectContext, params: {
  title?: string
  reason?: string
  costChange?: number
}): Promise<ToolResult> {
  if (!ctx.project) return { tool: 'change_record', success: false, message: '프로젝트를 먼저 선택해주세요.' }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('change_orders')
    .insert([{
      project_id: ctx.project.id,
      title: params.title || 'AI 생성 변경요청',
      type: 'addition',
      reason: params.reason || '체키 AI에 의한 변경 등록',
      cost_change: params.costChange || 0,
      status: 'requested',
    }])
    .select()
    .single()

  if (error) return { tool: 'change_record', success: false, message: `변경 등록 실패: ${error.message}` }

  return {
    tool: 'change_record',
    success: true,
    message: `📝 변경요청이 등록되었습니다.\n\n` +
      `제목: ${params.title || 'AI 생성 변경요청'}\n` +
      `비용 영향: ${formatKRW(params.costChange || 0)}\n` +
      `상태: 요청됨\n\n변경관리 페이지에서 승인/반려를 진행하세요.`,
    data,
  }
}

// ═══════════════════════════════════════════════
// 7) evidence_package: 증빙 패키지 정보
// ═══════════════════════════════════════════════
export async function evidencePackage(ctx: ProjectContext): Promise<ToolResult> {
  if (!ctx.project) return { tool: 'evidence_package', success: false, message: '프로젝트를 먼저 선택해주세요.' }

  const files = ctx.evidenceFiles
  const totalSize = files.reduce((sum, f) => sum + (f.file_size || 0), 0)
  const categories = [...new Set(files.map((f: any) => f.category))]

  return {
    tool: 'evidence_package',
    success: true,
    message: `📦 증빙 패키지 현황\n\n` +
      `📎 총 파일: ${files.length}개\n` +
      `💾 총 용량: ${(totalSize / 1024 / 1024).toFixed(1)}MB\n` +
      `📁 카테고리: ${categories.length > 0 ? categories.join(', ') : '없음'}\n\n` +
      (files.length > 0
        ? `최근 파일:\n` + files.slice(0, 3).map((f: any) => `  • ${f.file_name}`).join('\n')
        : '증빙 파일을 업로드하면 SHA-256 해시와 Merkle Tree로 무결성이 보장됩니다.'),
    data: { fileCount: files.length, totalSize, categories },
  }
}

// ═══════════════════════════════════════════════
// 8) agreement_create: 3자 합의 생성
// ═══════════════════════════════════════════════
export async function agreementCreate(ctx: ProjectContext): Promise<ToolResult> {
  if (!ctx.project) return { tool: 'agreement_create', success: false, message: '프로젝트를 먼저 선택해주세요.' }

  const supabase = createClient()
  const quoteTotal = ctx.quoteItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
  const totalWithVat = Math.round(quoteTotal * 1.1)

  const existing = ctx.agreements.length > 0

  if (existing) {
    return { tool: 'agreement_create', success: true, message: `📋 이미 합의서가 존재합니다. 합의 페이지에서 확인하세요.` }
  }

  const { error } = await supabase.from('agreements').insert([{
    project_id: ctx.project.id,
    status: 'pending',
    total_amount: totalWithVat,
    content: `${ctx.project.name} 프로젝트에 대한 3자 합의서입니다.`,
    client_agreed: false,
    contractor_agreed: false,
    manager_agreed: false,
  }])

  if (error) return { tool: 'agreement_create', success: false, message: `합의서 생성 실패: ${error.message}` }

  return {
    tool: 'agreement_create',
    success: true,
    message: `📋 3자 합의서가 생성되었습니다!\n\n` +
      `💰 합의 금액: ${formatKRW(totalWithVat)}\n` +
      `👤 발주자: 서명 대기\n` +
      `🏗️ 시공자: 서명 대기\n` +
      `📊 감리자: 서명 대기\n\n합의 페이지에서 서명을 진행하세요.`,
    data: { totalAmount: totalWithVat },
  }
}

// ═══════════════════════════════════════════════
// 9) report_generate: 종합 리포트 생성
// ═══════════════════════════════════════════════
export async function reportGenerate(ctx: ProjectContext): Promise<ToolResult> {
  if (!ctx.project) return { tool: 'report_generate', success: false, message: '프로젝트를 먼저 선택해주세요.' }

  const supabase = createClient()
  const quoteTotal = ctx.quoteItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
  const { grade } = getRiskGradeAndLevel(ctx.project.risk_score || 0)

  const { data: report, error } = await supabase
    .from('reports')
    .insert([{
      project_id: ctx.project.id,
      type: 'comprehensive',
      title: `${ctx.project.name} - AI 종합 리포트`,
      data: {
        projectName: ctx.project.name,
        riskScore: ctx.project.risk_score,
        riskGrade: grade,
        quoteTotal,
        itemCount: ctx.quoteItems.length,
        processCount: ctx.processes.length,
        changeCount: ctx.changeOrders.length,
        evidenceCount: ctx.evidenceFiles.length,
      },
    }])
    .select()
    .single()

  if (error) return { tool: 'report_generate', success: false, message: `리포트 생성 실패: ${error.message}` }

  return {
    tool: 'report_generate',
    success: true,
    message: `📊 종합 리포트가 생성되었습니다!\n\n` +
      `📁 프로젝트: ${ctx.project.name}\n` +
      `🎯 리스크 등급: ${grade} (${ctx.project.risk_score || 0}점)\n` +
      `💰 견적 총액: ${formatKRW(quoteTotal)}\n` +
      `📋 견적 항목: ${ctx.quoteItems.length}개\n` +
      `🔧 공정: ${ctx.processes.length}개\n` +
      `🔄 변경요청: ${ctx.changeOrders.length}건\n` +
      `📎 증빙파일: ${ctx.evidenceFiles.length}개\n\n` +
      `리포트 페이지에서 PDF로 다운로드할 수 있습니다.`,
    data: report,
  }
}

// ═══════════════════════════════════════════════
// 10) schedule_check: 일정/공정 점검
// ═══════════════════════════════════════════════
export async function scheduleCheck(ctx: ProjectContext): Promise<ToolResult> {
  if (!ctx.project) return { tool: 'schedule_check', success: false, message: '프로젝트를 먼저 선택해주세요.' }

  const now = new Date()
  const end = new Date(ctx.project.end_date)
  const start = new Date(ctx.project.start_date)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const elapsed = totalDays - daysRemaining
  const expectedProgress = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0

  const completedProcesses = ctx.processes.filter((p: any) => p.status === 'completed').length
  const actualProgress = ctx.processes.length > 0
    ? Math.round((completedProcesses / ctx.processes.length) * 100)
    : ctx.project.progress || 0

  const delay = expectedProgress - actualProgress
  const isDelayed = delay > 10

  return {
    tool: 'schedule_check',
    success: true,
    message: `📅 일정 점검 결과\n\n` +
      `📆 시작: ${ctx.project.start_date} → 종료: ${ctx.project.end_date}\n` +
      `⏳ 잔여일: ${daysRemaining > 0 ? `${daysRemaining}일` : '기한 초과!'}\n\n` +
      `📊 예상 진행률: ${expectedProgress}%\n` +
      `📊 실제 진행률: ${actualProgress}%\n` +
      `🔧 공정: ${completedProcesses}/${ctx.processes.length} 완료\n\n` +
      (isDelayed
        ? `🚨 ${delay}% 지연 감지! 공정 가속이 필요합니다.`
        : daysRemaining <= 0
          ? `🚨 기한이 초과되었습니다!`
          : `✅ 일정이 정상적으로 진행 중입니다.`),
    data: { daysRemaining, expectedProgress, actualProgress, isDelayed, delay },
  }
}

// ═══════════════════════════════════════════════
// 11) verify_score: AI 검증 점수 산출
// ═══════════════════════════════════════════════
export async function verifyScore(ctx: ProjectContext): Promise<ToolResult> {
  if (!ctx.project) return { tool: 'verify_score', success: false, message: '프로젝트를 먼저 선택해주세요.' }

  // 적정성(30%) - 견적 데이터
  const costScore = ctx.quoteItems.length >= 5 ? 25 : ctx.quoteItems.length >= 3 ? 18 : ctx.quoteItems.length > 0 ? 10 : 0
  // 누락(25%) - 체크리스트 완료율
  const completenessScore = ctx.diagnosticCount > 0 ? 20 : 0
  // 계약(25%) - 합의/증빙
  const contractScore = (ctx.agreements.length > 0 ? 12 : 0) + (ctx.evidenceFiles.length > 0 ? 13 : 0)
  // 일정(20%) - 공정 진행
  const scheduleScore = ctx.processes.length > 0 ? 15 : 0

  const total = costScore + completenessScore + contractScore + scheduleScore
  const grade = total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B+' : total >= 60 ? 'B' : total >= 50 ? 'C' : 'D'

  return {
    tool: 'verify_score',
    success: true,
    message: `🤖 AI 검증 채점 결과\n\n` +
      `📊 총점: ${total}/100 | 등급: ${grade}\n\n` +
      `💰 비용 적정성: ${costScore}/25점\n` +
      `📋 누락 점검: ${completenessScore}/25점\n` +
      `📝 계약 안정성: ${contractScore}/25점\n` +
      `📅 일정 유효성: ${scheduleScore}/25점\n\n` +
      (total >= 70 ? '✅ 양호한 프로젝트 상태입니다.' : '⚠️ 개선이 필요한 항목이 있습니다.'),
    data: { total, grade, costScore, completenessScore, contractScore, scheduleScore },
  }
}

// ═══════════════════════════════════════════════
// 12) get_project_summary: 프로젝트 현황 요약
// ═══════════════════════════════════════════════
export async function getProjectSummary(ctx: ProjectContext): Promise<ToolResult> {
  if (!ctx.project) {
    // 프로젝트 선택 안 된 경우 전체 목록
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { tool: 'get_project_summary', success: false, message: '로그인이 필요합니다.' }

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5)

    if (!projects || projects.length === 0) {
      return {
        tool: 'get_project_summary',
        success: true,
        message: `안녕하세요! 체키입니다 🤖\n\n` +
          `아직 프로젝트가 없습니다.\n` +
          `"카페 20평 프로젝트 만들어줘"라고 말해보세요!`,
      }
    }

    return {
      tool: 'get_project_summary',
      success: true,
      message: `안녕하세요! 체키입니다 🤖\n\n` +
        `📁 프로젝트 ${projects.length}개:\n` +
        projects.map((p: any) => {
          const { grade } = getRiskGradeAndLevel(p.risk_score || 0)
          return `  • ${p.name} (${p.status === 'completed' ? '완료' : p.status === 'in_progress' ? '진행중' : '계획'}  | 리스크 ${grade})`
        }).join('\n') +
        `\n\n프로젝트를 선택하면 상세 분석을 도와드립니다.\n` +
        `무엇을 도와드릴까요?`,
      data: { projects },
    }
  }

  const { grade } = getRiskGradeAndLevel(ctx.project.risk_score || 0)
  const quoteTotal = ctx.quoteItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)

  return {
    tool: 'get_project_summary',
    success: true,
    message: `🤖 "${ctx.project.name}" 현황 요약\n\n` +
      `📊 진행률: ${ctx.project.progress || 0}%\n` +
      `🎯 리스크: ${grade} (${ctx.project.risk_score || 0}점)\n` +
      `💰 견적: ${quoteTotal > 0 ? formatKRW(quoteTotal) : '미작성'}\n` +
      `📋 진단: ${ctx.diagnosticCount > 0 ? `${ctx.diagnosticCount}건` : '미시작'}\n` +
      `🔧 공정: ${ctx.processes.length}개\n` +
      `🔄 변경: ${ctx.changeOrders.length}건\n` +
      `📎 증빙: ${ctx.evidenceFiles.length}개\n` +
      `📊 리포트: ${ctx.reports.length}건\n\n` +
      `무엇을 도와드릴까요? 예시:\n` +
      `• "견적 만들어줘"\n` +
      `• "리스크 분석해줘"\n` +
      `• "리포트 생성해줘"`,
    data: { project: ctx.project, quoteTotal, grade },
  }
}
