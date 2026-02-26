'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { QuoteLineItem, QuoteSummary } from '@/types/quote'
import { QUOTE_CATEGORIES, UNITS } from '@/types/quote'
import type { QuoteAnalysisResult } from '@/lib/ai/quote-analyzer'
import QuickActions from '@/components/ui/QuickActions'
import PdfDownloadButton from '@/components/pdf/PdfDownloadButton'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

export default function SOWPage() {
  const toast = useToast()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [items, setItems] = useState<QuoteLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<QuoteLineItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<QuoteAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

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

  // AI 견적 분석
  const handleAnalyze = async () => {
    if (items.length === 0) {
      toast.warning('견적 항목을 먼저 추가해주세요.')
      return
    }
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const res = await fetch('/api/ai/quote-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI 분석 실패')
      setAnalysisResult(data.analysis)
    } catch (err: any) {
      setAnalysisError(err.message || 'AI 분석 중 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  // 하자담보 안내서 PDF
  const handleExportWarranty = useCallback(async () => {
    const { exportWarrantyPdf } = await import('@/lib/pdf/warranty-pdf')
    const { WARRANTY_STANDARDS } = await import('@/lib/pdf/warranty-pdf')

    // 견적 카테고리 → 하자담보 매핑
    const categoryMap: Record<string, { months: number; law: string }> = {
      demolition:  { months: 120, law: '건산법 제28조 제3항 (구조물 10년)' },
      electrical:  { months: 36,  law: '건산법 제28조 제2항 (설비 3년)' },
      plumbing:    { months: 36,  law: '건산법 제28조 제2항 (설비 3년)' },
      carpentry:   { months: 12,  law: '건산법 제28조 제1항 (마감 1년)' },
      tile:        { months: 12,  law: '건산법 제28조 제1항 (마감 1년)' },
      paint:       { months: 12,  law: '건산법 제28조 제1항 (마감 1년)' },
      wallpaper:   { months: 12,  law: '건산법 제28조 제1항 (마감 1년)' },
      flooring:    { months: 12,  law: '건산법 제28조 제1항 (마감 1년)' },
      furniture:   { months: 12,  law: '건산법 제28조 제1항 (마감 1년)' },
      other:       { months: 12,  law: '건산법 제28조 제1항 (마감 1년)' },
    }

    const today = new Date().toISOString().split('T')[0]
    // 카테고리별 대표 항목 하나씩만 추출
    const seen = new Set<string>()
    const warrantyItems = items
      .filter(i => { if (seen.has(i.category)) return false; seen.add(i.category); return true })
      .map(i => {
        const { months, law } = categoryMap[i.category] ?? { months: 12, law: '건산법 제28조 제1항' }
        const expiry = new Date(today)
        expiry.setMonth(expiry.getMonth() + months)
        const expiryStr = expiry.toISOString().split('T')[0]
        const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000)
        return {
          processName: getCategoryName(i.category),
          completedDate: today,
          warrantyMonths: months,
          expiryDate: expiryStr,
          legalBasis: law,
          status: daysLeft <= 90 ? 'expiring_soon' as const : 'active' as const,
          daysLeft,
        }
      })

    const projectRes = await supabase.from('projects').select('name').eq('id', projectId).single()
    const name = (projectRes.data as any)?.name ?? `Project-${projectId}`

    await exportWarrantyPdf(warrantyItems, name)
  }, [items, projectId, supabase])

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
      toast.error(`항목 추가 오류: ${err?.message || JSON.stringify(err)}`)
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
      toast.error(`항목 수정 오류: ${err?.message || JSON.stringify(err)}`)
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
      toast.error(`삭제 오류: ${err?.message || JSON.stringify(err)}`)
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
          <button
            className={styles.addBtn}
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}
            onClick={() => {
              const btn = document.querySelector('[aria-label="AI 비서 체키"]') as HTMLButtonElement
              if (btn) btn.click()
            }}
          >
            ⚡ AI 표준 견적
          </button>
          <button
            className={styles.addBtn}
            style={{ background: analyzing ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)', cursor: analyzing ? 'not-allowed' : 'pointer' }}
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? '분석 중...' : '🔍 AI 견적 분석'}
          </button>
          {items.length > 0 && (
            <PdfDownloadButton
              onExport={handleExportWarranty}
              label="하자담보 안내서 PDF"
              variant="secondary"
              size="sm"
            />
          )}
        </section>

        {/* AI Quick Actions */}
        <QuickActions
          compact
          actions={[
            { icon: '💰', label: 'AI 자동 견적', description: '표준 견적 자동 생성', message: '표준 견적 자동으로 생성해줘' },
            { icon: '📊', label: '등급별 비교', description: '이코노미/스탠다드/프리미엄', message: '이코노미/스탠다드/프리미엄 견적 비교해줘' },
            { icon: '📄', label: 'PDF 내보내기', description: '견적서 PDF 다운로드', message: '견적서 PDF로 내보내줘' },
          ]}
        />

        {/* AI 견적 분석 결과 */}
        {analysisError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
            ❌ {analysisError}
          </div>
        )}

        {analysisResult && (
          <section style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                🔍 AI 견적 분석 결과
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: 20,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: analysisResult.overall_risk === 'HIGH' ? '#fef2f2'
                    : analysisResult.overall_risk === 'MEDIUM' ? '#fffbeb' : '#f0fdf4',
                  color: analysisResult.overall_risk === 'HIGH' ? '#dc2626'
                    : analysisResult.overall_risk === 'MEDIUM' ? '#d97706' : '#059669',
                }}>
                  {analysisResult.overall_risk === 'HIGH' ? '🚨 고위험' : analysisResult.overall_risk === 'MEDIUM' ? '⚠️ 주의' : '✅ 정상'}
                </span>
                <button
                  onClick={() => setAnalysisResult(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* AI 코멘트 */}
            {analysisResult.ai_comment && (
              <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, background: '#f8f9fa', borderRadius: 8, padding: '0.75rem 1rem' }}>
                {analysisResult.ai_comment}
              </p>
            )}

            {/* 과다청구 항목 */}
            {analysisResult.overcharge_items.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#dc2626' }}>
                  📈 과다청구 의심 항목 ({analysisResult.overcharge_items.length}건)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {analysisResult.overcharge_items.map((item, i) => (
                    <div key={i} style={{
                      background: item.risk_level === 'HIGH' ? '#fef2f2' : item.risk_level === 'MEDIUM' ? '#fffbeb' : '#f0fdf4',
                      border: `1px solid ${item.risk_level === 'HIGH' ? '#fecaca' : item.risk_level === 'MEDIUM' ? '#fed7aa' : '#bbf7d0'}`,
                      borderRadius: 10,
                      padding: '0.75rem 1rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{item.item_name}</strong>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 700,
                          color: item.risk_level === 'HIGH' ? '#dc2626' : item.risk_level === 'MEDIUM' ? '#d97706' : '#059669',
                        }}>
                          +{item.difference_pct}% 초과
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>{item.message}</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
                        견적 단가: <strong>{item.quoted_price.toLocaleString()}원/{item.unit}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 과소청구 항목 */}
            {analysisResult.undercharge_items.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#7c3aed' }}>
                  📉 품질 의심 항목 ({analysisResult.undercharge_items.length}건)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {analysisResult.undercharge_items.map((item, i) => (
                    <div key={i} style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>{item.item_name}</strong>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>
                          {item.difference_pct}% 시세 미달
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>{item.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 이상 없음 */}
            {analysisResult.overcharge_items.length === 0 && analysisResult.undercharge_items.length === 0 && (
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#059669', textAlign: 'center', padding: '0.5rem' }}>
                ✅ 모든 항목이 시장 단가 범위 내에 있습니다.
              </p>
            )}
          </section>
        )}

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
