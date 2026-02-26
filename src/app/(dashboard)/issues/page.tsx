'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import IssueReporter from '@/components/issues/IssueReporter'
import IssueCard, { SiteIssue } from '@/components/issues/IssueCard'
import IssueTimeline from '@/components/issues/IssueTimeline'
import { IssueClassifyResult, IssueSeverity, IssueCategory } from '@/lib/ai/issue-types'
import PdfDownloadButton from '@/components/pdf/PdfDownloadButton'
import styles from './page.module.scss'

type ViewMode = 'list' | 'timeline'
type FilterSeverity = 'all' | IssueSeverity
type FilterCategory = 'all' | IssueCategory

export default function IssuesPage() {
  const [issues, setIssues] = useState<SiteIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterSev, setFilterSev] = useState<FilterSeverity>('all')
  const [filterCat, setFilterCat] = useState<FilterCategory>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showReporter, setShowReporter] = useState(false)

  const supabase = createClient()

  const loadIssues = useCallback(async () => {
    const { data } = await supabase
      .from('site_issues')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setIssues(data as SiteIssue[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  const handleClassified = useCallback((issueId: string | null, classification: IssueClassifyResult) => {
    setShowReporter(false)
    loadIssues()
  }, [loadIssues])

  const handleExportPdf = useCallback(async () => {
    const { exportIssueReportPdf } = await import('@/lib/pdf/issue-report-pdf')
    await exportIssueReportPdf(issues)
  }, [issues])

  const updateStatus = useCallback(async (id: string, status: string) => {
    const update: any = { status }
    if (status === 'resolved') update.resolved_at = new Date().toISOString()
    await supabase.from('site_issues').update(update).eq('id', id)
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status: status as any, resolved_at: update.resolved_at ?? null } : i))
  }, [])

  const filtered = issues.filter(i => {
    if (filterSev !== 'all' && i.severity !== filterSev) return false
    if (filterCat !== 'all' && i.category !== filterCat) return false
    return true
  })

  const openCount = issues.filter(i => i.status === 'open').length
  const criticalCount = issues.filter(i => i.severity === 'critical' && i.status !== 'resolved').length

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>현장 이슈 관리</h1>
          <p className={styles.subtitle}>이슈를 보고하면 AI가 즉시 분류하고 조치를 안내합니다</p>
        </div>
        <div className={styles.headerActions}>
          {issues.length > 0 && (
            <PdfDownloadButton
              onExport={handleExportPdf}
              label="이슈 내역 PDF"
              variant="secondary"
              size="sm"
            />
          )}
          <button
            className={styles.newBtn}
            onClick={() => setShowReporter(!showReporter)}
          >
            {showReporter ? '✕ 닫기' : '+ 이슈 보고'}
          </button>
        </div>
      </div>

      {/* 통계 바 */}
      <div className={styles.statBar}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{issues.length}</span>
          <span className={styles.statLabel}>전체</span>
        </div>
        <div className={`${styles.stat} ${openCount > 0 ? styles.statWarning : ''}`}>
          <span className={styles.statNum}>{openCount}</span>
          <span className={styles.statLabel}>미처리</span>
        </div>
        <div className={`${styles.stat} ${criticalCount > 0 ? styles.statDanger : ''}`}>
          <span className={styles.statNum}>{criticalCount}</span>
          <span className={styles.statLabel}>즉시 조치</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{issues.filter(i => i.status === 'resolved').length}</span>
          <span className={styles.statLabel}>해결 완료</span>
        </div>
      </div>

      {/* 이슈 보고 폼 */}
      {showReporter && (
        <IssueReporter onClassified={handleClassified} />
      )}

      {/* 필터 + 뷰 전환 */}
      <div className={styles.controls}>
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={filterSev}
            onChange={e => setFilterSev(e.target.value as FilterSeverity)}
          >
            <option value="all">전체 심각도</option>
            <option value="critical">🔴 즉시 조치</option>
            <option value="high">🟠 긴급</option>
            <option value="medium">🟡 주의</option>
            <option value="low">🟢 일반</option>
          </select>
          <select
            className={styles.filterSelect}
            value={filterCat}
            onChange={e => setFilterCat(e.target.value as FilterCategory)}
          >
            <option value="all">전체 유형</option>
            <option value="safety">⛑️ 안전</option>
            <option value="quality">🔍 품질</option>
            <option value="cost">💰 비용</option>
            <option value="schedule">📅 공정</option>
            <option value="legal">⚖️ 법규</option>
            <option value="material">📦 자재</option>
            <option value="labor">👷 인력</option>
            <option value="weather">🌦️ 기상</option>
            <option value="design_change">📐 설계변경</option>
            <option value="other">📋 기타</option>
          </select>
        </div>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewActive : ''}`}
            onClick={() => setViewMode('list')}
          >
            목록
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'timeline' ? styles.viewActive : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            타임라인
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      {loading ? (
        <div className={styles.loading}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📡</div>
          <p className={styles.emptyTitle}>이슈가 없어요</p>
          <p className={styles.emptyDesc}>위 + 이슈 보고 버튼으로 현장 이슈를 등록하세요</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className={styles.list}>
          {filtered.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              expanded={expandedId === issue.id}
              onToggle={() => setExpandedId(prev => prev === issue.id ? null : issue.id)}
              onApprove={id => updateStatus(id, 'approved')}
              onReject={id => updateStatus(id, 'rejected')}
              onNegotiate={id => updateStatus(id, 'reviewing')}
              onResolve={id => updateStatus(id, 'resolved')}
            />
          ))}
        </div>
      ) : (
        <IssueTimeline issues={filtered} />
      )}
    </div>
  )
}
