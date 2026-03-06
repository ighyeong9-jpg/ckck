'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProjectRole } from '@/hooks/useProjectRole'
import { ProjectMember, ProjectRole, ROLE_PERMISSIONS, CreateMemberInput } from '@/types/projectMember'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

export default function MembersPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const projectId = params.id as string
  const supabase = createClient()

  const { role, loading: roleLoading, canInvite, canChangeRole, canRemove } = useProjectRole(projectId)

  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<ProjectRole>('TECHNICIAN')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [projectId])

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .order('invited_at', { ascending: false })

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      setMembers(data || [])
    } catch (err: any) {
      console.error('Error loading members:', err)
      toast.error(`멤버 목록 로딩 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('이메일을 입력하세요')
      return
    }

    setInviting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      const { error } = await supabase
        .from('project_members')
        .insert([{
          project_id: projectId,
          invited_email: inviteEmail,
          role: inviteRole,
          status: 'PENDING',
          invited_by: user.id,
        }])

      if (error) throw error

      toast.success(`${inviteEmail}에게 초대를 보냈습니다`)
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('TECHNICIAN')
      loadMembers()
    } catch (err: any) {
      toast.error(`초대 실패: ${err.message}`)
    } finally {
      setInviting(false)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: ProjectRole) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      toast.success('역할이 변경되었습니다')
      loadMembers()
    } catch (err: any) {
      toast.error(`역할 변경 실패: ${err.message}`)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!confirm('정말 이 멤버를 제거하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success('멤버가 제거되었습니다')
      loadMembers()
    } catch (err: any) {
      toast.error(`멤버 제거 실패: ${err.message}`)
    }
  }

  if (roleLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          이 프로젝트에 접근 권한이 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>👥 프로젝트 멤버 관리</h1>
          <p className={styles.subtitle}>프로젝트에 참여하는 팀원들을 관리합니다</p>
        </div>
        {canInvite && (
          <button
            className={styles.inviteBtn}
            onClick={() => setShowInviteModal(true)}
          >
            + 멤버 초대
          </button>
        )}
      </div>

      <div className={styles.membersList}>
        {members.map(member => {
          const roleInfo = ROLE_PERMISSIONS[member.role]
          const isOwner = member.role === 'OWNER'

          return (
            <div key={member.id} className={styles.memberCard}>
              <div className={styles.memberInfo}>
                <div className={styles.memberHeader}>
                  <div>
                    {member.invited_email && (
                      <div className={styles.memberEmail}>{member.invited_email}</div>
                    )}
                    <div className={styles.memberRole}>
                      {canChangeRole && !isOwner ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value as ProjectRole)}
                          className={styles.roleSelect}
                        >
                          {Object.entries(ROLE_PERMISSIONS).map(([value, info]) => (
                            <option key={value} value={value}>
                              {info.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={styles.roleBadge}>{roleInfo.label}</span>
                      )}
                    </div>
                  </div>
                  {member.status === 'PENDING' && (
                    <span className={styles.pendingBadge}>초대 대기중</span>
                  )}
                </div>

                <div className={styles.memberMeta}>
                  <span>초대일: {new Date(member.invited_at).toLocaleDateString('ko-KR')}</span>
                  {member.joined_at && (
                    <span>참여일: {new Date(member.joined_at).toLocaleDateString('ko-KR')}</span>
                  )}
                </div>
              </div>

              {canRemove && !isOwner && (
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemove(member.id)}
                >
                  제거
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* 초대 모달 */}
      {showInviteModal && (
        <div className={styles.overlay} onClick={() => setShowInviteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>멤버 초대</h2>
              <button onClick={() => setShowInviteModal(false)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>이메일</label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>역할</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
                  className={styles.select}
                >
                  {Object.entries(ROLE_PERMISSIONS)
                    .filter(([key]) => key !== 'OWNER') // OWNER는 초대 불가
                    .map(([value, info]) => (
                      <option key={value} value={value}>
                        {info.label}
                      </option>
                    ))}
                </select>
              </div>

              <div className={styles.roleDescription}>
                <h4>역할 설명</h4>
                <ul>
                  <li><strong>관리자:</strong> 전체 읽기/쓰기, 멤버 초대</li>
                  <li><strong>디자이너:</strong> 설계·자재·갤러리 관리</li>
                  <li><strong>시공기술자:</strong> 현장기록·이슈·갤러리 관리</li>
                  <li><strong>건물주:</strong> 읽기 전용 (승인 권한)</li>
                </ul>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowInviteModal(false)}
              >
                취소
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleInvite}
                disabled={inviting}
              >
                {inviting ? '초대 중...' : '초대하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
