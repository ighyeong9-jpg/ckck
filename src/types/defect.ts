export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical'
export type DefectStatus = 'reported' | 'in_progress' | 'resolved' | 'closed'

export interface Defect {
  id: string
  project_id: string
  title: string
  description: string | null
  severity: DefectSeverity
  status: DefectStatus
  location: string | null
  photos?: string[]
  reported_by: string | null
  assigned_to: string | null
  sha256_hash?: string | null
  resolved_at: string | null
  reported_at: string
  updated_at?: string
}

export const DEFECT_SEVERITIES = [
  { id: 'low' as const, name: '경미', color: '#6b7280', icon: '⚪' },
  { id: 'medium' as const, name: '보통', color: '#f59e0b', icon: '🟡' },
  { id: 'high' as const, name: '심각', color: '#f97316', icon: '🟠' },
  { id: 'critical' as const, name: '긴급', color: '#ef4444', icon: '🔴' },
]

export const DEFECT_STATUSES = [
  { id: 'reported' as const, name: '요청됨', color: '#6b7280' },
  { id: 'in_progress' as const, name: '처리 중', color: '#3b82f6' },
  { id: 'resolved' as const, name: '해결됨', color: '#f59e0b' },
  { id: 'closed' as const, name: '완료', color: '#10b981' },
]
