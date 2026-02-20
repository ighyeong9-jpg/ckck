/**
 * warranty-tracker.ts — 하자담보기간 자동 추적기
 *
 * 공종 완료 시 warranty_tracking 테이블에 레코드를 생성한다.
 * warranty_expires_date는 DB 트리거(trg_warranty_expires)가 자동 계산한다.
 *
 * 담보기간 기준 (건설산업기본법 시행령 별표4):
 * - 구조체 (기둥·내력벽·슬래브):  120개월 (10년)
 * - 방수 공사:                     36개월 (3년)
 * - 결로·단열 공사:                24개월 (2년)
 * - 타일·도장·마루·바닥재 등 마감: 12개월 (1년)
 */

import { createClient } from '@supabase/supabase-js'

// ─── 공종별 하자담보기간 매핑 ─────────────────────────────

const WARRANTY_PERIOD_MAP: Record<string, number> = {
  // 구조체 (10년)
  구조체: 120,
  기초: 120,
  콘크리트: 120,
  '내력벽': 120,
  슬래브: 120,

  // 방수 (3년)
  방수: 36,
  방수공사: 36,
  욕실방수: 36,
  발코니방수: 36,
  옥상방수: 36,

  // 단열·결로 (2년)
  단열: 24,
  결로: 24,
  단열공사: 24,

  // 마감 공종 (1년)
  타일: 12,
  타일공사: 12,
  도장: 12,
  도장공사: 12,
  페인트: 12,
  마루: 12,
  바닥재: 12,
  강마루: 12,
  강화마루: 12,
  LVT: 12,
  목공: 12,
  목공사: 12,
  도배: 12,
  필름: 12,
  창호: 12,
  설비: 12,
  배관: 12,
  전기: 12,
  조명: 12,
  가구: 12,
  철거: 12,
}

/**
 * 공종 이름으로 하자담보기간(개월)을 반환한다.
 * 매핑 없는 경우 12개월(기본) 반환.
 */
export function getWarrantyPeriod(processName: string): number {
  const normalized = processName.trim()
  // 정확히 일치
  if (WARRANTY_PERIOD_MAP[normalized] !== undefined) {
    return WARRANTY_PERIOD_MAP[normalized]
  }
  // 부분 일치 (예: "1층 방수공사" → 방수)
  for (const [key, months] of Object.entries(WARRANTY_PERIOD_MAP)) {
    if (normalized.includes(key)) return months
  }
  return 12 // 기본 1년
}

// ─── 타입 ─────────────────────────────────────────────────

export interface WarrantyRecord {
  id: string
  project_id: string
  process_name: string
  completed_date: string         // YYYY-MM-DD
  warranty_period_months: number
  warranty_expires_date: string  // DB 트리거 자동 계산
  reminder_sent_30d: boolean
  reminder_sent_7d: boolean
  created_at: string
}

export interface CreateWarrantyInput {
  projectId: string
  processName: string
  completedDate: string  // YYYY-MM-DD
  warrantyMonths?: number  // 미지정 시 자동 감지
}

// ─── 하자담보 레코드 생성 ─────────────────────────────────

/**
 * 공종 완료 시 warranty_tracking 레코드를 생성한다.
 * process 완료 API route 또는 공정관리 페이지에서 호출.
 */
export async function createWarrantyRecord(input: CreateWarrantyInput): Promise<WarrantyRecord> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수 미설정')

  const supabase = createClient(url, key)
  const warrantyMonths = input.warrantyMonths ?? getWarrantyPeriod(input.processName)

  const { data, error } = await supabase
    .from('warranty_tracking')
    .insert({
      project_id: input.projectId,
      process_name: input.processName,
      completed_date: input.completedDate,
      warranty_period_months: warrantyMonths,
      // warranty_expires_date: DB 트리거가 자동 계산
    })
    .select()
    .single()

  if (error) throw new Error(`하자담보 레코드 생성 실패: ${error.message}`)
  return data as WarrantyRecord
}

// ─── 프로젝트 하자담보 목록 조회 ──────────────────────────

/**
 * 프로젝트의 모든 하자담보 기록을 조회한다.
 * 만료일 오름차순 정렬 (가장 먼저 만료되는 것부터).
 */
export async function getProjectWarranties(projectId: string): Promise<WarrantyRecord[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('warranty_tracking')
    .select('*')
    .eq('project_id', projectId)
    .order('warranty_expires_date', { ascending: true })

  if (error) {
    console.warn('[WarrantyTracker] 조회 실패:', error.message)
    return []
  }
  return (data ?? []) as WarrantyRecord[]
}

// ─── 만료 임박 하자담보 조회 ──────────────────────────────

/**
 * N일 이내 만료되는 하자담보 레코드를 전체에서 조회한다.
 * 자동 알림 발송용 (cron job 또는 대시보드에서 사용).
 */
export async function getExpiringWarranties(daysAhead: number = 30): Promise<WarrantyRecord[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []

  const supabase = createClient(url, key)
  const today = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('warranty_tracking')
    .select('*')
    .gte('warranty_expires_date', today)
    .lte('warranty_expires_date', future)
    .order('warranty_expires_date', { ascending: true })

  if (error) {
    console.warn('[WarrantyTracker] 만료 임박 조회 실패:', error.message)
    return []
  }
  return (data ?? []) as WarrantyRecord[]
}

// ─── 만료까지 남은 일수 계산 ─────────────────────────────

/**
 * 하자담보 만료까지 남은 일수를 반환한다.
 * 0 이하면 이미 만료.
 */
export function getDaysUntilExpiry(warrantyExpiresDate: string): number {
  const expiry = new Date(warrantyExpiresDate).getTime()
  const today = new Date().setHours(0, 0, 0, 0)
  return Math.ceil((expiry - today) / 86400000)
}

/**
 * 만료 상태 레이블을 반환한다.
 */
export function getExpiryStatus(warrantyExpiresDate: string): {
  label: string
  severity: 'expired' | 'danger' | 'warning' | 'ok'
} {
  const days = getDaysUntilExpiry(warrantyExpiresDate)
  if (days <= 0) return { label: '만료됨', severity: 'expired' }
  if (days <= 7) return { label: `D-${days} (긴급)`, severity: 'danger' }
  if (days <= 30) return { label: `D-${days}`, severity: 'warning' }
  return { label: `D-${days}`, severity: 'ok' }
}
