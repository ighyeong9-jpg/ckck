'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ChangeOrder, ChangeOrderStatus, ChangeOrderType } from '@/types/changeOrder'
import { CHANGE_TYPES, CHANGE_STATUSES } from '@/types/changeOrder'
import QuickActions from '@/components/ui/QuickActions'
import styles from './page.module.scss'

export default function ChangesPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [orders, setOrders] = useState<ChangeOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<ChangeOrder | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    reason: '',
    change_type: 'scope',
    cost_change: '' as string | number,
    notes: '',
  })

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: changeOrders, error } = await supabase
          .from('change_orders')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrders(changeOrders || [])
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId])

  // 요약 계산
  const summary = useMemo(() => {
    const requested = orders.filter(o => o.status === 'requested')
    const approved = orders.filter(o => o.status === 'approved')
    const rejected = orders.filter(o => o.status === 'rejected')

    const totalIncrease = approved
      .filter(o => o.cost_change > 0)
      .reduce((sum, o) => sum + o.cost_change, 0)

    const totalDecrease = approved
      .filter(o => o.cost_change < 0)
      .reduce((sum, o) => sum + o.cost_change, 0)

    return {
      total: orders.length,
      requested: requested.length,
      approved: approved.length,
      rejected: rejected.length,
      netCostChange: totalIncrease + totalDecrease,
      totalIncrease,
      totalDecrease,
    }
  }, [orders])

  const formatAmount = (amount: number) => {
    const prefix = amount > 0 ? '+' : ''
    return `${prefix}${amount.toLocaleString()}원`
  }

  const resetForm = () => {
    setFormData({
      title: '',
      reason: '',
      change_type: 'scope',
      cost_change: '',
      notes: '',
    })
    setEditingOrder(null)
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('change_orders')
        .insert([{
          project_id: projectId,
          title: formData.title,
          reason: formData.reason || null,
          change_type: formData.change_type,
          cost_change: Number(formData.cost_change) || 0,
          notes: formData.notes || null,
          status: 'requested',
          requested_at: new Date().toISOString(),
        }])
        .select()
        .single()

      if (error) throw error

      setOrders(prev => [data, ...prev])
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      console.error('Error adding:', err)
      alert(`추가 오류: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingOrder) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('change_orders')
        .update({
          title: formData.title,
          reason: formData.reason || null,
          change_type: formData.change_type,
          cost_change: Number(formData.cost_change) || 0,
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingOrder.id)

      if (error) throw error

      setOrders(prev => prev.map(o =>
        o.id === editingOrder.id
          ? {
              ...o,
              title: formData.title,
              reason: formData.reason || null,
              change_type: formData.change_type as ChangeOrderType,
              cost_change: Number(formData.cost_change) || 0,
              notes: formData.notes || null
            }
          : o
      ))
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      console.error('Error updating:', err)
      alert(`수정 오류: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, newStatus: ChangeOrderStatus) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === 'approved' || newStatus === 'rejected') {
        updateData.approved_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('change_orders')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      setOrders(prev => prev.map(o =>
        o.id === id ? { ...o, ...updateData } : o
      ))
    } catch (err: any) {
      console.error('Error changing status:', err)
      alert(`상태변경 오류: ${err?.message || JSON.stringify(err)}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 변경요청을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('change_orders')
        .delete()
        .eq('id', id)

      if (error) throw error

      setOrders(prev => prev.filter(o => o.id !== id))
    } catch (err: any) {
      console.error('Error deleting:', err)
      alert(`삭제 오류: ${err?.message || JSON.stringify(err)}`)
    }
  }

  const openEditModal = (order: ChangeOrder) => {
    setFormData({
      title: order.title,
      reason: order.reason || '',
      change_type: order.change_type,
      cost_change: order.cost_change,
      notes: order.notes || '',
    })
    setEditingOrder(order)
    setShowModal(true)
  }

  const getTypeName = (id: string) => CHANGE_TYPES.find(t => t.id === id)?.name || id
  const getTypeIcon = (id: string) => CHANGE_TYPES.find(t => t.id === id)?.icon || '📌'
  const getStatusInfo = (id: string) => CHANGE_STATUSES.find(s => s.id === id)

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
          { icon: '🔄', label: '변경 등록', description: '변경사항 등록', message: '변경사항 등록해줘' },
          { icon: '📋', label: '변경 이력', description: '변경 이력 분석', message: '변경 이력 분석해줘' },
        ]} />

        {/* Summary */}
        <section className={styles.summary}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>전체</span>
            <span className={styles.summaryValue}>{summary.total}건</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>요청중</span>
            <span className={styles.summaryValue} style={{ color: '#f59e0b' }}>{summary.requested}건</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>승인</span>
            <span className={styles.summaryValue} style={{ color: '#10b981' }}>{summary.approved}건</span>
          </div>
          <div className={`${styles.summaryCard} ${styles.costCard}`}>
            <span className={styles.summaryLabel}>비용증감 합계</span>
            <span className={styles.summaryValue}>
              {formatAmount(summary.netCostChange)}
            </span>
          </div>
        </section>

        {/* Actions */}
        <section className={styles.actions}>
          <button
            className={styles.addBtn}
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
          >
            + 변경요청 추가
          </button>
        </section>

        {/* Orders List */}
        <section className={styles.ordersList}>
          {orders.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🔄</span>
              <h3>변경요청이 없습니다</h3>
              <p>공사 중 변경사항을 기록하면<br/>비용/일정 영향을 추적할 수 있습니다</p>
              <button
                className={styles.emptyBtn}
                onClick={() => {
                  resetForm()
                  setShowModal(true)
                }}
              >
                + 첫 변경요청 추가하기
              </button>
            </div>
          ) : (
            orders.map(order => {
              const statusInfo = getStatusInfo(order.status)
              return (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <div className={styles.orderType}>
                      <span className={styles.typeIcon}>{getTypeIcon(order.change_type)}</span>
                      <span className={styles.typeName}>{getTypeName(order.change_type)}</span>
                    </div>
                    <span
                      className={styles.statusBadge}
                      style={{ background: statusInfo?.color }}
                    >
                      {statusInfo?.name}
                    </span>
                  </div>

                  <h3 className={styles.orderTitle}>{order.title}</h3>
                  {order.reason && <p className={styles.orderReason}>{order.reason}</p>}

                  <div className={styles.orderMeta}>
                    <span className={styles.costChange} data-positive={order.cost_change > 0}>
                      {formatAmount(order.cost_change)}
                    </span>
                    <span className={styles.date}>
                      {new Date(order.requested_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>

                  <div className={styles.orderActions}>
                    {order.status === 'requested' && (
                      <>
                        <button
                          className={styles.approveBtn}
                          onClick={() => handleStatusChange(order.id, 'approved')}
                        >
                          승인
                        </button>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => handleStatusChange(order.id, 'rejected')}
                        >
                          거절
                        </button>
                      </>
                    )}
                    <button
                      className={styles.editBtn}
                      onClick={() => openEditModal(order)}
                    >
                      수정
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(order.id)}
                    >
                      삭제
                    </button>
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
              <h2>{editingOrder ? '변경요청 수정' : '변경요청 추가'}</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>유형</label>
                <select
                  value={formData.change_type}
                  onChange={e => setFormData(prev => ({ ...prev, change_type: e.target.value }))}
                >
                  {CHANGE_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>제목 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="변경요청 제목"
                />
              </div>

              <div className={styles.formGroup}>
                <label>사유</label>
                <textarea
                  value={formData.reason}
                  onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="변경 사유를 입력하세요"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>비용 증감 (원)</label>
                <input
                  type="number"
                  value={formData.cost_change}
                  onChange={e => setFormData(prev => ({ ...prev, cost_change: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                  placeholder="금액 입력 (증가: 양수, 감소: 음수)"
                />
                <span className={styles.hint}>비용 증가는 양수, 감소는 음수로 입력</span>
              </div>

              <div className={styles.formGroup}>
                <label>비고</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="추가 메모"
                  rows={2}
                />
              </div>

              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  취소
                </button>
                <button
                  className={styles.submitBtn}
                  onClick={editingOrder ? handleUpdate : handleAdd}
                  disabled={saving || !formData.title}
                >
                  {saving ? '저장 중...' : editingOrder ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
