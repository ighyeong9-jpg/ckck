'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.scss'

interface SharePageData {
  project: {
    id: string
    name: string
    industry: string
    address: string
    client_name: string
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

export default function SharePage() {
  const params = useParams()
  const shareId = params.shareId as string
  const supabase = createClient()

  const [data, setData] = useState<SharePageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadShareData = async () => {
      try {
        // 1. shares 조회 + 검증
        const { data: shareLink, error: shareError } = await supabase
          .from('shares')
          .select('*')
          .eq('share_token', shareId)
          .single()

        if (shareError || !shareLink) {
          setError('유효하지 않은 공유 링크입니다.')
          return
        }

        // 만료 확인
        if (new Date(shareLink.expires_at) < new Date()) {
          setError('만료된 공유 링크입니다.')
          return
        }

        // view_count 증가 (migration 후 사용 가능)
        if (shareLink.view_count !== undefined) {
          await supabase
            .from('shares')
            .update({ view_count: (shareLink.view_count || 0) + 1 })
            .eq('id', shareLink.id)
        }

        // 2. 프로젝트 데이터
        const { data: project, error: projError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', shareLink.project_id)
          .single()

        if (projError || !project) {
          setError('프로젝트를 찾을 수 없습니다.')
          return
        }

        // 3. 병렬로 나머지 데이터 로드
        const [processesRes, quoteRes, changeRes, diagnosticRes, certRes] = await Promise.all([
          supabase.from('processes').select('id, name, status, progress, start_date, end_date')
            .eq('project_id', project.id).order('order_index'),
          supabase.from('quote_line_items').select('quantity, unit_price')
            .eq('project_id', project.id),
          supabase.from('change_orders').select('amount')
            .eq('project_id', project.id),
          supabase.from('diagnostic_responses').select('checked')
            .eq('project_id', project.id),
          supabase.from('verification_certificates').select('grade, overall_score')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ])

        const quoteTotal = (quoteRes.data || []).reduce(
          (sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0
        )
        const changeTotal = (changeRes.data || []).reduce(
          (sum, item) => sum + (Number(item.amount) || 0), 0
        )
        const diagItems = diagnosticRes.data || []
        const checklistStats = {
          total: diagItems.length,
          completed: diagItems.filter((d: any) => d.checked).length,
        }
        const certificate = certRes.data
          ? { grade: certRes.data.grade, score: certRes.data.overall_score }
          : null

        // 리스크 등급 계산
        const riskScore = project.risk_score || 0
        let riskGrade = 'A'
        if (riskScore > 80) riskGrade = 'F'
        else if (riskScore > 60) riskGrade = 'D'
        else if (riskScore > 40) riskGrade = 'C'
        else if (riskScore > 20) riskGrade = 'B'

        setData({
          project: {
            id: project.id,
            name: project.name,
            industry: project.industry || '',
            address: project.address || '',
            client_name: project.client_name || '',
            risk_score: riskScore,
            risk_grade: riskGrade,
            progress: project.progress || 0,
            status: project.status || 'planning',
            start_date: project.start_date,
            end_date: project.end_date,
            created_at: project.created_at,
          },
          shareLink: {
            expires_at: shareLink.expires_at,
            created_at: shareLink.created_at,
          },
          processes: processesRes.data || [],
          quoteTotal,
          changeTotal,
          checklistStats,
          certificate,
        })
      } catch (err: any) {
        setError(err.message || '데이터를 불러올 수 없습니다.')
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
              {project.client_name && `${project.client_name} · `}
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
