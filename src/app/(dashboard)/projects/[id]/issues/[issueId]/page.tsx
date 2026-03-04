'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProjectRole } from '@/hooks/useProjectRole'
import type { Issue, IssueStatus } from '@/types/issue'
import { ISSUE_TYPES, PRIORITY_LEVELS, ISSUE_STATUS } from '@/types/issue'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

interface IssueComment {
  id: string
  issue_id: string
  user_id: string
  content: string
  attachments: string[]
  created_at: string
  user_email?: string
}

export default function IssueDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const projectId = params.id as string
  const issueId = params.issueId as string
  const supabase = createClient()

  const { role, canEdit } = useProjectRole(projectId)

  const [issue, setIssue] = useState<Issue | null>(null)
  const [comments, setComments] = useState<IssueComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [commenting, setCommenting] = useState(false)

  useEffect(() => {
    loadIssue()
    loadComments()

    // Realtime subscription for comments
    const channel = supabase
      .channel(`issue-${issueId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'issue_comments',
          filter: `issue_id=eq.${issueId}`,
        },
        (payload) => {
          loadComments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [issueId])

  const loadIssue = async () => {
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single()

      if (error) throw error
      setIssue(data)
    } catch (err: any) {
      console.error('Error loading issue:', err)
      toast.error(`이슈 로딩 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('issue_comments')
        .select('*')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setComments(data || [])
    } catch (err: any) {
      console.error('Error loading comments:', err)
    }
  }

  const handleStatusChange = async (newStatus: IssueStatus) => {
    if (!canEdit) {
      toast.error('권한이 없습니다')
      return
    }

    try {
      const { error } = await supabase
        .from('issues')
        .update({ status: newStatus })
        .eq('id', issueId)

      if (error) throw error

      toast.success('상태가 변경되었습니다')
      loadIssue()
    } catch (err: any) {
      toast.error(`상태 변경 실패: ${err.message}`)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('댓글 내용을 입력하세요')
      return
    }

    setCommenting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      const { error } = await supabase
        .from('issue_comments')
        .insert([{
          issue_id: issueId,
          user_id: user.id,
          user_email: user.email || '알 수 없음',
          content: newComment,
          attachments: [],
        }])

      if (error) throw error

      setNewComment('')
      toast.success('댓글이 등록되었습니다')
    } catch (err: any) {
      toast.error(`댓글 등록 실패: ${err.message}`)
    } finally {
      setCommenting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>이슈를 찾을 수 없습니다</div>
      </div>
    )
  }

  const typeInfo = ISSUE_TYPES[issue.issue_type]
  const priorityInfo = PRIORITY_LEVELS[issue.priority]
  const statusInfo = ISSUE_STATUS[issue.status]

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => router.back()}>
        ← 목록으로
      </button>

      <div className={styles.issueHeader}>
        <div className={styles.issueMetaRow}>
          <div className={styles.issueType}>
            <span>{typeInfo.icon}</span>
            <span>{typeInfo.label}</span>
          </div>
          <span
            className={styles.priority}
            style={{ color: priorityInfo.color }}
          >
            {priorityInfo.icon} {priorityInfo.label}
          </span>
        </div>

        <h1 className={styles.title}>{issue.title}</h1>

        <div className={styles.statusRow}>
          <span>상태:</span>
          {canEdit ? (
            <select
              value={issue.status}
              onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
              className={styles.statusSelect}
              style={{ background: statusInfo.color }}
            >
              {Object.entries(ISSUE_STATUS).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={styles.statusBadge}
              style={{ background: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          )}
        </div>

        <div className={styles.issueDate}>
          등록일: {new Date(issue.created_at).toLocaleString('ko-KR')}
        </div>
      </div>

      {issue.description && (
        <div className={styles.descriptionSection}>
          <h2>상세 설명</h2>
          <p>{issue.description}</p>
        </div>
      )}

      <div className={styles.commentsSection}>
        <h2>댓글 ({comments.length})</h2>

        <div className={styles.commentsList}>
          {comments.length === 0 ? (
            <div className={styles.emptyComments}>
              아직 댓글이 없습니다
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className={styles.commentCard}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentAuthor}>{comment.user_email}</span>
                  <span className={styles.commentDate}>
                    {new Date(comment.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                <p className={styles.commentContent}>{comment.content}</p>
              </div>
            ))
          )}
        </div>

        <div className={styles.commentForm}>
          <textarea
            placeholder="댓글을 입력하세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className={styles.commentInput}
            rows={3}
          />
          <button
            onClick={handleAddComment}
            disabled={commenting}
            className={styles.commentBtn}
          >
            {commenting ? '등록 중...' : '댓글 등록'}
          </button>
        </div>
      </div>
    </div>
  )
}
