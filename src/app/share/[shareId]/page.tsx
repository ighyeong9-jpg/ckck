'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import RiskGauge from '@/components/risk/RiskGauge'
import styles from './page.module.scss'

interface ProjectData {
  id: string
  title: string
  industry: string
  address: string
  client_name: string
  risk_score: number
  risk_grade: string
  budget: number
  created_at: string
}

interface ShareData {
  id: string
  share_token: string
  expires_at: string
  created_at: string
  project: ProjectData
}

interface RiskBreakdown {
  fp: number // 필수공정
  oc: number // 운영제약
  ch: number // 변경위험
  total: number // 종합
}

interface CostBreakdown {
  baseCost: number
  variableCost: number
  totalCost: number
  timesCost: number
  laborCost: number
  equipmentCost: number
  mandatoryCost: number
}

export default function SharePage() {
  const params = useParams()
  const shareId = params.shareId as string

  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [riskBreakdown, setRiskBreakdown] = useState<RiskBreakdown | null>(null)
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Mock data for demonstration - replace with actual Supabase fetch
    const mockShareData: ShareData = {
      id: shareId,
      share_token: shareId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      project: {
        id: 'project-1',
        title: '강남 인테리어 프로젝트',
        industry: '주거',
        address: '서울특별시 강남구 역삼동 123-45',
        client_name: '홍길동',
        risk_score: 35.5,
        risk_grade: 'C',
        budget: 50000000,
        created_at: new Date().toISOString()
      }
    }

    const mockRiskBreakdown: RiskBreakdown = {
      fp: 25,
      oc: 40,
      ch: 45,
      total: 35.5
    }

    const mockCostBreakdown: CostBreakdown = {
      baseCost: 35000000,
      variableCost: 15000000,
      totalCost: 50000000,
      timesCost: 5000000,
      laborCost: 20000000,
      equipmentCost: 10000000,
      mandatoryCost: 15000000
    }

    // Simulate API call
    setTimeout(() => {
      setShareData(mockShareData)
      setRiskBreakdown(mockRiskBreakdown)
      setCostBreakdown(mockCostBreakdown)
      setLoading(false)
    }, 500)
  }, [shareId])

  const getStatusFromScore = (score: number): { text: string; color: string } => {
    if (score <= 30) return { text: 'PASS', color: '#10b981' }
    if (score <= 60) return { text: 'WARN', color: '#f59e0b' }
    return { text: 'FAIL', color: '#ef4444' }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>공유 링크 로딩 중...</p>
      </div>
    )
  }

  if (error || !shareData) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>링크를 찾을 수 없습니다</h2>
        <p>{error || '유효하지 않거나 만료된 공유 링크입니다.'}</p>
      </div>
    )
  }

  const { project } = shareData

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.branding}>
            <div className={styles.logo}>
              <span className={styles.logoIcon}>✓</span>
              <span className={styles.logoText}>Check-In</span>
            </div>
            <span className={styles.subtitle}>기록의 편</span>
          </div>
          <div className={styles.projectInfo}>
            <h1 className={styles.projectTitle}>{project.title}</h1>
            <p className={styles.shareDate}>
              공유일: {formatDate(shareData.created_at)}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Risk Gauge Section */}
        <section className={styles.riskSection}>
          <h2 className={styles.sectionTitle}>종합 리스크 분석</h2>
          <div className={styles.gaugeWrapper}>
            <RiskGauge
              score={project.risk_score}
              grade={project.risk_grade}
              size="large"
            />
          </div>
        </section>

        {/* Risk Breakdown Cards */}
        {riskBreakdown && (
          <section className={styles.breakdownSection}>
            <h2 className={styles.sectionTitle}>리스크 요소 분석</h2>
            <div className={styles.statCards}>
              <div className={`${styles.statCard} ${styles.purple}`}>
                <div className={styles.statIcon}>📋</div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>필수공정 (Fp)</span>
                  <span className={styles.statValue}>{riskBreakdown.fp}</span>
                  <span
                    className={styles.statStatus}
                    style={{ color: getStatusFromScore(riskBreakdown.fp).color }}
                  >
                    {getStatusFromScore(riskBreakdown.fp).text}
                  </span>
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.blue}`}>
                <div className={styles.statIcon}>⚙️</div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>운영제약 (Oc)</span>
                  <span className={styles.statValue}>{riskBreakdown.oc}</span>
                  <span
                    className={styles.statStatus}
                    style={{ color: getStatusFromScore(riskBreakdown.oc).color }}
                  >
                    {getStatusFromScore(riskBreakdown.oc).text}
                  </span>
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.green}`}>
                <div className={styles.statIcon}>🔄</div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>변경위험 (Ch)</span>
                  <span className={styles.statValue}>{riskBreakdown.ch}</span>
                  <span
                    className={styles.statStatus}
                    style={{ color: getStatusFromScore(riskBreakdown.ch).color }}
                  >
                    {getStatusFromScore(riskBreakdown.ch).text}
                  </span>
                </div>
              </div>

              <div className={`${styles.statCard} ${styles.orange}`}>
                <div className={styles.statIcon}>📊</div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>종합 (R)</span>
                  <span className={styles.statValue}>{riskBreakdown.total.toFixed(1)}</span>
                  <span
                    className={styles.statStatus}
                    style={{ color: getStatusFromScore(riskBreakdown.total).color }}
                  >
                    {getStatusFromScore(riskBreakdown.total).text}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Cost Summary Card */}
        {costBreakdown && (
          <section className={styles.costSection}>
            <h2 className={styles.sectionTitle}>비용 요약</h2>
            <div className={styles.costCard}>
              <div className={styles.costHeader}>
                <div className={styles.costMain}>
                  <span className={styles.costLabel}>예상 총 비용</span>
                  <span className={styles.costTotal}>
                    {formatCurrency(costBreakdown.totalCost)}
                  </span>
                </div>
                <div className={styles.costSummary}>
                  <div className={styles.costItem}>
                    <span>기본비용</span>
                    <span>{formatCurrency(costBreakdown.baseCost)}</span>
                  </div>
                  <div className={styles.costItem}>
                    <span>변동비용</span>
                    <span>{formatCurrency(costBreakdown.variableCost)}</span>
                  </div>
                </div>
              </div>
              <div className={styles.costBreakdown}>
                <h3>비용 상세</h3>
                <div className={styles.breakdownGrid}>
                  <div className={styles.breakdownItem}>
                    <span className={styles.breakdownIcon}>⏱️</span>
                    <span className={styles.breakdownLabel}>시간비용</span>
                    <span className={styles.breakdownValue}>
                      {formatCurrency(costBreakdown.timesCost)}
                    </span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.breakdownIcon}>👷</span>
                    <span className={styles.breakdownLabel}>노동비용</span>
                    <span className={styles.breakdownValue}>
                      {formatCurrency(costBreakdown.laborCost)}
                    </span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.breakdownIcon}>🔧</span>
                    <span className={styles.breakdownLabel}>장비비용</span>
                    <span className={styles.breakdownValue}>
                      {formatCurrency(costBreakdown.equipmentCost)}
                    </span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span className={styles.breakdownIcon}>📋</span>
                    <span className={styles.breakdownLabel}>필수공정</span>
                    <span className={styles.breakdownValue}>
                      {formatCurrency(costBreakdown.mandatoryCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.expireNotice}>
            <span className={styles.expireIcon}>🔒</span>
            <span>
              이 링크는 {formatDate(shareData.expires_at)}에 만료됩니다.
            </span>
          </div>
          <div className={styles.footerBranding}>
            <span className={styles.footerLogo}>✓ Check-In</span>
            <span className={styles.footerSubtitle}>기록의 편 - 인테리어 프로젝트 관리</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
