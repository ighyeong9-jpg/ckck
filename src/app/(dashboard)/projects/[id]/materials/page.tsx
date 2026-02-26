'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Material, MaterialStatus } from '@/types/material'
import { MATERIAL_STATUS, MATERIAL_CATEGORIES } from '@/types/material'
import QuickActions from '@/components/ui/QuickActions'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

export default function MaterialsPage() {
  const toast = useToast()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')

  const [formData, setFormData] = useState({
    name: '',
    category: 'wood',
    unit: '개',
    quantity: '' as string | number,
    unit_price: '' as string | number,
    supplier: '',
    status: 'pending',
    expected_date: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setMaterials(data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'wood',
      unit: '개',
      quantity: '',
      unit_price: '',
      supplier: '',
      status: 'pending',
      expected_date: '',
      notes: '',
    })
    setEditingMaterial(null)
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      const totalPrice = Number(formData.quantity || 0) * Number(formData.unit_price || 0)

      const { data, error } = await supabase
        .from('materials')
        .insert([{
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          supplier: formData.supplier || null,
          status: formData.status,
          notes: formData.notes || null,
          expected_date: formData.expected_date || null,
          project_id: projectId,
          quantity: Number(formData.quantity) || 0,
          unit_price: Number(formData.unit_price) || 0,
          total_price: totalPrice,
        }])
        .select()
        .single()

      if (error) throw error

      setMaterials(prev => [data, ...prev])
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      toast.error(`추가 오류: ${err?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingMaterial) return
    setSaving(true)
    try {
      const totalPrice = Number(formData.quantity || 0) * Number(formData.unit_price || 0)

      const { error } = await supabase
        .from('materials')
        .update({
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          supplier: formData.supplier || null,
          status: formData.status,
          notes: formData.notes || null,
          expected_date: formData.expected_date || null,
          quantity: Number(formData.quantity) || 0,
          unit_price: Number(formData.unit_price) || 0,
          total_price: totalPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingMaterial.id)

      if (error) throw error

      setMaterials(prev => prev.map(m =>
        m.id === editingMaterial.id
          ? {
              ...m,
              name: formData.name,
              category: formData.category,
              unit: formData.unit,
              supplier: formData.supplier || null,
              status: formData.status as MaterialStatus,
              notes: formData.notes || null,
              expected_date: formData.expected_date || null,
              quantity: Number(formData.quantity) || 0,
              unit_price: Number(formData.unit_price) || 0,
              total_price: totalPrice
            }
          : m
      ))
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      toast.error(`수정 오류: ${err?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 자재를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase.from('materials').delete().eq('id', id)
      if (error) throw error
      setMaterials(prev => prev.filter(m => m.id !== id))
    } catch (err: any) {
      toast.error(`삭제 오류: ${err?.message}`)
    }
  }

  const openEditModal = (material: Material) => {
    setFormData({
      name: material.name,
      category: material.category,
      unit: material.unit,
      quantity: material.quantity,
      unit_price: material.unit_price,
      supplier: material.supplier || '',
      status: material.status,
      expected_date: material.expected_date || '',
      notes: material.notes || '',
    })
    setEditingMaterial(material)
    setShowModal(true)
  }

  const updateStatus = async (material: Material, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('materials')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', material.id)

      if (error) throw error

      setMaterials(prev => prev.map(m =>
        m.id === material.id ? { ...m, status: newStatus as any } : m
      ))
    } catch (err: any) {
      toast.error(`상태 변경 오류: ${err?.message}`)
    }
  }

  const getCategoryInfo = (category: string) => MATERIAL_CATEGORIES.find(c => c.id === category)
  const getStatusInfo = (status: string) => MATERIAL_STATUS.find(s => s.id === status)

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()}원`
  }

  // 통계 계산
  const filteredMaterials = filterCategory === 'all'
    ? materials
    : materials.filter(m => m.category === filterCategory)

  const totalMaterials = materials.length
  const totalCost = materials.reduce((sum, m) => sum + (m.quantity * m.unit_price), 0)
  const deliveredCount = materials.filter(m => m.status === 'delivered').length
  const pendingCount = materials.filter(m => m.status === 'ordered' || m.status === 'shipped').length

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
          { icon: '📦', label: '재고 현황', description: '자재 재고 조회', message: '자재 재고 현황 알려줘' },
          { icon: '💰', label: '자재비 분석', description: '자재비 현황 분석', message: '자재비 현황 알려줘' },
          { icon: '🛒', label: '발주 안내', description: '부족 자재 발주', message: '부족한 자재 발주해줘' },
        ]} />

        {/* Stats Overview */}
        <section className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>📦</span>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{totalMaterials}</span>
              <span className={styles.statLabel}>총 자재</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>💰</span>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{formatCurrency(totalCost)}</span>
              <span className={styles.statLabel}>총 비용</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>✅</span>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{deliveredCount}</span>
              <span className={styles.statLabel}>입고 완료</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>⏳</span>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{pendingCount}</span>
              <span className={styles.statLabel}>대기/발주중</span>
            </div>
          </div>
        </section>

        {/* Filters & Actions */}
        <section className={styles.actions}>
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filterCategory === 'all' ? styles.active : ''}`}
              onClick={() => setFilterCategory('all')}
            >
              전체
            </button>
            {MATERIAL_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`${styles.filterBtn} ${filterCategory === cat.id ? styles.active : ''}`}
                onClick={() => setFilterCategory(cat.id)}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
          <button
            className={styles.addBtn}
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
          >
            + 자재 추가
          </button>
        </section>

        {/* Materials List */}
        <section className={styles.materialsList}>
          {filteredMaterials.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📦</span>
              <h3>등록된 자재가 없습니다</h3>
              <p>자재를 등록하면 입고/출고 현황을<br/>실시간으로 추적할 수 있습니다</p>
            </div>
          ) : (
            filteredMaterials.map(material => {
              const categoryInfo = getCategoryInfo(material.category)
              const statusInfo = getStatusInfo(material.status)
              const totalPrice = material.quantity * material.unit_price
              return (
                <div key={material.id} className={styles.materialCard}>
                  <div className={styles.materialIcon}>{categoryInfo?.icon}</div>
                  <div className={styles.materialInfo}>
                    <h3>{material.name}</h3>
                    <p className={styles.category}>{categoryInfo?.name}</p>
                    {material.supplier && <span className={styles.supplier}>🏭 {material.supplier}</span>}
                  </div>
                  <div className={styles.materialQty}>
                    <span className={styles.qtyValue}>{material.quantity} {material.unit}</span>
                    <span className={styles.qtyLabel}>× {formatCurrency(material.unit_price)}</span>
                  </div>
                  <div className={styles.materialPrice}>
                    <span className={styles.priceValue}>{formatCurrency(totalPrice)}</span>
                  </div>
                  <select
                    className={styles.statusSelect}
                    value={material.status}
                    onChange={(e) => updateStatus(material, e.target.value)}
                    style={{ backgroundColor: statusInfo?.color || '#e5e7eb' }}
                  >
                    {MATERIAL_STATUS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className={styles.materialActions}>
                    <button onClick={() => openEditModal(material)}>수정</button>
                    <button onClick={() => handleDelete(material.id)}>삭제</button>
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
              <h2>{editingMaterial ? '자재 수정' : '자재 추가'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>자재명 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="합판 12mm"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>분류</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {MATERIAL_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>수량</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder="수량 입력"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>단위</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="개, 장, m, kg"
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>단가 (원)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unit_price}
                    onChange={e => setFormData(prev => ({ ...prev, unit_price: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder="금액 입력"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>합계</label>
                  <div className={styles.calculatedTotal}>
                    {formatCurrency(Number(formData.quantity) * Number(formData.unit_price))}
                  </div>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>공급업체</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="○○자재상"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>상태</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    {MATERIAL_STATUS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>입고예정일</label>
                  <input
                    type="date"
                    value={formData.expected_date}
                    onChange={e => setFormData(prev => ({ ...prev, expected_date: e.target.value }))}
                  />
                </div>
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
                  onClick={editingMaterial ? handleUpdate : handleAdd}
                  disabled={saving || !formData.name}
                >
                  {saving ? '저장 중...' : editingMaterial ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
