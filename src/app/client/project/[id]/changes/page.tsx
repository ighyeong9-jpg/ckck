'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SignaturePad from '@/components/signature/SignaturePad'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

interface ChangeOrder {
  id: string
  title: string
  reason: string | null
  change_type: string
  cost_change: number
  status: string
  requested_at: string
  notes: string | null
}

export default function ClientChangesPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const projectId = params.id as string
  const supabase = createClient()

  const [changes, setChanges] = useState<ChangeOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState<ChangeOrder | null>(null)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    loadChanges()
  }, [projectId])

  const loadChanges = async () => {
    try {
      const { data } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('requested_at', { ascending: false })

      if (data) setChanges(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async (signature: string) => {
    if (!signing || signature === '') return
    setApproving(true)

    try {
      const { error } = await supabase
        .from('change_orders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', signing.id)

      if (error) throw error

      setChanges((prev) =>
        prev.map((c) => (c.id === signing.id ? { ...c, status: 'approved' } : c))
      )
      setSigning(null)
      toast.success('변경사항을 승인했습니다.')
    } catch (err: any) {
      toast.error(`승인 오류: ${err?.message}`)
    } finally {
      setApproving(false)
    }
  }

  const formatAmount = (amount: number) => {
    const prefix = amount > 0 ? '+' : ''
    return `${prefix}${amount.toLocaleString()}원`
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
        <h1 className={styles.title}>변경사항</h1>
      </header>

      <div className={styles.changesList}>
        {changes.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📝</div>
            <p>변경사항이 없습니다</p>
          </div>
        ) : (
          changes.map((change) => (
            <div key={change.id} className={styles.changeCard}>
              <div className={styles.changeHeader}>
                <h3 className={styles.changeTitle}>{change.title}</h3>
                <span
                  className={`${styles.statusBadge} ${styles[change.status]}`}
                >
                  {change.status === 'approved'
                    ? '✅ 승인'
                    : change.status === 'rejected'
                    ? '❌ 거절'
                    : '⏳ 대기'}
                </span>
              </div>

              {change.reason && (
                <p className={styles.changeReason}>{change.reason}</p>
              )}

              <div className={styles.changeMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>비용 변경</span>
                  <span
                    className={styles.metaValue}
                    style={{ color: change.cost_change > 0 ? '#ef4444' : '#10b981' }}
                  >
                    {formatAmount(change.cost_change)}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>요청일</span>
                  <span className={styles.metaValue}>
                    {new Date(change.requested_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>

              {change.notes && (
                <p className={styles.changeNotes}>비고: {change.notes}</p>
              )}

              {change.status === 'requested' && (
                <div className={styles.changeActions}>
                  <button
                    className={styles.approveBtn}
                    onClick={() => setSigning(change)}
                  >
                    서명하여 승인
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {signing && (
        <div className={styles.signatureModal}>
          <div className={styles.modalOverlay} onClick={() => setSigning(null)} />
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>변경사항 승인 서명</h2>
            <p className={styles.modalDesc}>
              아래 내용에 동의하고 서명하시면 변경사항이 승인됩니다.
            </p>

            <div className={styles.confirmBox}>
              <p>
                <strong>{signing.title}</strong>
              </p>
              <p>비용 변경: {formatAmount(signing.cost_change)}</p>
            </div>

            <SignaturePad
              partyName="고객"
              onSign={handleSign}
              onCancel={() => setSigning(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
