'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

interface Plan {
  id: string
  name: string
  price: number
  features: string[]
  recommended?: boolean
  badge?: string
}

interface CardInfo {
  id: string
  brand: string
  last4: string
  expiry: string
  holderName: string
}

interface PaymentRecord {
  id: string
  date: string
  plan: string
  amount: number
  status: '완료' | '실패' | '환불'
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '현장 3개',
      '기본 진단 기능',
      '견적서 생성',
      '이메일 지원',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49000,
    recommended: true,
    badge: '가장 인기',
    features: [
      '현장 무제한',
      '고급 비용분석',
      '변경관리 기능',
      '증빙 패키지 생성',
      'AI 리스크 예측',
      '우선 이메일 지원',
      '팀 협업 기능',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 149000,
    badge: '대형 현장',
    features: [
      'Pro 플랜 전체 기능',
      '현장 소장 전용 담당자',
      'API 액세스',
      '맞춤 리포트',
      '온보딩 지원',
      'SLA 보장 (99.9%)',
      '전화 지원',
    ],
  },
]

const CARD_BRANDS: Record<string, string> = {
  '4': 'VISA',
  '5': 'Mastercard',
  '3': 'Amex',
  '9': '국민카드',
  '6': '신한카드',
  '7': '하나카드',
  '8': '우리카드',
}

