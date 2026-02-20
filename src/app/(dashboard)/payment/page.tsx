'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.scss'

interface Plan {
  id: string
  name: string
  price: number
  features: string[]
  recommended?: boolean
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
    price: 29000,
    recommended: true,
    features: [
      '현장 무제한',
      '고급 비용분석',
      '변경관리 기능',
      '증빙 패키지 생성',
      '우선 지원',
      '팀 협업 기능',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99000,
    features: [
      'Pro 플랜 전체 기능',
      '전용 지원 담당자',
      'API 액세스',
      '맞춤 리포트',
      '온보딩 지원',
      'SLA 보장',
    ],
  },
]

export default function PaymentPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

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
          .single()

        if (settings?.subscription_plan) {
          setCurrentPlan(settings.subscription_plan)
        }
      }
    } catch (err) {
      console.error('Error loading subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlan) return

    if (planId === 'free') {
      if (!confirm('Free 플랜으로 다운그레이드 하시겠습니까?')) return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('로그인이 필요합니다.')
        return
      }

      // TODO: 실제 결제 연동 (Stripe, Toss Payments 등)
      // 여기서는 시뮬레이션
      if (planId !== 'free') {
        alert(`${PLANS.find(p => p.id === planId)?.name} 플랜 결제 페이지로 이동합니다.`)
        return
      }

      const { error } = await supabase
        .from('user_settings')
        .update({ subscription_plan: planId })
        .eq('user_id', user.id)

      if (error) throw error

      setCurrentPlan(planId)
      alert('플랜이 변경되었습니다.')
    } catch (err: any) {
      alert(`오류: ${err?.message}`)
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return '무료'
    const adjustedPrice = billingCycle === 'yearly' ? Math.round(price * 0.8) : price
    return `${adjustedPrice.toLocaleString()}원/월`
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
      <header className={styles.header}>
        <h1 className={styles.title}>결제 및 구독</h1>
        <p className={styles.subtitle}>플랜을 선택하고 Check-In의 모든 기능을 활용하세요</p>
      </header>

      <main className={styles.main}>
        {/* Billing Toggle */}
        <section className={styles.billingToggle}>
          <button
            className={`${styles.toggleBtn} ${billingCycle === 'monthly' ? styles.active : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            월간 결제
          </button>
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
              {plan.recommended && (
                <span className={styles.recommendedBadge}>추천</span>
              )}
              {currentPlan === plan.id && (
                <span className={styles.currentBadge}>현재 플랜</span>
              )}

              <h2 className={styles.planName}>{plan.name}</h2>
              <div className={styles.planPrice}>
                <span className={styles.price}>{formatPrice(plan.price)}</span>
                {billingCycle === 'yearly' && plan.price > 0 && (
                  <span className={styles.originalPrice}>
                    {plan.price.toLocaleString()}원/월
                  </span>
                )}
              </div>

              <ul className={styles.features}>
                {plan.features.map((feature, idx) => (
                  <li key={idx}>
                    <span className={styles.checkIcon}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={styles.selectBtn}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={currentPlan === plan.id}
              >
                {currentPlan === plan.id ? '사용 중' : plan.price === 0 ? '선택' : '구독하기'}
              </button>
            </div>
          ))}
        </section>

        {/* Payment History */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>결제 내역</h2>
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📋</span>
              <p>결제 내역이 없습니다.</p>
            </div>
          </div>
        </section>

        {/* Payment Methods */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>결제 수단</h2>
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>💳</span>
              <p>등록된 결제 수단이 없습니다.</p>
              <button className={styles.addCardBtn}>+ 카드 추가</button>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className={styles.contactSection}>
          <div className={styles.contactCard}>
            <span className={styles.contactIcon}>💬</span>
            <div>
              <h3>도움이 필요하신가요?</h3>
              <p>결제 관련 문의사항이 있으시면 언제든 연락주세요.</p>
            </div>
            <button className={styles.contactBtn}>문의하기</button>
          </div>
        </section>
      </main>
    </div>
  )
}
