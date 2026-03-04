import { ProjectRole } from './projectMember'

export type IssueType = 'DESIGN_CHANGE' | 'DIMENSION_MISMATCH' | 'MATERIAL_ISSUE' | 'SAFETY' | 'OTHER'
export type IssueStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED'
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Issue {
  id: string
  project_id: string
  title: string
  description: string | null
  issue_type: IssueType
  status: IssueStatus
  priority: IssuePriority
  notify_roles: ProjectRole[]
  created_by: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface CreateIssueInput {
  project_id: string
  title: string
  description?: string
  issue_type: IssueType
  priority: IssuePriority
  notify_roles?: ProjectRole[]
  assigned_to?: string
}

export interface UpdateIssueInput {
  title?: string
  description?: string
  issue_type?: IssueType
  status?: IssueStatus
  priority?: IssuePriority
  assigned_to?: string
}

export interface IssueComment {
  id: string
  issue_id: string
  user_id: string | null
  content: string
  attachments: Array<{
    name: string
    url: string
    type: string
  }>
  created_at: string
  updated_at: string
}

export interface CreateCommentInput {
  issue_id: string
  content: string
  attachments?: Array<{
    name: string
    url: string
    type: string
  }>
}

// 이슈 타입별 정보
export const ISSUE_TYPES = {
  DESIGN_CHANGE: {
    label: '설계 변경',
    icon: '📐',
    color: '#3b82f6',
  },
  DIMENSION_MISMATCH: {
    label: '치수 불일치',
    icon: '📏',
    color: '#f59e0b',
  },
  MATERIAL_ISSUE: {
    label: '자재 문제',
    icon: '🧱',
    color: '#8b5cf6',
  },
  SAFETY: {
    label: '안전',
    icon: '⚠️',
    color: '#ef4444',
  },
  OTHER: {
    label: '기타',
    icon: '📝',
    color: '#6b7280',
  },
} as const

// 우선순위별 정보
export const PRIORITY_LEVELS = {
  LOW: {
    label: '낮음',
    color: '#10b981',
    icon: '⬇️',
  },
  MEDIUM: {
    label: '보통',
    color: '#3b82f6',
    icon: '➡️',
  },
  HIGH: {
    label: '높음',
    color: '#f59e0b',
    icon: '⬆️',
  },
  URGENT: {
    label: '긴급',
    color: '#ef4444',
    icon: '🚨',
  },
} as const

// 상태별 정보
export const ISSUE_STATUS = {
  OPEN: {
    label: '열림',
    color: '#3b82f6',
  },
  IN_REVIEW: {
    label: '검토중',
    color: '#f59e0b',
  },
  RESOLVED: {
    label: '해결됨',
    color: '#10b981',
  },
} as const
