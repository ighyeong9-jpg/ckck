'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import styles from './page.module.scss'

interface SharePageData {
  project: {
    id: string
    name: string
    industry: string
    risk_score: number
    risk_grade: string
    progress: number
    status: string
    start_date: string | null
    end_date: string | null
    created_at: string
  }
  shareLink: {
    expires_at: string
    created_at: string
  }
  processes: Array<{
    id: string
    name: string
    status: string
    progress: number
    start_date: string | null
    end_date: string | null
  }>
  quoteTotal: number
  changeTotal: number
  checklistStats: { total: number; completed: number }
  certificate: { grade: string; score: number } | null
}

const DEMO_DATA: SharePageData = {
  project: {
    id: 'demo',
    name: '데모 카페 인테리어',
    industry: 'cafe',
    risk_score: 25,
    risk_grade: 'B',
    progress: 65,
    status: 'in_progress',
    start_date: new Date(Date.now() - 30 * 86400000).toISOString(),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
  shareLink: {
    expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
  processes: [
    { id: '1', name: '철거', status: 'completed', progress: 100, start_date: null, end_date: null },
    { id: '2', name: '목공', status: 'in_progress', progress: 70, start_date: null, end_date: null },
    { id: '3', name: '전기', status: 'pending', progress: 0, start_date: null, end_date: null },
    { id: '4', name: '도장', status: 'pending', progress: 0, start_date: null, end_date: null },
  ],
  quoteTotal: 5200000,
  changeTotal: 300000,
  checklistStats: { total: 25, completed: 18 },
  certificate: { grade: 'A', score: 92 },
}

export default function SharePage() {
  const params = useParams()
  const shareId = params.shareId as string

  const [data, setData] = useState<SharePageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadShareData = async () => {
      try {
        if (shareId === 'demo123') {
          setData(DEMO_DATA)
          setLoading(false)
          return
        }

        const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`)
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || '유효하지 않은 공유 링크입니다.')
          return
        }

        setData(json as SharePageData)
      } catch {
        setError('데이터를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadShareData()
  }, [shareId])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  const getIndustryIcon = (industry: string) => {
    const map: Record<string, string> = {
      cafe: '☕', restaurant: '🍽️', bar: '🍺', bakery: '🥐',
      beauty: '💇', clinic: '🏥', fitness: '💪', retail: '🏪',
      office: '🏢', academy: '📚', apartment: '🏠', villa: '🏘️', house: '🏡',
    }
    return map[industry] || '🏗️'
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      planning: '기획', in_progress: '진행중', review: '검토', completed: '완료',
    }
    return map[status] || status
  }

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: '#6b7280', in_progress: '#3b82f6', completed: '#10b981', delayed: '#ef4444',
    }
    return map[status] || '#6b7280'
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>공유 페이지 로딩 중...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>링크를 찾을 수 없습니다</h2>
        <p>{error || '유효하지 않거나 만료된 공유 링크입니다.'}</p>
      </div>
    )
  }

  const { project, processes, quoteTotal, changeTotal, checklistStats, certificate } = data
  const progressPct = project.progress

  // 원형 진행률 게이지 계산
  const circumference = 2 * Math.PI * 80
  const strokeDashoffset = circumference - (progressPct / 100) * circumference

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
            <div className={styles.projectTitleRow}>
              <span className={styles.industryIcon}>{getIndustryIcon(project.industry)}</span>
              <h1 className={styles.projectTitle}>{project.name}</h1>
            </div>
            <p className={styles.shareDate}>
              {getStatusLabel(project.status)}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* 진행률 원형 게이지 */}
        <section className={styles.progressSection}>
          <div className={styles.progressGauge}>
            <svg viewBox="0 0 200 200" className={styles.progressSvg}>
              <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="12" />
              <circle
                cx="100" cy="100" r="80"
                fill="none"
                stroke={progressPct >= 100 ? '#10b981' : '#7c3aed'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 100 100)"
              />
              <text x="100" y="90" textAnchor="middle" className={styles.progressPctText}>
                {progressPct}%
              </text>
              <text x="100" y="115" textAnchor="middle" className={styles.progressLabel}>
                전체 진행률
              </text>
            </svg>
          </div>
          {/* AI 검증 뱃지 */}
          {certificate && (
            <div className={styles.certBadge}>
              <span className={styles.certIcon}>🤖</span>
              <span className={styles.certGrade}>{certificate.grade}등급</span>
              <span className={styles.certScore}>{certificate.score}점</span>
            </div>
          )}
        </section>

        {/* 개요 카드 */}
        <section className={styles.overviewCards}>
          <div className={styles.overviewCard}>
            <span className={styles.ocIcon}>📋</span>
            <span className={styles.ocLabel}>체크리스트</span>
            <span className={styles.ocValue}>
              {checklistStats.completed}/{checklistStats.total}
            </span>
          </div>
          <div className={styles.overviewCard}>
            <span className={styles.ocIcon}>💰</span>
            <span className={styles.ocLabel}>견적 총액</span>
            <span className={styles.ocValue}>{formatCurrency(quoteTotal)}</span>
          </div>
          <div className={styles.overviewCard}>
            <span className={styles.ocIcon}>🔄</span>
            <span className={styles.ocLabel}>변경 금액</span>
            <span className={styles.ocValue}>{formatCurrency(changeTotal)}</span>
          </div>
          <div className={styles.overviewCard}>
            <span className={styles.ocIcon}>⚠️</span>
            <span className={styles.ocLabel}>리스크</span>
            <span className={styles.ocValue}>{project.risk_grade}등급</span>
          </div>
        </section>

        {/* 공정 타임라인 */}
        {processes.length > 0 && (
          <section className={styles.timelineSection}>
            <h2 className={styles.sectionTitle}>공정 현황</h2>
            <div className={styles.timelineList}>
              {processes.map((proc, idx) => (
                <div key={proc.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot} style={{ background: getStatusColor(proc.status) }}>
                    {proc.status === 'completed' ? '✓' : idx + 1}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineName}>{proc.name}</div>
                    <div className={styles.timelineBar}>
                      <div
                        className={styles.timelineFill}
                        style={{
                          width: `${proc.progress}%`,
                          background: getStatusColor(proc.status),
                        }}
                      />
                    </div>
                    <span className={styles.timelinePct}>{proc.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 프로젝트 일정 */}
        {(project.start_date || project.end_date) && (
          <section className={styles.scheduleSection}>
            <h2 className={styles.sectionTitle}>프로젝트 일정</h2>
            <div className={styles.scheduleInfo}>
              {project.start_date && (
                <div className={styles.scheduleItem}>
                  <span className={styles.scheduleLabel}>시작일</span>
                  <span>{formatDate(project.start_date)}</span>
                </div>
              )}
              {project.end_date && (
                <div className={styles.scheduleItem}>
                  <span className={styles.scheduleLabel}>종료일</span>
                  <span>{formatDate(project.end_date)}</span>
                </div>
              )}
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
              이 링크는 {formatDate(data.shareLink.expires_at)}에 만료됩니다.
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