function detectBrand(number: string): string {
  return CARD_BRANDS[number[0]] ?? '카드'
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

export default function PaymentPage() {
  const toast = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  // 카드 관리
  const [cards, setCards] = useState<CardInfo[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [showCardModal, setShowCardModal] = useState(false)
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvc: '', name: '' })
  const [addingCard, setAddingCard] = useState(false)

  // 결제 모달
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [paying, setPaying] = useState(false)
  const [paymentDone, setPaymentDone] = useState(false)

  // 결제 내역 (UI 전용 mock)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])

  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('subscription_plan')
          .eq('user_id', user.id)
          .maybeSingle()
        if (settings?.subscription_plan) setCurrentPlan(settings.subscription_plan)
      }
    } catch (err) {
      console.error('Error loading subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  const getPrice = (plan: Plan) =>
    billingCycle === 'yearly' ? Math.round(plan.price * 0.8) : plan.price

  const formatPrice = (plan: Plan) => {
    if (plan.price === 0) return '무료'
    const p = getPrice(plan)
    return `${p.toLocaleString()}원/월`
  }

  // 플랜 선택 → 결제 모달 오픈
  const handleSelectPlan = (plan: Plan) => {
    if (plan.id === currentPlan) return
    if (plan.id === 'free') {
      handleDowngrade()
      return
    }
    setSelectedPlan(plan)
    setPaymentDone(false)
    setShowPaymentModal(true)
  }

  const handleDowngrade = async () => {
    if (!confirm('Free 플랜으로 다운그레이드 하시겠습니까?\n유료 기능 접근이 제한됩니다.')) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.warning('로그인이 필요합니다.'); return }
      const { error } = await supabase
        .from('user_settings')
        .update({ subscription_plan: 'free' })
        .eq('user_id', user.id)
      if (error) throw error
      setCurrentPlan('free')
      toast.success('Free 플랜으로 변경되었습니다.')
    } catch (err: any) {
      toast.error(`플랜 변경 오류: ${err?.message}`)
    }
  }

  // 카드 등록 (UI 전용)
  const handleAddCard = async () => {
    const digits = cardForm.number.replace(/\s/g, '')
    if (digits.length < 16) { toast.warning('카드 번호 16자리를 입력해주세요.'); return }
    if (cardForm.expiry.length < 5) { toast.warning('유효기간을 입력해주세요. (MM/YY)'); return }
    if (cardForm.cvc.length < 3) { toast.warning('CVC 3자리를 입력해주세요.'); return }
    if (!cardForm.name.trim()) { toast.warning('카드 소유자명을 입력해주세요.'); return }

    setAddingCard(true)
    await new Promise(r => setTimeout(r, 1200))

    const newCard: CardInfo = {
      id: `card-${Date.now()}`,
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      expiry: cardForm.expiry,
      holderName: cardForm.name,
    }
    setCards(prev => [...prev, newCard])
    setSelectedCardId(newCard.id)
    setCardForm({ number: '', expiry: '', cvc: '', name: '' })
    setAddingCard(false)
    setShowCardModal(false)
    toast.success('카드가 등록되었습니다.')
  }

  // 결제 실행 (UI 전용 시뮬레이션)
  const handlePay = async () => {
    if (!selectedPlan) return
    if (cards.length === 0) {
      toast.warning('결제 수단을 먼저 등록해주세요.')
      return
    }
    if (!selectedCardId) {
      toast.warning('결제할 카드를 선택해주세요.')
      return
    }

    setPaying(true)
    await new Promise(r => setTimeout(r, 2000))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { error } = await supabase
        .from('user_settings')
        .update({ subscription_plan: selectedPlan.id })
        .eq('user_id', user.id)
      if (error) throw error

      setCurrentPlan(selectedPlan.id)
      setPaymentDone(true)

      const card = cards.find(c => c.id === selectedCardId)
      setPaymentHistory(prev => [{
        id: `pay-${Date.now()}`,
        date: new Date().toLocaleDateString('ko-KR'),
        plan: selectedPlan.name,
        amount: getPrice(selectedPlan),
        status: '완료',
      }, ...prev])

      toast.success(`${selectedPlan.name} 플랜 구독이 시작되었습니다! (${card?.brand} ${card?.last4})`)
    } catch (err: any) {
      toast.error(`결제 오류: ${err?.message}`)
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>구독 정보를 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>결제 및 구독</h1>
        <p className={styles.subtitle}>플랜을 선택하고 Check-In의 모든 기능을 활용하세요</p>
      </header>

      <main className={styles.main}>

        {/* 현재 플랜 배너 */}
        <div className={styles.currentPlanBanner}>
          <span className={styles.bannerIcon}>
            {currentPlan === 'free' ? '🆓' : currentPlan === 'pro' ? '⭐' : '🏆'}
          </span>
          <div>
            <strong>현재 플랜: {PLANS.find(p => p.id === currentPlan)?.name ?? currentPlan}</strong>
            {currentPlan !== 'free' && (
              <span className={styles.bannerSub}> · {billingCycle === 'yearly' ? '연간' : '월간'} 구독 중</span>
            )}
          </div>
        </div>

        {/* Billing Toggle */}
        <section className={styles.billingToggle}>
          <button
            className={`${styles.toggleBtn} ${billingCycle === 'monthly' ? styles.active : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >월간 결제</button>
          <button
            className={`${styles.toggleBtn} ${billingCycle === 'yearly' ? styles.active : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            연간 결제
            <span className={styles.discount}>20% 할인</span>
          </button>
        </section>

        {/* Plans */}
        <section className={styles.plansGrid}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`${styles.planCard} ${plan.recommended ? styles.recommended : ''} ${currentPlan === plan.id ? styles.current : ''}`}
            >
              {plan.badge && (
                <span className={`${styles.planBadge} ${plan.recommended ? styles.planBadgeHot : ''}`}>
                  {plan.badge}
                </span>
              )}
              {currentPlan === plan.id && (
                <span className={styles.currentBadge}>✓ 현재 플랜</span>
              )}

              <h2 className={styles.planName}>{plan.name}</h2>
              <div className={styles.planPrice}>
                <span className={styles.price}>{formatPrice(plan)}</span>
                {billingCycle === 'yearly' && plan.price > 0 && (
                  <span className={styles.originalPrice}>
                    {plan.price.toLocaleString()}원/월
                  </span>
                )}
                {billingCycle === 'yearly' && plan.price > 0 && (
                  <span className={styles.yearlySave}>
                    연 {(plan.price * 12 - getPrice(plan) * 12).toLocaleString()}원 절약
                  </span>
                )}
              </div>

              <ul className={styles.features}>
                {plan.features.map((f, i) => (
                  <li key={i}>
                    <span className={styles.checkIcon}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`${styles.selectBtn} ${currentPlan === plan.id ? styles.currentBtn : ''}`}
                onClick={() => handleSelectPlan(plan)}
                disabled={currentPlan === plan.id}
              >
                {currentPlan === plan.id
                  ? '사용 중'
                  : plan.price === 0
                    ? '다운그레이드'
                    : '구독하기'}
              </button>
            </div>
          ))}
        </section>

        {/* 결제 수단 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>결제 수단</h2>
            <button className={styles.addBtn} onClick={() => setShowCardModal(true)}>
              + 카드 추가
            </button>
          </div>
          <div className={styles.card}>
            {cards.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>💳</span>
                <p>등록된 결제 수단이 없습니다.</p>
                <button className={styles.addCardBtn} onClick={() => setShowCardModal(true)}>
                  + 카드 추가하기
                </button>
              </div>
            ) : (
              <div className={styles.cardList}>
                {cards.map(c => (
                  <div
                    key={c.id}
                    className={`${styles.cardItem} ${selectedCardId === c.id ? styles.cardSelected : ''}`}
                    onClick={() => setSelectedCardId(c.id)}
                  >
                    <div className={styles.cardVisual}>
                      <span className={styles.cardBrand}>{c.brand}</span>
                    </div>
                    <div className={styles.cardInfo}>
                      <span className={styles.cardNumber}>•••• •••• •••• {c.last4}</span>
                      <span className={styles.cardMeta}>{c.holderName} · {c.expiry}</span>
                    </div>
                    {selectedCardId === c.id && <span className={styles.cardCheck}>✓</span>}
                    <button
                      className={styles.cardRemove}
                      onClick={e => {
                        e.stopPropagation()
                        setCards(prev => prev.filter(x => x.id !== c.id))
                        if (selectedCardId === c.id) setSelectedCardId('')
                        toast.info('카드가 삭제되었습니다.')
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 결제 내역 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>결제 내역</h2>
          <div className={styles.card}>
            {paymentHistory.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📋</span>
                <p>결제 내역이 없습니다.</p>
              </div>
            ) : (
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>플랜</th>
                    <th>금액</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map(h => (
                    <tr key={h.id}>
                      <td>{h.date}</td>
                      <td>{h.plan}</td>
                      <td>{h.amount.toLocaleString()}원</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status${h.status}`]}`}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* 문의 */}
        <section className={styles.contactSection}>
          <div className={styles.contactCard}>
            <span className={styles.contactIcon}>💬</span>
            <div>
              <h3>결제 문의</h3>
              <p>결제 관련 문의사항이 있으시면 언제든 연락주세요.</p>
            </div>
            <button className={styles.contactBtn}>문의하기</button>
          </div>
        </section>
      </main>

      {/* 카드 등록 모달 */}
      {showCardModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCardModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>카드 등록</h2>
              <button onClick={() => setShowCardModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.securityBadge}>
                🔒 SSL 보안 암호화로 안전하게 처리됩니다
              </div>

              {/* 카드 미리보기 */}
              <div className={styles.cardPreview}>
                <div className={styles.cardPreviewChip} />
                <div className={styles.cardPreviewNumber}>
                  {cardForm.number
                    ? cardForm.number.padEnd(19, '•').slice(0, 19)
                    : '•••• •••• •••• ••••'}
                </div>
                <div className={styles.cardPreviewBottom}>
                  <span>{cardForm.name || '카드 소유자'}</span>
                  <span>{cardForm.expiry || 'MM/YY'}</span>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>카드 번호 *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={cardForm.number}
                  onChange={e => setCardForm(p => ({ ...p, number: formatCardNumber(e.target.value) }))}
                  maxLength={19}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>유효기간 *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={cardForm.expiry}
                    onChange={e => setCardForm(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                    maxLength={5}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>CVC *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    value={cardForm.cvc}
                    onChange={e => setCardForm(p => ({ ...p, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    maxLength={4}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>카드 소유자명 *</label>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={cardForm.name}
                  onChange={e => setCardForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setShowCardModal(false)}>취소</button>
                <button
                  className={styles.submitBtn}
                  onClick={handleAddCard}
                  disabled={addingCard}
                >
                  {addingCard ? (
                    <><span className={styles.btnSpinner} /> 등록 중...</>
                  ) : '카드 등록'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 결제 모달 */}
      {showPaymentModal && selectedPlan && (
        <div className={styles.modalOverlay} onClick={() => !paying && !paymentDone && setShowPaymentModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            {paymentDone ? (
              /* 결제 성공 화면 */
              <div className={styles.paySuccess}>
                <div className={styles.paySuccessIcon}>✅</div>
                <h2>결제가 완료되었습니다!</h2>
                <p><strong>{selectedPlan.name} 플랜</strong> 구독이 시작되었습니다.</p>
                <p className={styles.paySuccessAmount}>
                  {getPrice(selectedPlan).toLocaleString()}원 / 월
                </p>
                <button className={styles.submitBtn} onClick={() => setShowPaymentModal(false)}>
                  확인
                </button>
              </div>
            ) : (
              <>
                <div className={styles.modalHeader}>
                  <h2>결제하기</h2>
                  <button onClick={() => setShowPaymentModal(false)}>✕</button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.securityBadge}>
                    🔒 SSL 보안 암호화로 안전하게 처리됩니다
                  </div>

                  {/* 주문 요약 */}
                  <div className={styles.orderSummary}>
                    <div className={styles.orderRow}>
                      <span>플랜</span>
                      <strong>{selectedPlan.name}</strong>
                    </div>
                    <div className={styles.orderRow}>
                      <span>결제 주기</span>
                      <strong>{billingCycle === 'yearly' ? '연간' : '월간'}</strong>
                    </div>
                    <div className={`${styles.orderRow} ${styles.orderTotal}`}>
                      <span>결제 금액</span>
                      <strong className={styles.orderPrice}>
                        {getPrice(selectedPlan).toLocaleString()}원/월
                      </strong>
                    </div>
                    {billingCycle === 'yearly' && (
                      <div className={styles.orderSave}>
                        연간 {(selectedPlan.price * 0.2 * 12).toLocaleString()}원 절약
                      </div>
                    )}
                  </div>

                  {/* 카드 선택 */}
                  <div className={styles.payCardSection}>
                    <div className={styles.payCardHeader}>
                      <label>결제 수단</label>
                      <button
                        className={styles.addCardSmall}
                        onClick={() => { setShowPaymentModal(false); setShowCardModal(true) }}
                      >
                        + 카드 추가
                      </button>
                    </div>
                    {cards.length === 0 ? (
                      <div className={styles.noCard}>
                        <span>등록된 카드가 없습니다.</span>
                        <button
                          className={styles.addCardSmall}
                          onClick={() => { setShowPaymentModal(false); setShowCardModal(true) }}
                        >
                          카드 등록하기
                        </button>
                      </div>
                    ) : (
                      <div className={styles.cardList}>
                        {cards.map(c => (
                          <div
                            key={c.id}
                            className={`${styles.cardItem} ${selectedCardId === c.id ? styles.cardSelected : ''}`}
                            onClick={() => setSelectedCardId(c.id)}
                          >
                            <div className={styles.cardVisual}>
                              <span className={styles.cardBrand}>{c.brand}</span>
                            </div>
                            <div className={styles.cardInfo}>
                              <span className={styles.cardNumber}>•••• {c.last4}</span>
                              <span className={styles.cardMeta}>{c.holderName}</span>
                            </div>
                            {selectedCardId === c.id && <span className={styles.cardCheck}>✓</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.payNotice}>
                    구독은 매월 자동으로 갱신되며, 언제든지 취소할 수 있습니다.
                  </div>

                  <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={() => setShowPaymentModal(false)}>
                      취소
                    </button>
                    <button
                      className={styles.submitBtn}
                      onClick={handlePay}
                      disabled={paying || cards.length === 0}
                    >
                      {paying ? (
                        <><span className={styles.btnSpinner} /> 결제 처리 중...</>
                      ) : `${getPrice(selectedPlan).toLocaleString()}원 결제하기`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
