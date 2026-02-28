/**
 * 법령 룰 엔진
 * 12개 법령 자동 체크 → law_checks 저장 → 리스크 점수 재계산
 */
import { createClient } from '@/lib/supabase/server'
import { calculateAndSaveRiskScore } from './riskEngine'

export type LawCheckStatus = 'compliant' | 'violated' | 'not_applicable' | 'pending'

export interface LawCheckResult {
  law_id: string
  law_code: string
  law_name: string
  article: string
  title: string
  status: LawCheckStatus
  go_nogo: 'go' | 'nogo' | 'pending'
  details: Record<string, unknown>
  checked_at: string
}

// 주거용 프로젝트 업종 (CONSUMER_BASIC 적용 대상)
const RESIDENTIAL_TYPES = ['residential', 'apartment', 'villa', 'house', 'oneroom', 'officetel']

// 건산법 시행령 별표4 공종별 최소 하자담보기간 (년)
const MIN_WARRANTY_PERIODS: Record<string, number> = {
  '철근콘크리트공사': 5,
  '철골공사': 5,
  '방수공사': 3,
  '전기공사': 2,
  '통신공사': 2,
  '설비공사': 2,
  '수장공사': 1,
  '도장공사': 1,
  '석공사': 1,
  '창호공사': 1,
  '대지조성공사': 2,
  '조경공사': 2,
}

function toGoNogo(status: LawCheckStatus): 'go' | 'nogo' | 'pending' {
  if (status === 'violated') return 'nogo'
  if (status === 'pending') return 'pending'
  return 'go'
}

type SupabaseClient = ReturnType<typeof createClient>

/**
 * 단일 법령 체크 로직
 */
