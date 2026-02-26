'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import ProjectTabs, { type TabStatus } from '@/components/project/ProjectTabs'
import styles from './layout.module.scss'

interface ProjectDetailHeaderProps {
  projectId: string
  projectName: string
  tabStatuses: Record<string, TabStatus>
}

export default function ProjectDetailHeader({
  projectId,
  projectName,
  tabStatuses,
}: ProjectDetailHeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) throw error
      toast.success(`"${projectName}" 현장이 삭제되었어요.`)
      router.push('/projects')
    } catch (err: any) {
      toast.error('삭제 중 오류가 발생했어요.')
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <>
      <div className={styles.headerArea}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <button className={styles.backBtn} onClick={() => router.push('/projects')}>
              ← 현장 목록
            </button>
            <h1 className={styles.title}>{projectName}</h1>
            <button
              className={styles.deleteBtn}
              onClick={() => setShowDeleteModal(true)}
              aria-label="현장 삭제"
            >
              🗑️ 삭제
            </button>
          </div>
        </header>
        <ProjectTabs
          projectId={projectId}
          tabStatuses={tabStatuses}
        />
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className={styles.deleteOverlay} onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className={styles.deleteBox} onClick={e => e.stopPropagation()}>
            <div className={styles.deleteBoxIcon}>🗑️</div>
            <h3 className={styles.deleteBoxTitle}>현장을 삭제하시겠습니까?</h3>
            <p className={styles.deleteBoxDesc}>
              <strong>&quot;{projectName}&quot;</strong> 현장의 모든 데이터<br />
              (진단, 견적, 사진, 리포트 등)가<br />
              영구적으로 삭제됩니다.
            </p>
            <div className={styles.deleteBoxActions}>
              <button
                className={styles.deleteCancelBtn}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                취소
              </button>
              <button
                className={styles.deleteConfirmBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
