'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AgreementStatus } from '@/types/agreement'
import { PARTIES } from '@/types/agreement'
import SignaturePad from '@/components/signature/SignaturePad'
import { sha256 } from '@/lib/utils/merkleTree'
import styles from './page.module.scss'

export default function AgreementPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agreementId, setAgreementId] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)

  const [parties, setParties] = useState({
    client: { agreed: false, name: '', signedAt: null as string | null },
    contractor: { agreed: false, name: '', signedAt: null as string | null },
    manager: { agreed: false, name: '', signedAt: null as string | null },
  })

  const [content, setContent] = useState('')
  const [notes, setNotes] = useState('')
  const [signingParty, setSigningParty] = useState<'client' | 'contractor' | 'manager' | null>(null)
  const [signatures, setSignatures] = useState<Record<string, string | null>>({
    client: null,
    contractor: null,
    manager: null,
  })

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 견적서 총액
        const { data: quoteItems } = await supabase
          .from('quote_line_items')
          .select('quantity, unit_price')
          .eq('project_id', projectId)

        if (quoteItems && quoteItems.length > 0) {
          const subtotal = quoteItems.reduce(
            (sum, item) => sum + (Number(item.quantity) * item.unit_price),
            0
          )
          const total = Math.round(subtotal * 1.1) // VAT 포함
          setTotalAmount(total)
        }

        // 기존 합의 데이터
        const { data: agreement } = await supabase
          .from('agreements')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle()

        if (agreement) {
          setAgreementId(agreement.id)
          setParties({
            client: {
              agreed: agreement.client_agreed,
              name: agreement.client_name || '',
              signedAt: agreement.client_signed_at,
            },
            contractor: {
              agreed: agreement.contractor_agreed,
              name: agreement.contractor_name || '',
              signedAt: agreement.contractor_signed_at,
            },
            manager: {
              agreed: agreement.manager_agreed,
              name: agreement.manager_name || '',
              signedAt: agreement.manager_signed_at,
            },
          })
          setContent(agreement.agreement_content || '')
          setNotes(agreement.notes || '')
          if (agreement.total_amount > 0) {
            setTotalAmount(agreement.total_amount)
          }
          // Load existing signatures
          setSignatures({
            client: agreement.client_signature || null,
            contractor: agreement.contractor_signature || null,
            manager: agreement.manager_signature || null,
          })
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId])

  // 상태 계산
  const status: AgreementStatus = useMemo(() => {
    const agreedCount = [parties.client.agreed, parties.contractor.agreed, parties.manager.agreed]
      .filter(Boolean).length

    if (agreedCount === 3) return 'completed'
    if (agreedCount > 0) return 'partial'
    return 'pending'
  }, [parties])

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString()}원`
  }

  // 동의 토글
  const toggleAgreement = (partyId: 'client' | 'contractor' | 'manager') => {
    setParties(prev => ({
      ...prev,
      [partyId]: {
        ...prev[partyId],
        agreed: !prev[partyId].agreed,
        signedAt: !prev[partyId].agreed ? new Date().toISOString() : null,
      },
    }))
  }

  // 이름 업데이트
  const updateName = (partyId: 'client' | 'contractor' | 'manager', name: string) => {
    setParties(prev => ({
      ...prev,
      [partyId]: { ...prev[partyId], name },
    }))
  }

  // 서명 처리
  const handleSign = async (partyId: 'client' | 'contractor' | 'manager', dataUrl: string) => {
    if (dataUrl === '') {
      // Cancel signature
      setSignatures(prev => ({ ...prev, [partyId]: null }))
      setParties(prev => ({
        ...prev,
        [partyId]: { ...prev[partyId], agreed: false, signedAt: null },
      }))
    } else {
      const hash = await sha256(dataUrl)
      setSignatures(prev => ({ ...prev, [partyId]: dataUrl }))
      setParties(prev => ({
        ...prev,
        [partyId]: { ...prev[partyId], agreed: true, signedAt: new Date().toISOString() },
      }))
    }
    setSigningParty(null)
  }

  // 저장
  const handleSave = async () => {
    setSaving(true)
    try {
      const allAgreed = parties.client.agreed && parties.contractor.agreed && parties.manager.agreed

      const data = {
        project_id: projectId,
        client_agreed: parties.client.agreed,
        client_name: parties.client.name || null,
        client_signed_at: parties.client.signedAt,
        client_signature: signatures.client || null,
        contractor_agreed: parties.contractor.agreed,
        contractor_name: parties.contractor.name || null,
        contractor_signed_at: parties.contractor.signedAt,
        contractor_signature: signatures.contractor || null,
        manager_agreed: parties.manager.agreed,
        manager_name: parties.manager.name || null,
        manager_signed_at: parties.manager.signedAt,
        manager_signature: signatures.manager || null,
        agreement_content: content || null,
        total_amount: totalAmount,
        notes: notes || null,
        status,
        completed_at: allAgreed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }

      if (agreementId) {
        const { error } = await supabase
          .from('agreements')
          .update(data)
          .eq('id', agreementId)

        if (error) throw error
      } else {
        const { data: newData, error } = await supabase
          .from('agreements')
          .insert([data])
          .select()
          .single()

        if (error) throw error
        setAgreementId(newData.id)
      }

      alert('저장되었습니다.')
    } catch (err: any) {
      console.error('Error saving:', err)
      alert(`저장 오류: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
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
        {/* Status Card */}
        <section className={styles.statusCard}>
          <div className={styles.statusInfo}>
            <span className={styles.statusLabel}>합의 상태</span>
            <span className={`${styles.statusBadge} ${styles[status]}`}>
              {status === 'completed' ? '완료' : status === 'partial' ? '진행중' : '대기'}
            </span>
          </div>
          <div className={styles.totalAmount}>
            <span className={styles.totalLabel}>합의 금액</span>
            <span className={styles.totalValue}>{formatAmount(totalAmount)}</span>
          </div>
        </section>

        {/* Parties Section */}
        <section className={styles.partiesSection}>
          <h2 className={styles.sectionTitle}>당사자 동의</h2>

          <div className={styles.partiesGrid}>
            {PARTIES.map((party) => {
              const partyState = parties[party.id]
              return (
                <div
                  key={party.id}
                  className={`${styles.partyCard} ${partyState.agreed ? styles.agreed : ''}`}
                  style={{ '--party-color': party.color } as React.CSSProperties}
                >
                  <div className={styles.partyHeader}>
                    <span className={styles.partyIcon}>{party.icon}</span>
                    <span className={styles.partyName}>{party.name}</span>
                  </div>

                  <div className={styles.partyBody}>
                    <input
                      type="text"
                      placeholder="성명 입력"
                      value={partyState.name}
                      onChange={(e) => updateName(party.id, e.target.value)}
                      className={styles.nameInput}
                    />

                    {/* 서명 미리보기 */}
                    {signatures[party.id] && (
                      <div className={styles.signaturePreview}>
                        <img src={signatures[party.id]!} alt="서명" />
                      </div>
                    )}

                    <button
                      className={`${styles.signBtn} ${partyState.agreed ? styles.signed : ''}`}
                      onClick={() => setSigningParty(party.id)}
                    >
                      {partyState.agreed ? '✅ 서명 완료' : '✍️ 서명하기'}
                    </button>

                    {partyState.signedAt && (
                      <span className={styles.signedAt}>
                        {new Date(partyState.signedAt).toLocaleString('ko-KR')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Agreement Content */}
        <section className={styles.contentSection}>
          <h2 className={styles.sectionTitle}>합의 내용</h2>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="합의 내용을 입력하세요..."
            rows={6}
          />
        </section>

        {/* Notes */}
        <section className={styles.notesSection}>
          <h2 className={styles.sectionTitle}>비고</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="추가 메모..."
            rows={3}
          />
        </section>

        {/* Actions */}
        <section className={styles.actions}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : '합의 저장'}
          </button>
        </section>

        {/* Completion Message */}
        {status === 'completed' && (
          <section className={styles.completedMessage}>
            <span className={styles.completedIcon}>🎉</span>
            <p>모든 당사자가 서명을 완료하였습니다!</p>
          </section>
        )}
      </main>

      {/* Signature Pad Modal */}
      {signingParty && (
        <div className={styles.signatureOverlay} onClick={() => setSigningParty(null)}>
          <div onClick={e => e.stopPropagation()}>
            <SignaturePad
              partyName={PARTIES.find(p => p.id === signingParty)?.name || ''}
              existingSignature={signatures[signingParty]}
              onSign={(dataUrl) => handleSign(signingParty, dataUrl)}
              onCancel={() => setSigningParty(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
