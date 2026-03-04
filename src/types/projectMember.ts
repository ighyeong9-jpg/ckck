export type ProjectRole = 'OWNER' | 'MANAGER' | 'DESIGNER' | 'TECHNICIAN' | 'CLIENT'

export type MemberStatus = 'PENDING' | 'ACTIVE'

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string | null
  role: ProjectRole
  invited_email: string | null
  status: MemberStatus
  invited_at: string
  joined_at: string | null
  invited_by: string | null
}

export interface CreateMemberInput {
  project_id: string
  email: string
  role: ProjectRole
}

export interface UpdateMemberInput {
  role?: ProjectRole
  status?: MemberStatus
}

// 역할별 권한 정의
export const ROLE_PERMISSIONS = {
  OWNER: {
    label: '소유자',
    canInvite: true,
    canRemove: true,
    canChangeRole: true,
    canEdit: true,
    canView: true,
  },
  MANAGER: {
    label: '관리자',
    canInvite: true,
    canRemove: false,
    canChangeRole: false,
    canEdit: true,
    canView: true,
  },
  DESIGNER: {
    label: '디자이너',
    canInvite: false,
    canRemove: false,
    canChangeRole: false,
    canEdit: true,
    canView: true,
    limitedTo: ['설계', '자재', '갤러리'], // 접근 가능한 섹션
  },
  TECHNICIAN: {
    label: '시공기술자',
    canInvite: false,
    canRemove: false,
    canChangeRole: false,
    canEdit: true,
    canView: true,
    limitedTo: ['현장기록', '이슈', '갤러리', '체크리스트'],
  },
  CLIENT: {
    label: '건물주',
    canInvite: false,
    canRemove: false,
    canChangeRole: false,
    canEdit: false,
    canView: true,
    viewOnly: true,
  },
} as const
