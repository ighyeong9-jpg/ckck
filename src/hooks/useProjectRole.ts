import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProjectRole, ProjectMember, ROLE_PERMISSIONS } from '@/types/projectMember'

interface UseProjectRoleReturn {
  role: ProjectRole | null
  member: ProjectMember | null
  loading: boolean
  error: Error | null
  permissions: typeof ROLE_PERMISSIONS[ProjectRole] | null
  canInvite: boolean
  canRemove: boolean
  canChangeRole: boolean
  canEdit: boolean
  canView: boolean
  isOwner: boolean
  isManager: boolean
  isClient: boolean
  refresh: () => Promise<void>
}

export function useProjectRole(projectId: string): UseProjectRoleReturn {
  const supabase = createClient()
  const [role, setRole] = useState<ProjectRole | null>(null)
  const [member, setMember] = useState<ProjectMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadRole = async () => {
    try {
      setLoading(true)
      setError(null)

      // 현재 사용자 가져오기
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setRole(null)
        setMember(null)
        return
      }

      // 프로젝트 멤버 정보 가져오기
      const { data, error: fetchError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .single()

      if (fetchError) {
        // 멤버가 아닌 경우
        if (fetchError.code === 'PGRST116') {
          setRole(null)
          setMember(null)
        } else {
          throw fetchError
        }
      } else {
        setRole(data.role as ProjectRole)
        setMember(data)
      }
    } catch (err) {
      console.error('Error loading project role:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadRole()
    }
  }, [projectId])

  const permissions = role ? ROLE_PERMISSIONS[role] : null

  return {
    role,
    member,
    loading,
    error,
    permissions,
    canInvite: permissions?.canInvite ?? false,
    canRemove: permissions?.canRemove ?? false,
    canChangeRole: permissions?.canChangeRole ?? false,
    canEdit: permissions?.canEdit ?? false,
    canView: permissions?.canView ?? false,
    isOwner: role === 'OWNER',
    isManager: role === 'MANAGER',
    isClient: role === 'CLIENT',
    refresh: loadRole,
  }
}