async function checkSingleLaw(
  projectId: string,
  law: { id: string; code: string; name: string; article: string; title: string },
  supabase: SupabaseClient
): Promise<{ status: LawCheckStatus; details: Record<string, unknown> }> {
  switch (law.code) {

    // 1. 건설산업기본법 제28조 — 하자담보책임
    case 'CONST_BASIC_28': {
      const { count } = await supabase
        .from('warranties')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
      const warrantyCount = count ?? 0
      return {
        status: warrantyCount > 0 ? 'compliant' : 'violated',
        details: { warranty_count: warrantyCount, check: 'warranties 테이블 등록 여부' },
      }
    }

    // 2. 민법 제667조 — 수급인 담보책임
    case 'CIVIL_667': {
      const { data: responses } = await supabase
        .from('diagnostic_responses')
        .select('checked')
        .eq('project_id', projectId)
      if (!responses || responses.length === 0) {
        return { status: 'violated', details: { reason: '체크리스트 항목 없음', total: 0 } }
      }
      const checkedCount = responses.filter(r => r.checked).length
      return {
        status: checkedCount > 0 ? 'compliant' : 'violated',
        details: { total: responses.length, checked: checkedCount },
      }
    }

    // 3. 건산법 시행령 별표4 — 공종별 하자담보기간
    case 'CONST_REG_SCH4': {
      const { data: warranties } = await supabase
        .from('warranties')
        .select('category, duration_years')
        .eq('project_id', projectId)
      if (!warranties || warranties.length === 0) {
        return { status: 'violated', details: { reason: '하자담보 미등록', warranty_count: 0 } }
      }
      const violations: string[] = []
      for (const w of warranties) {
        const minYears = MIN_WARRANTY_PERIODS[w.category]
        if (minYears !== undefined && w.duration_years < minYears) {
          violations.push(`${w.category}: ${w.duration_years}년 (최소 ${minYears}년)`)
        }
      }
      return {
        status: violations.length > 0 ? 'violated' : 'compliant',
        details: { checked_count: warranties.length, violations },
      }
    }

    // 4. 공정거래법 — 하도급 부당감액 금지
    case 'FTC_SUBCONTRACT': {
      const { data: changeOrders } = await supabase
        .from('change_orders')
        .select('cost_change')
        .eq('project_id', projectId)
      if (!changeOrders || changeOrders.length === 0) {
        return { status: 'not_applicable', details: { reason: '변경 주문 없음' } }
      }
      const { data: quoteItems } = await supabase
        .from('quote_line_items')
        .select('amount')
        .eq('project_id', projectId)
      const originalBudget = quoteItems
        ? quoteItems.reduce((sum, q) => sum + (q.amount || 0), 0)
        : 0
      if (originalBudget === 0) {
        return { status: 'not_applicable', details: { reason: '원계약 예산 없음' } }
      }
      const totalReduction = changeOrders
        .filter(co => co.cost_change < 0)
        .reduce((sum, co) => sum + Math.abs(co.cost_change), 0)
      const reductionRatio = totalReduction / originalBudget
      return {
        status: reductionRatio > 0.20 ? 'violated' : 'compliant',
        details: {
          original_budget: originalBudget,
          total_reduction: totalReduction,
          reduction_ratio_pct: Math.round(reductionRatio * 1000) / 10,
          threshold_pct: 20,
        },
      }
    }

    // 5. 민법 제580조 — 매도인의 하자담보책임
    case 'CIVIL_580': {
      const { count } = await supabase
        .from('evidence_files')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('category', '자재')
      const materialEvidenceCount = count ?? 0
      return {
        status: materialEvidenceCount > 0 ? 'compliant' : 'violated',
        details: { material_evidence_count: materialEvidenceCount, required_category: '자재' },
      }
    }

    // 6. 건설분쟁조정 — 분쟁조정위원회 절차
    case 'CONST_DISPUTE': {
      const { data: project } = await supabase
        .from('projects')
        .select('risk_score')
        .eq('id', projectId)
        .single()
      const riskScore = project?.risk_score ?? 0
      if (riskScore < 50) {
        return {
          status: 'not_applicable',
          details: { risk_score: riskScore, reason: 'risk_score 50 미만 — 분쟁 대비 불필요' },
        }
      }
      const { count } = await supabase
        .from('evidence_files')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('is_evidence', true)
      const evidenceCount = count ?? 0
      return {
        status: evidenceCount >= 3 ? 'compliant' : 'violated',
        details: { risk_score: riskScore, evidence_count: evidenceCount, required: 3 },
      }
    }

    // 7. 소비자기본법 — 소비자 분쟁해결기준
    case 'CONSUMER_BASIC': {
      const { data: project } = await supabase
        .from('projects')
        .select('industry')
        .eq('id', projectId)
        .single()
      const industry = project?.industry ?? 'general'
      if (!RESIDENTIAL_TYPES.includes(industry)) {
        return {
          status: 'not_applicable',
          details: { industry, reason: '비주거용 프로젝트' },
        }
      }
      const { count } = await supabase
        .from('agreements')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
      const agreementCount = count ?? 0
      return {
        status: agreementCount > 0 ? 'compliant' : 'violated',
        details: { industry, agreement_count: agreementCount, check: '합의서 등록 여부' },
      }
    }

    // 8. 전자서명법 — 전자문서 법적 효력
    case 'E_SIGN': {
      const { data: allFiles } = await supabase
        .from('evidence_files')
        .select('sha256_hash')
        .eq('project_id', projectId)
      if (!allFiles || allFiles.length === 0) {
        return { status: 'not_applicable', details: { reason: '증빙 파일 없음' } }
      }
      const nullHashCount = allFiles.filter(f => !f.sha256_hash).length
      return {
        status: nullHashCount === 0 ? 'compliant' : 'violated',
        details: { total_files: allFiles.length, null_hash_count: nullHashCount },
      }
    }

    // 9. 근로기준법 — 임금 지급 의무
    case 'LABOR_STD': {
      const { count } = await supabase
        .from('workforce')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
      const workforceCount = count ?? 0
      return {
        status: workforceCount > 0 ? 'compliant' : 'pending',
        details: {
          workforce_count: workforceCount,
          note: workforceCount === 0 ? '인력 기록 없음 — 향후 인력관리 모듈 등록 필요' : undefined,
        },
      }
    }

    // 10. 산업안전보건법 — 안전조치 의무
    case 'ISAFETY': {
      const { data: safetyResponses } = await supabase
        .from('diagnostic_responses')
        .select('checked')
        .eq('project_id', projectId)
        .eq('category', '안전')
      if (!safetyResponses || safetyResponses.length === 0) {
        return { status: 'not_applicable', details: { reason: '안전 카테고리 체크리스트 없음' } }
      }
      const checkedCount = safetyResponses.filter(r => r.checked).length
      const completionRate = checkedCount / safetyResponses.length
      return {
        status: completionRate >= 0.8 ? 'compliant' : 'violated',
        details: {
          total: safetyResponses.length,
          checked: checkedCount,
          completion_rate_pct: Math.round(completionRate * 1000) / 10,
          required_pct: 80,
        },
      }
    }

    // 11. 건축법 — 건축물 사용승인
    case 'BUILDING_ACT': {
      const { data: project } = await supabase
        .from('projects')
        .select('status')
        .eq('id', projectId)
        .single()
      const projectStatus = project?.status ?? 'planning'
      if (!['completed', 'review'].includes(projectStatus)) {
        return {
          status: 'pending',
          details: { project_status: projectStatus, reason: '준공 전 상태 — 사용승인 체크 대기' },
        }
      }
      const { data: lawResponses } = await supabase
        .from('diagnostic_responses')
        .select('checked')
        .eq('project_id', projectId)
        .eq('category', '법규')
      if (!lawResponses || lawResponses.length === 0) {
        return {
          status: 'violated',
          details: { project_status: projectStatus, reason: '법규 카테고리 체크리스트 없음' },
        }
      }
      const checkedCount = lawResponses.filter(r => r.checked).length
      const completionRate = checkedCount / lawResponses.length
      return {
        status: completionRate >= 0.8 ? 'compliant' : 'violated',
        details: {
          project_status: projectStatus,
          total: lawResponses.length,
          checked: checkedCount,
          completion_rate_pct: Math.round(completionRate * 1000) / 10,
          required_pct: 80,
        },
      }
    }

    // 12. 민사소송법 — 증거보전 절차
    case 'CIV_PROC': {
      const { data: evidenceFiles } = await supabase
        .from('evidence_files')
        .select('sha256_hash, merkle_root')
        .eq('project_id', projectId)
      if (!evidenceFiles || evidenceFiles.length === 0) {
        return { status: 'not_applicable', details: { reason: '증빙 파일 없음' } }
      }
      const nullHashCount = evidenceFiles.filter(f => !f.sha256_hash).length
      const nullMerkleCount = evidenceFiles.filter(f => !f.merkle_root).length
      return {
        status: nullHashCount > 0 || nullMerkleCount > 0 ? 'violated' : 'compliant',
        details: {
          total_files: evidenceFiles.length,
          null_hash_count: nullHashCount,
          null_merkle_count: nullMerkleCount,
        },
      }
    }

    // ── 소방 법령 (13~17) ─────────────────────────────────────

    // 13. 소방시설법 / 14. 건축법 방화구획 — fire_checklist_check
    case 'FIRE_FACILITY':
    case 'FIRE_PREVENTION':
    case 'BUILDING_FIRE': {
      // check_conditions에서 target_category, min_completion 추출
      const { data: lawRow } = await supabase
        .from('laws')
        .select('check_conditions')
        .eq('code', law.code)
        .single()
      const cond = (lawRow?.check_conditions ?? {}) as {
        target_category?: string
        min_completion?: number
      }
      const targetCat = cond.target_category ?? 'fire_facility'
      const minPct = cond.min_completion ?? 70

      const { data: responses } = await supabase
        .from('diagnostic_responses')
        .select('checked')
        .eq('project_id', projectId)
        .eq('category', targetCat)

      // 소방은 체크리스트 없으면 violated (다른 법령은 not_applicable)
      if (!responses || responses.length === 0) {
        return {
          status: 'violated',
          details: { reason: `${targetCat} 소방 체크리스트 없음 — 소방은 미작성이 위반`, category: targetCat },
        }
      }
      const checkedCount = responses.filter(r => r.checked).length
      const completionRate = checkedCount / responses.length
      const completionPct = Math.round(completionRate * 1000) / 10
      return {
        status: completionPct >= minPct ? 'compliant' : 'violated',
        details: {
          total: responses.length,
          checked: checkedCount,
          completion_pct: completionPct,
          required_pct: minPct,
          category: targetCat,
        },
      }
    }

    // 15. 중대재해처벌법 — compound_check (소방 + 안전 복합 확인)
    case 'SERIOUS_ACCIDENT': {
      const requiredCategories = ['fire_facility', 'fire_prevention', '안전']
      const minPct = 80

      const categoryResults: { category: string; pct: number; has_data: boolean }[] = []

      for (const cat of requiredCategories) {
        const { data: responses } = await supabase
          .from('diagnostic_responses')
          .select('checked')
          .eq('project_id', projectId)
          .eq('category', cat)

        if (!responses || responses.length === 0) {
          categoryResults.push({ category: cat, pct: 0, has_data: false })
          continue
        }
        const checkedCount = responses.filter(r => r.checked).length
        const pct = Math.round((checkedCount / responses.length) * 1000) / 10
        categoryResults.push({ category: cat, pct, has_data: true })
      }

      // 하나라도 데이터 없거나 min_completion 미달이면 violated
      const hasViolation = categoryResults.some(r => !r.has_data || r.pct < minPct)
      return {
        status: hasViolation ? 'violated' : 'compliant',
        details: {
          required_pct: minPct,
          categories: categoryResults,
          any_missing: categoryResults.some(r => !r.has_data),
        },
      }
    }

    // 17. 다중이용업소법 — multi_use_check
    case 'MULTI_USE': {
      const { data: project } = await supabase
        .from('projects')
        .select('industry')
        .eq('id', projectId)
        .single()
      const industry = project?.industry ?? 'general'
      const applicableTypes = ['cafe', 'restaurant', 'bar', 'bakery', 'beauty', 'fitness', 'retail']

      if (!applicableTypes.includes(industry)) {
        return {
          status: 'not_applicable',
          details: { industry, reason: '다중이용업소 해당 없음' },
        }
      }

      const { data: responses } = await supabase
        .from('diagnostic_responses')
        .select('checked')
        .eq('project_id', projectId)
        .eq('category', 'fire_certificate')

      if (!responses || responses.length === 0) {
        return {
          status: 'violated',
          details: { industry, reason: 'fire_certificate 체크리스트 없음 — 소방완비증명 미진행' },
        }
      }
      const checkedCount = responses.filter(r => r.checked).length
      const completionPct = Math.round((checkedCount / responses.length) * 1000) / 10
      return {
        status: completionPct >= 90 ? 'compliant' : 'violated',
        details: {
          industry,
          total: responses.length,
          checked: checkedCount,
          completion_pct: completionPct,
          required_pct: 90,
        },
      }
    }

    default:
      return {
        status: 'pending',
        details: { reason: '알 수 없는 법령 코드', code: law.code },
      }
  }
}

