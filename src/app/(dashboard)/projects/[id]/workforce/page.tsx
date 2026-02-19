'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Workforce, WorkStatus } from '@/types/workforce'
import { WORKER_TYPES, ATTENDANCE_STATUS } from '@/types/workforce'
import QuickActions from '@/components/ui/QuickActions'
import styles from './page.module.scss'

export default function WorkforcePage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()
  const [workers, setWorkers] = useState<Workforce[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Workforce | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const [formData, setFormData] = useState({
    name: '',
    worker_type: 'general',
    phone: '',
    daily_wage: '' as string | number,
    work_date: selectedDate,
    attendance_status: 'present',
    work_hours: '' as string | number,
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [projectId, selectedDate])

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('workforce')
        .select('*')
        .eq('project_id', projectId)
        .eq('work_date', selectedDate)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setWorkers(data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      worker_type: 'general',
      phone: '',
      daily_wage: '',
      work_date: selectedDate,
      attendance_status: 'present',
      work_hours: '',
      notes: '',
    })
    setEditingWorker(null)
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('workforce')
        .insert([{
          name: formData.name,
          worker_type: formData.worker_type,
          phone: formData.phone || null,
          attendance_status: formData.attendance_status,
          notes: formData.notes || null,
          work_date: formData.work_date,
          project_id: projectId,
          daily_wage: Number(formData.daily_wage) || 0,
          work_hours: Number(formData.work_hours) || 8,
        }])
        .select()
        .single()

      if (error) throw error

      setWorkers(prev => [data, ...prev])
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      alert(`추가 오류: ${err?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingWorker) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('workforce')
        .update({
          name: formData.name,
          worker_type: formData.worker_type,
          phone: formData.phone || null,
          attendance_status: formData.attendance_status,
          notes: formData.notes || null,
          work_date: formData.work_date,
          daily_wage: Number(formData.daily_wage) || 0,
          work_hours: Number(formData.work_hours) || 8,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingWorker.id)

      if (error) throw error

      setWorkers(prev => prev.map(w =>
        w.id === editingWorker.id
          ? {
              ...w,
              name: formData.name,
              worker_type: formData.worker_type,
              phone: formData.phone || null,
              attendance_status: formData.attendance_status as WorkStatus,
              notes: formData.notes || null,
              work_date: formData.work_date,
              daily_wage: Number(formData.daily_wage) || 0,
              work_hours: Number(formData.work_hours) || 8
            }
          : w
      ))
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      alert(`수정 오류: ${err?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 인력 기록을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase.from('workforce').delete().eq('id', id)
      if (error) throw error
      setWorkers(prev => prev.filter(w => w.id !== id))
    } catch (err: any) {
      alert(`삭제 오류: ${err?.message}`)
    }
  }

  const openEditModal = (worker: Workforce) => {
    setFormData({
      name: worker.name,
      worker_type: worker.worker_type,
      phone: worker.phone || '',
      daily_wage: worker.daily_wage,
      work_date: worker.work_date,
      attendance_status: worker.attendance_status,
      work_hours: worker.work_hours,
      notes: worker.notes || '',
    })
    setEditingWorker(worker)
    setShowModal(true)
  }

  const updateAttendance = async (worker: Workforce, status: string) => {
    try {
      const { error } = await supabase
        .from('workforce')
        .update({
          attendance_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', worker.id)

      if (error) throw error

      setWorkers(prev => prev.map(w =>
        w.id === worker.id ? { ...w, attendance_status: status as any } : w
      ))
    } catch (err: any) {
      alert(`상태 변경 오류: ${err?.message}`)
    }
  }

  const getWorkerTypeInfo = (type: string) => WORKER_TYPES.find(t => t.id === type)
  const getAttendanceInfo = (status: string) => ATTENDANCE_STATUS.find(s => s.id === status)

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()}원`
  }

  // 통계 계산
  const totalWorkers = workers.length
  const presentWorkers = workers.filter(w => w.attendance_status === 'present').length
  const totalWages = workers
    .filter(w => w.attendance_status === 'present')
    .reduce((sum, w) => sum + (w.daily_wage * w.work_hours / 8), 0)
  const totalHours = workers
    .filter(w => w.attendance_status === 'present')
    .reduce((sum, w) => sum + w.work_hours, 0)

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <QuickActions compact actions={[
          { icon: '👷', label: '인력 현황', description: '인력 현황 조회', message: '인력 현황 알려줘' },
          { icon: '📋', label: '자격증 확인', description: '작업자 자격증 확인', message: '작업자 자격증 확인해줘' },
          { icon: '💵', label: '노무비 조회', description: '노무비 현황 확인', message: '노무비 현황 알려줘' },
        ]} />

        {/* Date Selector */}
        <section className={styles.dateSection}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={styles.dateInput}
          />
          <button
            className={styles.todayBtn}
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            오늘
          </button>
        </section>

        {/* Stats Overview */}
        <section className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>👷</span>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{presentWorkers}/{totalWorkers}</span>
              <span className={styles.statLabel}>출근 인원</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>⏱️</span>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{totalHours}시간</span>
              <span className={styles.statLabel}>총 근무시간</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>💰</span>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{formatCurrency(totalWages)}</span>
              <span className={styles.statLabel}>일일 인건비</span>
            </div>
          </div>
        </section>

        {/* Add Button */}
        <div className={styles.actions}>
          <button
            className={styles.addBtn}
            onClick={() => {
              resetForm()
              setFormData(prev => ({ ...prev, work_date: selectedDate }))
              setShowModal(true)
            }}
          >
            + 인력 추가
          </button>
        </div>

        {/* Workers List */}
        <section className={styles.workersList}>
          {workers.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👷</span>
              <p>{selectedDate} 에 등록된 인력이 없습니다.</p>
            </div>
          ) : (
            workers.map(worker => {
              const typeInfo = getWorkerTypeInfo(worker.worker_type)
              const attendanceInfo = getAttendanceInfo(worker.attendance_status)
              const calculatedWage = worker.daily_wage * worker.work_hours / 8
              return (
                <div key={worker.id} className={styles.workerCard}>
                  <div className={styles.workerIcon}>{typeInfo?.icon}</div>
                  <div className={styles.workerInfo}>
                    <h3>{worker.name}</h3>
                    <p className={styles.workerType}>{typeInfo?.name}</p>
                    {worker.phone && <span className={styles.phone}>📞 {worker.phone}</span>}
                  </div>
                  <div className={styles.workerWage}>
                    <span className={styles.wageValue}>{formatCurrency(calculatedWage)}</span>
                    <span className={styles.wageLabel}>{worker.work_hours}시간 근무</span>
                  </div>
                  <select
                    className={styles.attendanceSelect}
                    value={worker.attendance_status}
                    onChange={(e) => updateAttendance(worker, e.target.value)}
                    style={{ backgroundColor: attendanceInfo?.color || '#e5e7eb' }}
                  >
                    {ATTENDANCE_STATUS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className={styles.workerActions}>
                    <button onClick={() => openEditModal(worker)}>수정</button>
                    <button onClick={() => handleDelete(worker.id)}>삭제</button>
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
              <h2>{editingWorker ? '인력 수정' : '인력 추가'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>이름 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="홍길동"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>직종</label>
                  <select
                    value={formData.worker_type}
                    onChange={e => setFormData(prev => ({ ...prev, worker_type: e.target.value }))}
                  >
                    {WORKER_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>연락처</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="010-1234-5678"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>일당 (원)</label>
                  <input
                    type="number"
                    value={formData.daily_wage}
                    onChange={e => setFormData(prev => ({ ...prev, daily_wage: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder="금액 입력"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>근무일</label>
                  <input
                    type="date"
                    value={formData.work_date}
                    onChange={e => setFormData(prev => ({ ...prev, work_date: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>근무시간</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={formData.work_hours}
                    onChange={e => setFormData(prev => ({ ...prev, work_hours: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder="시간 입력"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>출근상태</label>
                <select
                  value={formData.attendance_status}
                  onChange={e => setFormData(prev => ({ ...prev, attendance_status: e.target.value }))}
                >
                  {ATTENDANCE_STATUS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>메모</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  취소
                </button>
                <button
                  className={styles.submitBtn}
                  onClick={editingWorker ? handleUpdate : handleAdd}
                  disabled={saving || !formData.name}
                >
                  {saving ? '저장 중...' : editingWorker ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
