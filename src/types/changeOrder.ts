export type ChangeOrderStatus = 'requested' | 'approved' | 'rejected'
export type ChangeOrderType = 'scope' | 'schedule' | 'cost' | 'design' | 'material' | 'other'

export interface ChangeOrder {
  id: string
  project_id: string
  title: string
  reason: string | null
  change_type: ChangeOrderType
  cost_change: number
  status: ChangeOrderStatus
  requested_by: string | null
  requested_at: string
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const CHANGE_TYPES = [
  { id: 'scope', name: '범위 변경', icon: '📋' },
  { id: 'schedule', name: '일정 변경', icon: '📅' },
  { id: 'cost', name: '비용 변경', icon: '💰' },
  { id: 'design', name: '설계 변경', icon: '✏️' },
  { id: 'material', name: '자재 변경', icon: '🧱' },
  { id: 'other', name: '기타', icon: '📌' },
] as const

export const CHANGE_STATUSES = [
  { id: 'requested', name: '요청', color: '#f59e0b' },
  { id: 'approved', name: '승인', color: '#10b981' },
  { id: 'rejected', name: '거절', color: '#ef4444' },
] as const
