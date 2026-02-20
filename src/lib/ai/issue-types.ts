/**
 * issue-types.ts — 클라이언트에서 사용 가능한 이슈 타입·상수만 분리
 *
 * issue-classifier.ts는 서버 전용(callGemini 포함)
 * 클라이언트 컴포넌트는 이 파일을 import할 것
 */

// ═══════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'

export type IssueCategory =
  | 'safety'
  | 'quality'
  | 'cost'
  | 'schedule'
  | 'legal'
  | 'material'
  | 'labor'
  | 'weather'
  | 'design_change'
  | 'other'

export type IssueStatus =
  | 'open'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'resolved'

export interface IssueClassifyResult {
  category: IssueCategory
  severity: IssueSeverity
  title: string
  summary: string
  recommended_actions: string[]
  legal_basis?: string
  cost_impact?: string
  schedule_impact?: string
  requires_approval: boolean
  urgency_hours: number
}

// ═══════════════════════════════════════════════════════════
// 상수 (클라이언트 UI에서 사용)
// ═══════════════════════════════════════════════════════════

export const SEVERITY_CONFIG: Record<IssueSeverity, {
  label: string
  color: string
  bg: string
  border: string
  emoji: string
}> = {
  critical: { label: '즉시 조치', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', emoji: '🔴' },
  high:     { label: '긴급',     color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', emoji: '🟠' },
  medium:   { label: '주의',     color: '#ca8a04', bg: '#fefce8', border: '#fde68a', emoji: '🟡' },
  low:      { label: '일반',     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', emoji: '🟢' },
}

export const CATEGORY_CONFIG: Record<IssueCategory, { label: string; emoji: string }> = {
  safety:        { label: '안전',     emoji: '⛑️' },
  quality:       { label: '품질',     emoji: '🔍' },
  cost:          { label: '비용',     emoji: '💰' },
  schedule:      { label: '공정',     emoji: '📅' },
  legal:         { label: '법규',     emoji: '⚖️' },
  material:      { label: '자재',     emoji: '📦' },
  labor:         { label: '인력',     emoji: '👷' },
  weather:       { label: '기상',     emoji: '🌦️' },
  design_change: { label: '설계변경', emoji: '📐' },
  other:         { label: '기타',     emoji: '📋' },
}
