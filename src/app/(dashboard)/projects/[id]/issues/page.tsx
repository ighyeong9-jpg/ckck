'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProjectRole } from '@/hooks/useProjectRole'
import type { Issue, IssueType, IssuePriority, IssueStatus } from '@/types/issue'
import { ISSUE_TYPES, PRIORITY_LEVELS, ISSUE_STATUS } from '@/types/issue'
import { ROLE_PERMISSIONS, ProjectRole } from '@/types/projectMember'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

export default function IssuesPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const projectId = params.id as string
  const supabase = createClient()

  const { role, canEdit } = useProjectRole(projectId)

  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // 새 이슈 폼
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [issueType, setIssueType] = useState<IssueType>('OTHER')
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM')
  const [notifyRoles, setNotifyRoles] = useState<ProjectRole[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadIssues()
  }, [projectId])

  const loadIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setIssues(data || [])
    } catch (err: any) {
      console.error('Error loading issues:', err)
      toast.error(`이슈 로딩 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력하세요')
      return
    }

    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      const { data, error } = await supabase
        .from('issues')
        .insert([{
          project_id: projectId,
          title,
          description,
          issue_type: issueType,
          priority,
          notify_roles: notifyRoles,
          created_by: user.id,
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('이슈가 등록되었습니다')
      setShowCreateModal(false)
      setTitle('')
      setDescription('')
      setIssueType('OTHER')
      setPriority('MEDIUM')
      setNotifyRoles([])
      loadIssues()
    } catch (err: any) {
      toast.error(`이슈 등록 실패: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  const toggleNotifyRole = (r: ProjectRole) => {
    if (notifyRoles.includes(r)) {
      setNotifyRoles(notifyRoles.filter(nr => nr !== r))
    } else {
      setNotifyRoles([...notifyRoles, r])
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>⚠️ 이슈 관리</h1>
          <p className={styles.subtitle}>현장 이슈를 등록하고 팀원들과 소통하세요</p>
        </div>
        {canEdit && (
          <button
            className={styles.createBtn}
            onClick={() => setShowCreateModal(true)}
          >
            + 이슈 등록
          </button>
        )}
      </div>

      {/* 이슈 목록 */}
      {issues.length === 0 ? (
        <div className={styles.empty}>
          등록된 이슈가 없습니다
        </div>
      ) : (
        <div className={styles.issuesList}>
          {issues.map(issue => {
            const typeInfo = ISSUE_TYPES[issue.issue_type]
            const priorityInfo = PRIORITY_LEVELS[issue.priority]
            const statusInfo = ISSUE_STATUS[issue.status]

            return (
              <div
                key={issue.id}
                className={styles.issueCard}
                onClick={() => router.push(`/projects/${projectId}/issues/${issue.id}`)}
              >
                <div className={styles.issueHeader}>
                  <div className={styles.issueType}>
                    <span>{typeInfo.icon}</span>
                    <span>{typeInfo.label}</span>
                  </div>
                  <div className={styles.issueMeta}>
                    <span
                      className={styles.priority}
                      style={{ color: priorityInfo.color }}
                    >
                      {priorityInfo.icon} {priorityInfo.label}
                    </span>
                    <span
                      className={styles.status}
                      style={{ background: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
                <h3 className={styles.issueTitle}>{issue.title}</h3>
                {issue.description && (
                  <p className={styles.issueDesc}>{issue.description}</p>
                )}
                <div className={styles.issueFooter}>
                  <span className={styles.issueDate}>
                    {new Date(issue.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 이슈 등록 모달 */}
      {showCreateModal && (
        <div className={styles.overlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>이슈 등록</h2>
              <button onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>제목 *</label>
                <input
                  type="text"
                  placeholder="이슈 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>설명</label>
                <textarea
                  placeholder="상세 내용을 입력하세요"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.textarea}
                  rows={4}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>유형</label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value as IssueType)}
                    className={styles.select}
                  >
                    {Object.entries(ISSUE_TYPES).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.icon} {info.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>우선순위</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as IssuePriority)}
                    className={styles.select}
                  >
                    {Object.entries(PRIORITY_LEVELS).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.icon} {info.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>알림 받을 역할</label>
                <div className={styles.rolesGrid}>
                  {Object.entries(ROLE_PERMISSIONS).map(([key, info]) => (
                    <label key={key} className={styles.roleCheckbox}>
                      <input
                        type="checkbox"
                        checked={notifyRoles.includes(key as ProjectRole)}
                        onChange={() => toggleNotifyRole(key as ProjectRole)}
                      />
                      <span>{info.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowCreateModal(false)}
              >
                취소
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
