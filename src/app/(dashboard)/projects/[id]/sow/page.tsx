'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { QuoteLineItem, QuoteSummary } from '@/types/quote'
import { QUOTE_CATEGORIES, UNITS } from '@/types/quote'
import styles from './page.module.scss'

export default function SOWPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [items, setItems] = useState<QuoteLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<QuoteLineItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    category: 'demolition',
    item_name: '',
    specification: '',
    unit: 'ea',
    quantity: '' as string | number,
    unit_price: '' as string | number,
    notes: '',
  })

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 견적 항목
        const { data: quoteItems, error } = await supabase
          .from('quote_line_items')
          .select('*')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true })

        if (error) throw error
        setItems(quoteItems || [])
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId])

  // 금액 포맷팅 (원 단위, 천단위 콤마)
  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString()}원`
  }

  // 총액 계산
  const summary: QuoteSummary = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const vat = Math.round(subtotal * 0.1)
    return {
      subtotal,
      vat,
      total: subtotal + vat,
      itemCount: items.length,
    }
  }, [items])

  // 카테고리별 그룹화
  const groupedItems = useMemo(() => {
    const groups: Record<string, QuoteLineItem[]> = {}
    items.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = []
      }
      groups[item.category].push(item)
    })
    return groups
  }, [items])

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      category: 'demolition',
      item_name: '',
      specification: '',
      unit: 'ea',
      quantity: '',
      unit_price: '',
      notes: '',
    })
    setEditingItem(null)
  }

  // 항목 추가
  const handleAdd = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('quote_line_items')
        .insert([{
          project_id: projectId,
          category: formData.category,
          item_name: formData.item_name,
          specification: formData.specification || null,
          unit: formData.unit,
          quantity: Number(formData.quantity) || 0,
          unit_price: Number(formData.unit_price) || 0,
          notes: formData.notes || null,
          sort_order: items.length,
        }])
        .select()
        .single()

      if (error) throw error

      setItems(prev => [...prev, data])
      setShowAddModal(false)
      resetForm()
    } catch (err: any) {
      console.error('Error adding item:', err)
      alert(`항목 추가 오류: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
  }

  // 항목 수정
  const handleUpdate = async () => {
    if (!editingItem) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('quote_line_items')
        .update({
          category: formData.category,
          item_name: formData.item_name,
          specification: formData.specification || null,
          unit: formData.unit,
          quantity: Number(formData.quantity) || 0,
          unit_price: Number(formData.unit_price) || 0,
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingItem.id)

      if (error) throw error

      setItems(prev => prev.map(item =>
        item.id === editingItem.id
          ? {
              ...item,
              category: formData.category,
              item_name: formData.item_name,
              specification: formData.specification || null,
              unit: formData.unit,
              quantity: Number(formData.quantity) || 0,
              unit_price: Number(formData.unit_price) || 0,
              notes: formData.notes || null
            }
          : item
      ))
      setShowAddModal(false)
      resetForm()
    } catch (err: any) {
      console.error('Error updating item:', err)
      alert(`항목 수정 오류: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
  }

  // 항목 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('quote_line_items')
        .delete()
        .eq('id', id)

      if (error) throw error

      setItems(prev => prev.filter(item => item.id !== id))
    } catch (err: any) {
      console.error('Error deleting item:', err)
      alert(`삭제 오류: ${err?.message || JSON.stringify(err)}`)
    }
  }

  // 수정 모달 열기
  const openEditModal = (item: QuoteLineItem) => {
    setFormData({
      category: item.category,
      item_name: item.item_name,
      specification: item.specification || '',
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      notes: item.notes || '',
    })
    setEditingItem(item)
    setShowAddModal(true)
  }

  // 카테고리 이름 가져오기
  const getCategoryName = (id: string) => {
    return QUOTE_CATEGORIES.find(c => c.id === id)?.name || id
  }

  // 단위 이름 가져오기
  const getUnitName = (id: string) => {
    return UNITS.find(u => u.id === id)?.name || id
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
      <main className={styles.main}>
        {/* Summary */}
        <section className={styles.summary}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>항목 수</span>
            <span className={styles.summaryValue}>{summary.itemCount}개</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>공급가액</span>
            <span className={styles.summaryValue}>{formatAmount(summary.subtotal)}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>부가세 (10%)</span>
            <span className={styles.summaryValue}>{formatAmount(summary.vat)}</span>
          </div>
          <div className={`${styles.summaryCard} ${styles.total}`}>
            <span className={styles.summaryLabel}>총 합계</span>
            <span className={styles.summaryValue}>{formatAmount(summary.total)}</span>
          </div>
        </section>

        {/* Actions */}
        <section className={styles.actions}>
          <button
            className={styles.addBtn}
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
          >
            + 항목 추가
          </button>
        </section>

        {/* Items by Category */}
        <section className={styles.itemsSection}>
          {Object.keys(groupedItems).length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>💰</span>
              <h3>항목을 추가하여 견적서를 작성해보세요</h3>
              <p>공종별 항목과 단가를 입력하면 자동으로<br/>견적서가 생성됩니다</p>
              <button
                className={styles.emptyBtn}
                onClick={() => {
                  resetForm()
                  setShowAddModal(true)
                }}
              >
                + 첫 항목 추가하기
              </button>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className={styles.categoryGroup}>
                <div className={styles.categoryHeader}>
                  <h2>{getCategoryName(category)}</h2>
                  <span className={styles.categoryTotal}>
                    {formatAmount(categoryItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0))}
                  </span>
                </div>

                <div className={styles.itemsTable}>
                  <div className={styles.tableHeader}>
                    <span>항목명</span>
                    <span>규격</span>
                    <span>단위</span>
                    <span>수량</span>
                    <span>단가</span>
                    <span>금액</span>
                    <span></span>
                  </div>

                  {categoryItems.map(item => (
                    <div key={item.id} className={styles.tableRow}>
                      <span className={styles.itemName}>{item.item_name}</span>
                      <span className={styles.spec}>{item.specification || '-'}</span>
                      <span>{getUnitName(item.unit)}</span>
                      <span>{item.quantity}</span>
                      <span>{formatAmount(item.unit_price)}</span>
                      <span className={styles.amount}>{formatAmount(item.quantity * item.unit_price)}</span>
                      <span className={styles.rowActions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => openEditModal(item)}
                        >
                          수정
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(item.id)}
                        >
                          삭제
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingItem ? '항목 수정' : '항목 추가'}</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>분류</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {QUOTE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>항목명 *</label>
                <input
                  type="text"
                  value={formData.item_name}
                  onChange={e => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                  placeholder="예: 벽체 철거"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>규격</label>
                <input
                  type="text"
                  value={formData.specification}
                  onChange={e => setFormData(prev => ({ ...prev, specification: e.target.value }))}
                  placeholder="예: 10㎡ 이내"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>단위</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  >
                    {UNITS.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>수량 *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                    min="0"
                    step="0.1"
                    placeholder="수량 입력"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>단가 (원) *</label>
                  <input
                    type="number"
                    value={formData.unit_price}
                    onChange={e => setFormData(prev => ({ ...prev, unit_price: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                    min="0"
                    step="1000"
                    placeholder="금액 입력"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>금액</label>
                <div className={styles.calculatedAmount}>
                  {formatAmount(Number(formData.quantity) * Number(formData.unit_price))}
                </div>
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
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowAddModal(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={editingItem ? handleUpdate : handleAdd}
                  disabled={saving || !formData.item_name}
                >
                  {saving ? '저장 중...' : editingItem ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
