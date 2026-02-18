'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Process, ProcessStatus } from '@/types/process'
import { PROCESS_STATUS } from '@/types/process'
import styles from './page.module.scss'

type ViewMode = 'list' | 'gantt'

export default function ProcessPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()
  const [processes, setProcesses] = useState<Process[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProcess, setEditingProcess] = useState<Process | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'pending',
    start_date: '',
    end_date: '',
    progress: 0,
    order_index: 0,
  })

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      const { data } = await supabase
        .from('processes')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index')

      if (data) setProcesses(data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'pending',
      start_date: '',
      end_date: '',
      progress: 0,
      order_index: processes.length,
    })
    setEditingProcess(null)
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('processes')
        .insert([{
          ...formData,
          project_id: projectId,
          progress: Number(formData.progress),
          order_index: processes.length,
        }])
        .select()
        .single()

      if (error) throw error

      setProcesses(prev => [...prev, data])
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      alert(`추가 오류: ${err?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingProcess) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('processes')
        .update({
          ...formData,
          progress: Number(formData.progress),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingProcess.id)

      if (error) throw error

      setProcesses(prev => prev.map(p =>
        p.id === editingProcess.id ? { ...p, ...formData, status: formData.status as ProcessStatus, progress: Number(formData.progress) } : p
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
    if (!confirm('이 공정을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase.from('processes').delete().eq('id', id)
      if (error) throw error
      setProcesses(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      alert(`삭제 오류: ${err?.message}`)
    }
  }

  const openEditModal = (process: Process) => {
    setFormData({
      name: process.name,
      description: process.description || '',
      status: process.status,
      start_date: process.start_date || '',
      end_date: process.end_date || '',
      progress: process.progress,
      order_index: process.order_index,
    })
    setEditingProcess(process)
    setShowModal(true)
  }

  const updateStatus = async (process: Process, newStatus: string) => {
    try {
      const newProgress = newStatus === 'completed' ? 100 : process.progress

      const { error } = await supabase
        .from('processes')
        .update({
          status: newStatus,
          progress: newProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', process.id)

      if (error) throw error

      setProcesses(prev => prev.map(p =>
        p.id === process.id ? { ...p, status: newStatus as any, progress: newProgress } : p
      ))
    } catch (err: any) {
      alert(`상태 변경 오류: ${err?.message}`)
    }
  }

  const getStatusInfo = (status: string) => PROCESS_STATUS.find(s => s.id === status)

  const overallProgress = processes.length > 0
    ? Math.round(processes.reduce((sum, p) => sum + p.progress, 0) / processes.length)
    : 0

  // Gantt 차트 계산
  const ganttData = useMemo(() => {
    const processesWithDates = processes.filter(p => p.start_date && p.end_date)
    if (processesWithDates.length === 0) return null

    const allStarts = processesWithDates.map(p => new Date(p.start_date!).getTime())
    const allEnds = processesWithDates.map(p => new Date(p.end_date!).getTime())
    const minDate = new Date(Math.min(...allStarts))
    const maxDate = new Date(Math.max(...allEnds))
    const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)))

    // 주 단위 눈금
    const weeks: { label: string; left: number }[] = []
    const weekStart = new Date(minDate)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    while (weekStart <= maxDate) {
      const dayOffset = Math.ceil((weekStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
      const pct = Math.max(0, (dayOffset / totalDays) * 100)
      if (pct <= 100) {
        weeks.push({
          label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
          left: pct,
        })
      }
      weekStart.setDate(weekStart.getDate() + 7)
    }

    // 오늘 위치
    const today = new Date()
    const todayOffset = (today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
    const todayPct = Math.min(100, Math.max(0, (todayOffset / totalDays) * 100))
    const showToday = todayPct >= 0 && todayPct <= 100

    return { minDate, maxDate, totalDays, weeks, todayPct, showToday, processesWithDates }
  }, [processes])

  const getBarStyle = (process: Process) => {
    if (!ganttData || !process.start_date || !process.end_date) return {}
    const start = new Date(process.start_date).getTime()
    const end = new Date(process.end_date).getTime()
    const left = ((start - ganttData.minDate.getTime()) / (ganttData.totalDays * 86400000)) * 100
    const width = ((end - start) / (ganttData.totalDays * 86400000)) * 100
    return { left: `${Math.max(0, left)}%`, width: `${Math.max(1, width)}%` }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#6b7280', in_progress: '#3b82f6', completed: '#10b981', delayed: '#ef4444',
    }
    return colors[status] || '#6b7280'
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>공정 데이터를 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {/* Progress Overview */}
        <section className={styles.overview}>
          <div className={styles.overviewCard}>
            <div className={styles.overviewIcon}>📊</div>
            <div className={styles.overviewInfo}>
              <span className={styles.overviewLabel}>전체 진행률</span>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <span className={styles.overviewValue}>{overallProgress}%</span>
            </div>
          </div>
          <div className={styles.overviewCard}>
            <div className={styles.overviewIcon}>📋</div>
            <div className={styles.overviewInfo}>
              <span className={styles.overviewLabel}>총 공정</span>
              <span className={styles.overviewValue}>{processes.length}개</span>
            </div>
          </div>
          <div className={styles.overviewCard}>
            <div className={styles.overviewIcon}>✅</div>
            <div className={styles.overviewInfo}>
              <span className={styles.overviewLabel}>완료</span>
              <span className={styles.overviewValue}>
                {processes.filter(p => p.status === 'completed').length}개
              </span>
            </div>
          </div>
          <div className={styles.overviewCard}>
            <div className={styles.overviewIcon}>⚠️</div>
            <div className={styles.overviewInfo}>
              <span className={styles.overviewLabel}>지연</span>
              <span className={`${styles.overviewValue} ${styles.delayed}`}>
                {processes.filter(p => p.status === 'delayed').length}개
              </span>
            </div>
          </div>
        </section>

        {/* Actions + View Toggle */}
        <div className={styles.actions}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              목록
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'gantt' ? styles.active : ''}`}
              onClick={() => setViewMode('gantt')}
            >
              공정표
            </button>
          </div>
          <button
            className={styles.addBtn}
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
          >
            + 공정 추가
          </button>
        </div>

        {/* Status Legend */}
        <div className={styles.statusLegend}>
          {PROCESS_STATUS.map(s => (
            <div key={s.id} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: s.color }} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>

        {/* Gantt Chart View */}
        {viewMode === 'gantt' && (
          <section className={styles.ganttSection}>
            {ganttData && ganttData.processesWithDates.length > 0 ? (
              <div className={styles.ganttChart}>
                {/* 타임라인 헤더 */}
                <div className={styles.ganttHeader}>
                  <div className={styles.ganttLabelCol}>공정명</div>
                  <div className={styles.ganttTimelineCol}>
                    {ganttData.weeks.map((w, i) => (
                      <span key={i} className={styles.ganttTick} style={{ left: `${w.left}%` }}>
                        {w.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 공정 바 */}
                <div className={styles.ganttBody}>
                  {processes.map((process, idx) => {
                    const barStyle = getBarStyle(process)
                    const hasDates = process.start_date && process.end_date
                    return (
                      <div key={process.id} className={styles.ganttRow} onClick={() => openEditModal(process)}>
                        <div className={styles.ganttLabelCol}>
                          <span className={styles.ganttIndex}>{idx + 1}</span>
                          <span className={styles.ganttName}>{process.name}</span>
                          <span className={styles.ganttPct}>{process.progress}%</span>
                        </div>
                        <div className={styles.ganttTimelineCol}>
                          {/* 오늘 마커 */}
                          {ganttData.showToday && (
                            <div className={styles.ganttToday} style={{ left: `${ganttData.todayPct}%` }} />
                          )}
                          {/* 주 단위 격자 */}
                          {ganttData.weeks.map((w, i) => (
                            <div key={i} className={styles.ganttGridLine} style={{ left: `${w.left}%` }} />
                          ))}
                          {hasDates ? (
                            <div className={styles.ganttBar} style={{ ...barStyle, background: getStatusColor(process.status) }}>
                              <div
                                className={styles.ganttBarProgress}
                                style={{ width: `${process.progress}%` }}
                              />
                            </div>
                          ) : (
                            <span className={styles.ganttNoDate}>날짜 미설정</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 범례: 오늘 */}
                <div className={styles.ganttFooter}>
                  <span className={styles.ganttTodayLabel}>
                    <span className={styles.ganttTodayDot} /> 오늘 ({new Date().toLocaleDateString('ko-KR')})
                  </span>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📅</span>
                <h3>공정표를 보려면 날짜를 설정하세요</h3>
                <p>공정의 시작일과 종료일을 입력하면<br/>간트 차트가 자동으로 생성됩니다</p>
              </div>
            )}
          </section>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <section className={styles.processList}>
            {processes.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📋</span>
                <h3>등록된 공정이 없습니다</h3>
                <p>공정을 추가하면 진행 상황을 체계적으로 관리할 수 있습니다</p>
                <button className={styles.emptyBtn} onClick={() => { resetForm(); setShowModal(true) }}>
                  + 첫 공정 추가하기
                </button>
              </div>
            ) : (
              processes.map((process, index) => {
                const statusInfo = getStatusInfo(process.status)
                return (
                  <div key={process.id} className={styles.processCard}>
                    <div className={styles.processIndex}>{index + 1}</div>
                    <div className={styles.processInfo}>
                      <h3>{process.name}</h3>
                      {process.description && <p>{process.description}</p>}
                      <div className={styles.processDates}>
                        {process.start_date && (
                          <span>시작: {new Date(process.start_date).toLocaleDateString('ko-KR')}</span>
                        )}
                        {process.end_date && (
                          <span>종료: {new Date(process.end_date).toLocaleDateString('ko-KR')}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.processProgress}>
                      <div className={styles.progressBarSmall}>
                        <div
                          className={styles.progressFillSmall}
                          style={{ width: `${process.progress}%` }}
                        />
                      </div>
                      <span>{process.progress}%</span>
                    </div>
                    <select
                      className={styles.statusSelect}
                      value={process.status}
                      onChange={(e) => updateStatus(process, e.target.value)}
                      style={{
                        backgroundColor: statusInfo?.color || '#e5e7eb',
                        color: 'white'
                      }}
                    >
                      {PROCESS_STATUS.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <div className={styles.processActions}>
                      <button onClick={() => openEditModal(process)}>수정</button>
                      <button onClick={() => handleDelete(process.id)}>삭제</button>
                    </div>
                  </div>
                )
              })
            )}
          </section>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingProcess ? '공정 수정' : '공정 추가'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>공정명 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 철거공사"
                />
              </div>
              <div className={styles.formGroup}>
                <label>설명</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="공정에 대한 상세 설명"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>상태</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    {PROCESS_STATUS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>진행률 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={e => setFormData(prev => ({ ...prev, progress: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>시작일</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>종료일</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  취소
                </button>
                <button
                  className={styles.submitBtn}
                  onClick={editingProcess ? handleUpdate : handleAdd}
                  disabled={saving || !formData.name}
                >
                  {saving ? '저장 중...' : editingProcess ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
