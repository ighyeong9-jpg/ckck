'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.scss'

interface Project {
  id: string
  name: string
  progress: number
  status: string
  client_name: string
  start_date: string | null
  end_date: string | null
  risk_score: number
}

interface Process {
  id: string
  name: string
  status: string
  progress: number
}

interface ChangeOrder {
  id: string
  title: string
  status: string
  cost_change: number
  requested_at: string
}

interface Photo {
  id: string
  storage_path: string
  created_at: string
  file_name: string
}

export default function ClientDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [processes, setProcesses] = useState<Process[]>([])
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 사용자의 프로젝트 조회 (첫 번째 프로젝트)
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!projects || projects.length === 0) {
        setLoading(false)
        return
      }

      const proj = projects[0] as Project
      setProject(proj)

      // 공정, 변경사항, 사진 병렬 로드
      const [processRes, changeRes, photoRes] = await Promise.all([
        supabase
          .from('processes')
          .select('id, name, status, progress')
          .eq('project_id', proj.id)
          .order('order_index'),
        supabase
          .from('change_orders')
          .select('id, title, status, cost_change, requested_at')
          .eq('project_id', proj.id)
          .eq('status', 'requested')
          .order('requested_at', { ascending: false }),
        supabase
          .from('evidence_files')
          .select('id, storage_path, created_at, file_name')
          .eq('project_id', proj.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      if (processRes.data) setProcesses(processRes.data)
      if (changeRes.data) setChangeOrders(changeRes.data)
      if (photoRes.data) setPhotos(photoRes.data)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from('evidence').getPublicUrl(path)
    return data?.publicUrl || ''
  }

  const getDaysRemaining = () => {
    if (!project?.end_date) return null
    const end = new Date(project.end_date)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>로딩 중...</span>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🏗️</div>
          <h2>진행 중인 프로젝트가 없습니다</h2>
          <p>시공사가 프로젝트를 생성하면 여기에 표시됩니다</p>
        </div>
      </div>
    )
  }

  const daysLeft = getDaysRemaining()

  return (
    <div className={styles.container}>
      <section className={styles.welcome}>
        <h1 className={styles.welcomeTitle}>안녕하세요, {project.client_name || '고객'}님 👋</h1>
        <p className={styles.welcomeSubtitle}>{project.name}</p>
      </section>

      <section className={styles.progressCard}>
        <div className={styles.progressInfo}>
          <span className={styles.progressLabel}>공사 진행률</span>
          <span className={styles.progressValue}>{project.progress}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <p className={styles.progressText}>
          공사가 {project.progress}% 진행됐어요
        </p>
        {daysLeft !== null && (
          <div className={styles.daysRemaining}>
            {daysLeft > 0 ? (
              <span>예상 완료 D-{daysLeft}일</span>
            ) : (
              <span>완료 기한 {Math.abs(daysLeft)}일 경과</span>
            )}
          </div>
        )}
      </section>

      {changeOrders.length > 0 && (
        <section className={styles.alertBanner}>
          <span className={styles.alertIcon}>⚠️</span>
          <div className={styles.alertContent}>
            <strong>확인이 필요해요 {changeOrders.length}건</strong>
            <span> → 변경사항 서명하기</span>
          </div>
          <button
            className={styles.alertBtn}
            onClick={() => router.push(`/client/project/${project.id}/changes`)}
          >
            확인하기
          </button>
        </section>
      )}

      <section className={styles.processSection}>
        <h2 className={styles.sectionTitle}>공정 현황</h2>
        <div className={styles.processList}>
          {processes.length === 0 ? (
            <p className={styles.emptyText}>등록된 공정이 없습니다</p>
          ) : (
            processes.map((proc) => (
              <div key={proc.id} className={styles.processItem}>
                <span className={styles.processIcon}>
                  {proc.status === 'completed'
                    ? '✅'
                    : proc.status === 'in_progress'
                    ? '🔵'
                    : '⬜'}
                </span>
                <span className={styles.processName}>{proc.name}</span>
                <span className={styles.processStatus}>
                  {proc.status === 'completed'
                    ? '완료'
                    : proc.status === 'in_progress'
                    ? '진행중'
                    : '대기'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.photoSection}>
        <h2 className={styles.sectionTitle}>오늘 현장 사진 ({photos.length}장)</h2>
        <div className={styles.photoGrid}>
          {photos.length === 0 ? (
            <p className={styles.emptyText}>업로드된 사진이 없습니다</p>
          ) : (
            photos.map((photo) => (
              <div key={photo.id} className={styles.photoCard}>
                <img
                  src={getPhotoUrl(photo.storage_path)}
                  alt={photo.file_name}
                  className={styles.photoImg}
                />
                <span className={styles.photoDate}>
                  {new Date(photo.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>자주 사용하는 기능</h2>
        <div className={styles.actionsGrid}>
          <button
            className={styles.actionCard}
            onClick={() => router.push(`/client/project/${project.id}/photos`)}
          >
            <span className={styles.actionIcon}>📷</span>
            <span className={styles.actionLabel}>현장 사진</span>
          </button>
          <button
            className={styles.actionCard}
            onClick={() => router.push(`/client/project/${project.id}/changes`)}
          >
            <span className={styles.actionIcon}>📝</span>
            <span className={styles.actionLabel}>변경사항</span>
          </button>
          <button
            className={styles.actionCard}
            onClick={() => router.push(`/client/project/${project.id}/defects`)}
          >
            <span className={styles.actionIcon}>🔧</span>
            <span className={styles.actionLabel}>하자 접수</span>
          </button>
          <button
            className={styles.actionCard}
            onClick={() => router.push(`/client/project/${project.id}/quote`)}
          >
            <span className={styles.actionIcon}>💰</span>
            <span className={styles.actionLabel}>견적서</span>
          </button>
        </div>
      </section>
    </div>
  )
}
