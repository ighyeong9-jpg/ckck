export type ChangeRequestType = 'COST' | 'SCHEDULE' | 'DESIGN' | 'OTHER'
export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ChangeRequest {
  id: string
  project_id: string
  type: ChangeRequestType
  title: string
  description: string | null
  amount: number
  status: ChangeRequestStatus
  requested_by: string | null
  approved_by: string | null
  rejection_reason: string | null
  created_at: string
  resolved_at: string | null
}

export interface CreateChangeRequestInput {
  project_id: string
  type: ChangeRequestType
  title: string
  description?: string
  amount?: number
}

export interface ResolveChangeRequestInput {
  status: 'APPROVED' | 'REJECTED'
  rejection_reason?: string
}

// 변경 요청 타입별 정보
export const CHANGE_REQUEST_TYPES = {
  COST: {
    label: '비용 변경',
    icon: '💰',
    color: '#10b981',
  },
  SCHEDULE: {
    label: '일정 변경',
    icon: '📅',
    color: '#3b82f6',
  },
  DESIGN: {
    label: '설계 변경',
    icon: '📐',
    color: '#8b5cf6',
  },
  OTHER: {
    label: '기타',
    icon: '📝',
    color: '#6b7280',
  },
} as const

// 상태별 정보
export const CHANGE_REQUEST_STATUS = {
  PENDING: {
    label: '승인 대기',
    color: '#f59e0b',
    icon: '⏳',
  },
  APPROVED: {
    label: '승인됨',
    color: '#10b981',
    icon: '✅',
  },
  REJECTED: {
    label: '거절됨',
    color: '#ef4444',
    icon: '❌',
  },
} as const
