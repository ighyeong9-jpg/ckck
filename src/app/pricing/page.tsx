'use client'

import { useState } from 'react'

interface Plan {
  id: 'lite' | 'standard' | 'pro'
  name: string
  price: string
  priceNum: number
  period: string
  desc: string
  capacity: string
  features: string[]
  popular?: boolean
  isContact?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'lite',
    name: 'Lite',
    price: '₩30,000',
    priceNum: 30000,
    period: '/ 월',
    desc: '소규모 현장 1개 관리',
    capacity: '5~10인',
    features: [
      '프로젝트 1개',
      '체크리스트 + 출역관리',
      '안전 확인 (12개 법규)',
      'QR 출역 체크인',
      '오프라인 모드',
      '사진 업로드 100장/월',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '₩50,000',
    priceNum: 50000,
    period: '/ 월',
    desc: '전체 기능 + 팀 협업',
    capacity: '10~30인',
    features: [
      '프로젝트 3개',
      'Lite 전체 기능',
      '5종 세트 전체 기능',
      'TBM 연동 체크리스트',
      'PDF 리포트 출력',
      '팀원 30명',
      '사진 업로드 무제한',
    ],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '별도 문의',
    priceNum: 0,
    period: '',
    desc: '다현장 + API + 커스텀',
    capacity: '30인 이상',
    features: [
      '프로젝트 무제한',
      'Standard 전체 기능',
      'AI 법규 비서(체키)',
      '팀원 무제한',
      'API 연동',
      '커스텀 체크리스트',
      '전담 지원',
    ],
    isContact: true,
  },
]

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (plan: Plan) => {
    setSelectedPlan(plan.id)
    setLoading(true)

    try {
      // Toss Payments SDK 연동 (테스트 모드)
      const tossModule = await import('@tosspayments/payment-sdk')
      const loadTossPayments = tossModule.loadTossPayments || tossModule.default?.loadTossPayments
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_placeholder'
      const tossPayments = await loadTossPayments(clientKey)

      await tossPayments.requestPayment('카드', {
        amount: plan.priceNum,
        orderId: `order_${plan.id}_${Date.now()}`,
        orderName: `Check-In ${plan.name} 플랜 (월간)`,
        successUrl: `${window.location.origin}/dashboard?payment=success`,
        failUrl: `${window.location.origin}/pricing?payment=fail`,
      })
    } catch (err) {
      // 결제 취소 또는 실패
      if ((err as { code?: string })?.code !== 'USER_CANCEL') {
        alert(`결제 테스트 모드입니다. ${plan.name} 플랜 선택 완료.`)
      }
    } finally {
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <a href="/dashboard" style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.875rem' }}>← 대시보드</a>

      <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>플랜 선택</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          현장 규모에 맞는 플랜을 선택하세요 · 산안비로 처리 가능
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {PLANS.map(plan => (
          <div
            key={plan.id}
            style={{
              background: 'var(--brand-deep, #1A2744)',
              borderRadius: '12px',
              padding: '2rem',
              border: plan.popular ? '2px solid var(--brand-blue, #2563EB)' : '1px solid var(--surface-dark, #1E293B)',
              position: 'relative',
            }}
          >
            {plan.popular && (
              <div style={{
                position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                background: 'var(--brand-blue, #2563EB)', color: 'white',
                padding: '0.25rem 1rem', borderRadius: '1rem',
                fontSize: '0.75rem', fontWeight: 700,
              }}>
                인기
              </div>
            )}

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{plan.name}</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue, #2563EB)', fontWeight: 600, marginBottom: '0.5rem' }}>{plan.capacity}</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{plan.desc}</p>

            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>{plan.price}</span>
              {plan.period && <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}> {plan.period}</span>}
            </div>

            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: '#10B981' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan)}
              disabled={loading && selectedPlan === plan.id}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: plan.popular ? 'var(--brand-blue, #2563EB)' : 'var(--surface-dark, #1E293B)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && selectedPlan === plan.id ? '처리 중...' : plan.isContact ? '상담 신청' : '구독하기'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        <p>현재 테스트 모드입니다. 실제 결제가 이루어지지 않습니다.</p>
      </div>
    </div>
  )
}
