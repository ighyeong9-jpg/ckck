'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

interface Defect {
  id: string
  title: string
  description: string | null
  severity: string
  status: string
  location: string | null
  reported_at: string
  photos: string[] | null
}

export default function ClientDefectsPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const projectId = params.id as string
  const supabase = createClient()

  const [defects, setDefects] = useState<Defect[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    location: '',
  })

  useEffect(() => {
    loadDefects()
  }, [projectId])

  const loadDefects = async () => {
    try {
      const { data } = await supabase
        .from('defects')
        .select('*')
        .eq('project_id', projectId)
        .order('reported_at', { ascending: false })

      if (data) setDefects(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.warning('제목을 입력해주세요.')
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase.from('defects').insert([
        {
          project_id: projectId,
          title: formData.title,
          description: formData.description || null,
          severity: formData.severity,
          location: formData.location || null,
          status: 'reported',
        },
      ])

      if (error) throw error

      toast.success('하자가 접수되었습니다.')
      setShowForm(false)
      setFormData({ title: '', description: '', severity: 'medium', location: '' })
      loadDefects()
    } catch (err: any) {
      toast.error(`접수 오류: ${err?.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { label: '긴급', color: '#ef4444', icon: '🔴' }
      case 'high':
        return { label: '높음', color: '#f97316', icon: '🟠' }
      case 'medium':
        return { label: '보통', color: '#f59e0b', icon: '🟡' }
      case 'low':
        return { label: '낮음', color: '#10b981', icon: '🟢' }
      default:
        return { label: '보통', color: '#f59e0b', icon: '🟡' }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'reported':
        return '접수됨'
      case 'in_progress':
        return '처리중'
      case 'resolved':
        return '해결완료'
      case 'closed':
        return '종료'
      default:
        return status
    }
  }

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          ← 뒤로
        </button>
        <h1 className={styles.title}>하자 접수</h1>
      </header>

      <button className={styles.newBtn} onClick={() => setShowForm(!showForm)}>
        {showForm ? '취소' : '+ 새 하자 접수'}
      </button>

      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>하자 접수하기</h2>

          <div className={styles.formGroup}>
            <label>제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="예: 벽면 균열 발견"
            />
          </div>

          <div className={styles.formGroup}>
            <label>위치</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="예: 거실 남쪽 벽면"
            />
          </div>

          <div className={styles.formGroup}>
            <label>심각도</label>
            <select
              value={formData.severity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, severity: e.target.value }))
              }
            >
              <option value="low">🟢 낮음</option>
              <option value="medium">🟡 보통</option>
              <option value="high">🟠 높음</option>
              <option value="critical">🔴 긴급</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>설명</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              placeholder="하자에 대한 상세 설명을 입력해주세요"
            />
          </div>

          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '접수 중...' : '접수하기'}
          </button>

          <p className={styles.formHint}>
            접수하시면 업체에 즉시 알림이 전송됩니다.
          </p>
        </div>
      )}

      <div className={styles.defectsList}>
        {defects.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔧</div>
            <p>접수된 하자가 없습니다</p>
          </div>
        ) : (
          defects.map((defect) => {
            const severity = getSeverityLabel(defect.severity)
            return (
              <div key={defect.id} className={styles.defectCard}>
                <div className={styles.defectHeader}>
                  <span
                    className={styles.severityBadge}
                    style={{ background: severity.color }}
                  >
                    {severity.icon} {severity.label}
                  </span>
                  <span className={styles.statusBadge}>
                    {getStatusLabel(defect.status)}
                  </span>
                </div>

                <h3 className={styles.defectTitle}>{defect.title}</h3>

                {defect.description && (
                  <p className={styles.defectDesc}>{defect.description}</p>
                )}

                {defect.location && (
                  <p className={styles.defectLocation}>📍 {defect.location}</p>
                )}

                <p className={styles.defectDate}>
                  {new Date(defect.reported_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
