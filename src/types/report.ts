export type ReportType = 'summary' | 'diagnostic' | 'quote' | 'cost' | 'full'

export interface Report {
  id: string
  project_id: string
  report_type: ReportType
  title: string
  // 진단 데이터
  diagnostic_score: number | null
  diagnostic_data: any | null
  // 견적 데이터
  quote_subtotal: number | null
  quote_vat: number | null
  quote_total: number | null
  quote_item_count: number | null
  // 비용분석 데이터
  cost_base: number | null
  cost_adjusted: number | null
  cost_difference: number | null
  // 메타
  generated_by: string | null
  notes: string | null
  created_at: string
}

export const REPORT_TYPES = [
  { id: 'summary', name: '요약 리포트', icon: '📊' },
  { id: 'diagnostic', name: '진단 리포트', icon: '🔍' },
  { id: 'quote', name: '견적 리포트', icon: '💰' },
  { id: 'cost', name: '비용분석 리포트', icon: '📈' },
  { id: 'full', name: '종합 리포트', icon: '📑' },
] as const
