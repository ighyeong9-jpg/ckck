export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical'
export type DefectStatus = 'reported' | 'reviewing' | 'repairing' | 'completed'

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
  { id: 'reviewing' as const, name: '확인 중', color: '#3b82f6' },
  { id: 'repairing' as const, name: '수리 중', color: '#f59e0b' },
  { id: 'completed' as const, name: '완료', color: '#10b981' },
]
