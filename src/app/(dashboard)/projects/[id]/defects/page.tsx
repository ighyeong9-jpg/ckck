'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sha256 } from '@/lib/utils/merkleTree'
import type { Defect, DefectSeverity, DefectStatus } from '@/types/defect'
import { DEFECT_SEVERITIES, DEFECT_STATUSES } from '@/types/defect'
import QuickActions from '@/components/ui/QuickActions'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

export default function DefectsPage() {
  const toast = useToast()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [defects, setDefects] = useState<Defect[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as DefectSeverity,
    location: '',
    photos: [] as string[],
  })

  useEffect(() => {
    loadDefects()
  }, [projectId])

  const loadDefects = async () => {
    try {
      const { data, error } = await supabase
        .from('defects')
        .select('*')
        .eq('project_id', projectId)
        .order('reported_at', { ascending: false })

      if (error) throw error
      if (data) setDefects(data)
    } catch (err) {
      console.error('Error loading defects:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '', description: '', severity: 'medium',
      location: '', photos: [],
    })
    setEditingDefect(null)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (formData.photos.length + files.length > 5) {
      toast.warning('사진은 최대 5장까지 업로드할 수 있습니다.')
      return
    }

    setUploadingPhotos(true)
    try {
      const newPhotos: string[] = []
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const fileName = `defects/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('evidence').upload(fileName, file)
        if (error) throw error
        const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(fileName)
        newPhotos.push(urlData.publicUrl)
      }
      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }))
    } catch (err: any) {
      toast.error(`업로드 오류: ${err?.message}`)
    } finally {
      setUploadingPhotos(false)
    }
  }

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) return
    setSaving(true)

    try {
      // 현재 사용자 ID 가져오기
      const { data: { user } } = await supabase.auth.getUser()

      const insertData: Record<string, any> = {
        project_id: projectId,
        title: formData.title,
        description: formData.description || null,
        severity: formData.severity,
        status: 'reported' as DefectStatus,
        location: formData.location || null,
        reported_by: null,
      }

      // migration 후 사용 가능한 옵션 컬럼
      if (formData.photos.length > 0) {
        insertData.photos = formData.photos
      }
      try {
        const hashInput = `${formData.title}|${formData.description}|${formData.severity}|${formData.location}|${formData.photos.join(',')}`
        const hash = await sha256(hashInput)
        insertData.sha256_hash = hash
      } catch {}

      if (editingDefect) {
        const { error } = await supabase
          .from('defects')
          .update(insertData)
          .eq('id', editingDefect.id)
        if (error) throw error
        setDefects(prev => prev.map(d =>
          d.id === editingDefect.id ? { ...d, ...insertData } : d
        ))
      } else {
        const { data, error } = await supabase
          .from('defects')
          .insert([insertData])
          .select()
          .single()
        if (error) throw error
        if (data) setDefects(prev => [data, ...prev])
      }

      setShowModal(false)
      resetForm()
    } catch (err: any) {
      toast.error(`저장 오류: ${err?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (defect: Defect, newStatus: DefectStatus) => {
    try {
      const updates: any = {
        status: newStatus,
      }
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updates.resolved_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('defects')
        .update(updates)
        .eq('id', defect.id)

      if (error) throw error
      setDefects(prev => prev.map(d =>
        d.id === defect.id ? { ...d, ...updates } : d
      ))
    } catch (err: any) {
      toast.error(`상태 변경 오류: ${err?.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 하자 요청을 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('defects').delete().eq('id', id)
      if (error) throw error
      setDefects(prev => prev.filter(d => d.id !== id))
    } catch (err: any) {
      toast.error(`삭제 오류: ${err?.message}`)
    }
  }

  const openEditModal = (defect: Defect) => {
    setFormData({
      title: defect.title,
      description: defect.description || '',
      severity: defect.severity,
      location: defect.location || '',
      photos: defect.photos || [],
    })
    setEditingDefect(defect)
    setShowModal(true)
  }

  const getSeverityInfo = (severity: string) => DEFECT_SEVERITIES.find(s => s.id === severity)
  const getStatusInfo = (status: string) => DEFECT_STATUSES.find(s => s.id === status)

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>하자 데이터를 불러오는 중...</span>
        </div>
      </div>
    )
  }

  const totalCount = defects.length
  const bySeverity = DEFECT_SEVERITIES.map(s => ({
    ...s,
    count: defects.filter(d => d.severity === s.id).length,
  }))
  const byStatus = DEFECT_STATUSES.map(s => ({
    ...s,
    count: defects.filter(d => d.status === s.id).length,
  }))

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <QuickActions compact actions={[
          { icon: '🔧', label: '하자 등록', description: '새 하자 등록', message: '새 하자 등록해줘' },
          { icon: '📋', label: '하자 현황', description: '하자 목록 조회', message: '하자 목록 보여줘' },
          { icon: '📊', label: '처리 이력', description: '하자 처리 현황', message: '하자 처리 이력 알려줘' },
        ]} />

        {/* Overview Cards */}
        <section className={styles.overview}>
          <div className={styles.overviewCard}>
            <div className={styles.overviewIcon}>🚨</div>
            <div className={styles.overviewInfo}>
              <span className={styles.overviewLabel}>전체 하자</span>
              <span className={styles.overviewValue}>{totalCount}건</span>
            </div>
          </div>
          {bySeverity.filter(s => s.count > 0).map(s => (
            <div key={s.id} className={styles.overviewCard}>
              <div className={styles.overviewIcon}>{s.icon}</div>
              <div className={styles.overviewInfo}>
                <span className={styles.overviewLabel}>{s.name}</span>
                <span className={styles.overviewValue}>{s.count}건</span>
              </div>
            </div>
          ))}
        </section>

        {/* Status Summary */}
        <section className={styles.statusSummary}>
          {byStatus.map(s => (
            <div key={s.id} className={styles.statusChip} style={{ '--chip-color': s.color } as React.CSSProperties}>
              <span className={styles.statusDot} style={{ background: s.color }} />
              <span>{s.name}</span>
              <strong>{s.count}</strong>
            </div>
          ))}
        </section>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.addBtn}
            onClick={() => { resetForm(); setShowModal(true) }}
          >
            + 하자 요청
          </button>
        </div>

        {/* Defect List */}
        <section className={styles.defectList}>
          {defects.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>✅</span>
              <h3>등록된 하자가 없습니다</h3>
              <p>현장에서 발견된 하자를 신고하여 체계적으로 관리하세요</p>
              <button className={styles.emptyBtn} onClick={() => { resetForm(); setShowModal(true) }}>
                + 첫 하자 요청하기
              </button>
            </div>
          ) : (
            defects.map(defect => {
              const severity = getSeverityInfo(defect.severity)
              const status = getStatusInfo(defect.status)
              return (
                <div key={defect.id} className={styles.defectCard}>
                  <div className={styles.defectHeader}>
                    <span className={styles.severityBadge} style={{ background: severity?.color }}>
                      {severity?.icon} {severity?.name}
                    </span>
                    <select
                      className={styles.statusSelect}
                      value={defect.status}
                      onChange={e => updateStatus(defect, e.target.value as DefectStatus)}
                      style={{ backgroundColor: status?.color, color: 'white' }}
                    >
                      {DEFECT_STATUSES.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <h3 className={styles.defectTitle}>{defect.title}</h3>
                  {defect.description && <p className={styles.defectDesc}>{defect.description}</p>}
                  {defect.location && (
                    <span className={styles.defectLocation}>📍 {defect.location}</span>
                  )}
                  {defect.photos && defect.photos.length > 0 && (
                    <div className={styles.defectPhotos}>
                      {defect.photos.map((photo, i) => (
                        <img key={i} src={photo} alt={`하자 사진 ${i + 1}`} className={styles.photoThumb} />
                      ))}
                    </div>
                  )}
                  <div className={styles.defectFooter}>
                    <span className={styles.defectDate}>
                      {new Date(defect.reported_at).toLocaleDateString('ko-KR')}
                    </span>
                    <div className={styles.defectActions}>
                      <button onClick={() => openEditModal(defect)}>수정</button>
                      <button onClick={() => handleDelete(defect.id)}>삭제</button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingDefect ? '하자 수정' : '하자 요청'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>제목 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="예: 벽면 균열 발견"
                />
              </div>
              <div className={styles.formGroup}>
                <label>설명</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="하자에 대한 상세 설명"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>심각도</label>
                  <select
                    value={formData.severity}
                    onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value as DefectSeverity }))}
                  >
                    {DEFECT_SEVERITIES.map(s => (
                      <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>위치</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="예: 거실 남쪽 벽면"
                  />
                </div>
              </div>
              {/* Photos */}
              <div className={styles.formGroup}>
                <label>사진 ({formData.photos.length}/5)</label>
                <div className={styles.photoUploadArea}>
                  {formData.photos.map((photo, i) => (
                    <div key={i} className={styles.photoPreview}>
                      <img src={photo} alt={`사진 ${i + 1}`} />
                      <button className={styles.removePhotoBtn} onClick={() => removePhoto(i)}>✕</button>
                    </div>
                  ))}
                  {formData.photos.length < 5 && (
                    <label className={styles.photoAddBtn}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        style={{ display: 'none' }}
                      />
                      {uploadingPhotos ? '...' : '📷 +'}
                    </label>
                  )}
                </div>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>취소</button>
                <button
                  className={styles.submitBtn}
                  onClick={handleSubmit}
                  disabled={saving || !formData.title.trim()}
                >
                  {saving ? '저장 중...' : editingDefect ? '수정' : '요청'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
