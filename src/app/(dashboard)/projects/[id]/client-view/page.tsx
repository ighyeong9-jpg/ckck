'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProjectRole } from '@/hooks/useProjectRole'
import { CHANGE_REQUEST_TYPES } from '@/types/changeRequest'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

interface Project {
  id: string
  name: string
  client_name: string
  progress: number
  budget?: number
  start_date: string
  end_date: string
}

interface Photo {
  id: string
  url: string
  file_name: string
  created_at: string
}

interface Process {
  id: string
  name: string
  status: string
  progress: number
  start_date: string
  end_date: string
}

interface ChangeRequest {
  id: string
  type: string
  title: string
  description: string
  amount: number
  created_at: string
  requested_by: string
}

export default function ClientViewPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const projectId = params.id as string
  const supabase = createClient()

  const { role, loading: roleLoading } = useProjectRole(projectId)

  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roleLoading && role && role !== 'CLIENT') {
      // CLIENT가 아니면 일반 뷰로 리다이렉트
      router.push(`/projects/${projectId}/overview`)
    }
  }, [role, roleLoading, projectId, router])

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    try {
      // 프로젝트 정보
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectData) setProject(projectData)

      // 오늘 현장 사진 최근 5장
      const { data: photosData } = await supabase
        .from('evidence_files')
        .select('id, file_name, storage_path, created_at')
        .eq('project_id', projectId)
        .eq('shared_to_client', true)
        .order('created_at', { ascending: false })
        .limit(5)

      if (photosData) {
        const photosWithUrls = photosData.map(p => {
          const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(p.storage_path)
          return {
            id: p.id,
            url: urlData.publicUrl,
            file_name: p.file_name,
            created_at: p.created_at,
          }
        })
        setPhotos(photosWithUrls)
      }

      // 공정 정보
      const { data: processesData } = await supabase
        .from('processes')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true })

      if (processesData) setProcesses(processesData)

      // 승인 대기 목록
      const { data: requestsData } = await supabase
        .from('change_requests')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })

      if (requestsData) setChangeRequests(requestsData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      const { error } = await supabase
        .from('change_requests')
        .update({
          status: 'APPROVED',
          approved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (error) throw error

      toast.success('승인되었습니다')
      loadData()
    } catch (err: any) {
      toast.error(`승인 실패: ${err.message}`)
    }
  }

  const handleReject = async (requestId: string) => {
    const reason = prompt('거절 사유를 입력해주세요:')
    if (!reason) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      const { error } = await supabase
        .from('change_requests')
        .update({
          status: 'REJECTED',
          approved_by: user.id,
          rejection_reason: reason,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (error) throw error

      toast.success('거절되었습니다')
      loadData()
    } catch (err: any) {
      toast.error(`거절 실패: ${err.message}`)
    }
  }

  if (roleLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>프로젝트를 찾을 수 없습니다</div>
      </div>
    )
  }

  // 집행 금액 계산 (임시: 진행률 기반)
  const totalBudget = project.budget || 0
  const spentBudget = Math.floor(totalBudget * (project.progress / 100))
  const remainingBudget = totalBudget - spentBudget

  // 다음 예정 공정
  const nextProcess = processes.find(p => p.status === 'pending')

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{project.name}</h1>
        <p className={styles.subtitle}>{project.client_name}님의 공사 현황</p>
      </div>

      {/* 공정 진행률 */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>📊 공사 진행 상황</h2>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${project.progress}%` }}>
            <span className={styles.progressText}>{project.progress}%</span>
          </div>
        </div>
        <p className={styles.progressLabel}>
          시작일: {new Date(project.start_date).toLocaleDateString('ko-KR')} →
          완료 예정: {new Date(project.end_date).toLocaleDateString('ko-KR')}
        </p>
      </div>

      {/* 예산 현황 */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>💰 예산 현황</h2>
        <div className={styles.budgetGrid}>
          <div className={styles.budgetItem}>
            <span className={styles.budgetLabel}>계약 금액</span>
            <span className={styles.budgetValue}>{totalBudget.toLocaleString()}원</span>
          </div>
          <div className={styles.budgetItem}>
            <span className={styles.budgetLabel}>집행 금액</span>
            <span className={styles.budgetValue} style={{ color: '#f59e0b' }}>
              {spentBudget.toLocaleString()}원
            </span>
          </div>
          <div className={styles.budgetItem}>
            <span className={styles.budgetLabel}>잔여 금액</span>
            <span className={styles.budgetValue} style={{ color: '#10b981' }}>
              {remainingBudget.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>

      {/* 다음 예정 공정 */}
      {nextProcess && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📅 다음 예정 작업</h2>
          <div className={styles.nextProcess}>
            <h3>{nextProcess.name}</h3>
            <p>시작 예정: {new Date(nextProcess.start_date).toLocaleDateString('ko-KR')}</p>
          </div>
        </div>
      )}

      {/* 최근 현장 사진 */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>📷 최근 현장 사진</h2>
        {photos.length > 0 ? (
          <div className={styles.photoGrid}>
            {photos.map(photo => (
              <div key={photo.id} className={styles.photoItem}>
                <img src={photo.url} alt={photo.file_name} />
                <span className={styles.photoDate}>
                  {new Date(photo.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>공유된 사진이 없습니다</p>
        )}
      </div>

      {/* 승인 대기 목록 */}
      {changeRequests.length > 0 && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>✋ 승인 요청 ({changeRequests.length}건)</h2>
          <div className={styles.requestsList}>
            {changeRequests.map(request => {
              const typeInfo = CHANGE_REQUEST_TYPES[request.type as keyof typeof CHANGE_REQUEST_TYPES]
              return (
                <div key={request.id} className={styles.requestCard}>
                  <div className={styles.requestHeader}>
                    <span className={styles.requestIcon}>{typeInfo.icon}</span>
                    <h3>{request.title}</h3>
                  </div>
                  {request.description && (
                    <p className={styles.requestDesc}>{request.description}</p>
                  )}
                  {request.amount > 0 && (
                    <p className={styles.requestAmount}>
                      금액: <strong>{request.amount.toLocaleString()}원</strong>
                    </p>
                  )}
                  <div className={styles.requestActions}>
                    <button
                      className={styles.approveBtn}
                      onClick={() => handleApprove(request.id)}
                    >
                      ✅ 승인
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => handleReject(request.id)}
                    >
                      ❌ 거절
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
