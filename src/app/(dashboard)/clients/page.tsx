'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Client, ClientType } from '@/types/client'
import { CLIENT_TYPES } from '@/types/client'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

export default function ClientsPage() {
  const toast = useToast()
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    client_type: 'client',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data || [])
    } catch (err) {
      console.error('Error loading clients:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      client_type: 'client',
      phone: '',
      email: '',
      address: '',
      notes: '',
    })
    setEditingClient(null)
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          ...formData,
          user_id: user?.id || 'anonymous',
        }])
        .select()
        .single()

      if (error) throw error

      setClients(prev => [data, ...prev])
      setShowModal(false)
      resetForm()
    } catch (err: any) {
      toast.error(`추가 오류: ${err?.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingClient) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingClient.id)

      if (error) throw error

      setClients(prev => prev.map(c =>
        c.id === editingClient.id ? { ...c, ...formData, client_type: formData.client_type as ClientType } : c
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
    if (!confirm('이 고객을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)

      if (error) throw error
      setClients(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      toast.error(`삭제 오류: ${err?.message}`)
    }
  }

  const openEditModal = (client: Client) => {
    setFormData({
      name: client.name,
      company: client.company || '',
      client_type: client.client_type,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
    })
    setEditingClient(client)
    setShowModal(true)
  }

  const getTypeInfo = (id: string) => CLIENT_TYPES.find(t => t.id === id)

  const filteredClients = filter === 'all'
    ? clients
    : clients.filter(c => c.client_type === filter)

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>고객관리</h1>
        <p className={styles.subtitle}>발주자, 시공사, 자재업체 정보를 관리합니다</p>
      </header>

      <main className={styles.main}>
        {/* Actions */}
        <section className={styles.actions}>
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              전체 ({clients.length})
            </button>
            {CLIENT_TYPES.map(type => (
              <button
                key={type.id}
                className={`${styles.filterBtn} ${filter === type.id ? styles.active : ''}`}
                onClick={() => setFilter(type.id)}
              >
                {type.icon} {type.name} ({clients.filter(c => c.client_type === type.id).length})
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
            + 고객 추가
          </button>
        </section>

        {/* Clients List */}
        <section className={styles.clientsList}>
          {filteredClients.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👥</span>
              <p>등록된 고객이 없습니다.</p>
            </div>
          ) : (
            filteredClients.map(client => {
              const typeInfo = getTypeInfo(client.client_type)
              return (
                <div key={client.id} className={styles.clientCard}>
                  <div className={styles.clientIcon}>{typeInfo?.icon}</div>
                  <div className={styles.clientInfo}>
                    <h3>{client.name}</h3>
                    {client.company && <p className={styles.company}>{client.company}</p>}
                    <div className={styles.contactInfo}>
                      {client.phone && <span>📞 {client.phone}</span>}
                      {client.email && <span>✉️ {client.email}</span>}
                    </div>
                  </div>
                  <span className={styles.typeBadge}>{typeInfo?.name}</span>
                  <div className={styles.clientActions}>
                    <button onClick={() => openEditModal(client)}>수정</button>
                    <button onClick={() => handleDelete(client.id)}>삭제</button>
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
              <h2>{editingClient ? '고객 수정' : '고객 추가'}</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>유형</label>
                  <select
                    value={formData.client_type}
                    onChange={e => setFormData(prev => ({ ...prev, client_type: e.target.value }))}
                  >
                    {CLIENT_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>이름/담당자 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="홍길동"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>회사명</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="(주)회사"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>전화번호</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="010-1234-5678"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>이메일</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>주소</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="서울시 강남구..."
                />
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
                  onClick={editingClient ? handleUpdate : handleAdd}
                  disabled={saving || !formData.name}
                >
                  {saving ? '저장 중...' : editingClient ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