/**
 * 프로젝트 전체 법령 체크 실행
 * → law_checks INSERT → 리스크 점수 재계산
 */
export async function checkAllLaws(projectId: string): Promise<LawCheckResult[]> {
  const supabase = createClient()

  const { data: laws, error } = await supabase
    .from('laws')
    .select('id, code, name, article, title')
    .eq('is_active', true)
    .order('sort_order')

  if (error || !laws) {
    throw new Error('법령 데이터를 불러올 수 없습니다.')
  }

  const results: LawCheckResult[] = []
  const checkedAt = new Date().toISOString()

  for (const law of laws) {
    const { status, details } = await checkSingleLaw(projectId, law, supabase)
    const go_nogo = toGoNogo(status)

    await supabase.from('law_checks').insert({
      project_id: projectId,
      law_id: law.id,
      status,
      go_nogo,
      details,
      checked_at: checkedAt,
      checked_by: 'system',
    })

    results.push({
      law_id: law.id,
      law_code: law.code,
      law_name: law.name,
      article: law.article,
      title: law.title,
      status,
      go_nogo,
      details,
      checked_at: checkedAt,
    })
  }

  // 법령 체크 완료 후 리스크 점수 자동 재계산
  await calculateAndSaveRiskScore(projectId)

  return results
}
