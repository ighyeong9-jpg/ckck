'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.scss'

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        // 전체 리포트
        const { data: reportsData } = await supabase
          .from('reports')
          .select('*, projects(name)')
          .order('created_at', { ascending: false })
          .limit(50)

        if (reportsData) setReports(reportsData)

        // 프로젝트 목록
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name')
          .order('name')

        if (projectsData) setProjects(projectsData)
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const formatAmount = (amount: number) => {
    return `${(amount || 0).toLocaleString()}원`
  }

  const deleteReport = async (id: string) => {
    if (!confirm('이 리포트를 삭제하시겠습니까?')) return

    try {
      await supabase.from('reports').delete().eq('id', id)
      setReports(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const getReportTypeIcon = (type: string) => {
    const map: Record<string, string> = {
      summary: '📊',
      diagnostic: '🔍',
      quote: '💰',
      cost: '📈',
      full: '📑',
    }
    return map[type] || '📄'
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
        <h1 className={styles.title}>리포트</h1>
        <p className={styles.subtitle}>모든 프로젝트의 리포트를 확인합니다</p>
      </header>

      <main className={styles.main}>
        {/* Summary */}
        <section className={styles.summary}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryIcon}>📄</span>
            <div>
              <span className={styles.summaryValue}>{reports.length}</span>
              <span className={styles.summaryLabel}>전체 리포트</span>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryIcon}>📁</span>
            <div>
              <span className={styles.summaryValue}>{projects.length}</span>
              <span className={styles.summaryLabel}>프로젝트</span>
            </div>
          </div>
        </section>

        {/* Reports List */}
        <section className={styles.reportsList}>
          <h2>전체 리포트</h2>

          {reports.length === 0 ? (
            <div className={styles.emptyState}>
              <span>📄</span>
              <p>생성된 리포트가 없습니다.</p>
              <button onClick={() => router.push('/projects')}>
                프로젝트로 이동
              </button>
            </div>
          ) : (
            <div className={styles.reportsGrid}>
              {reports.map(report => (
                <div key={report.id} className={styles.reportCard}>
                  <div className={styles.reportHeader}>
                    <span className={styles.reportIcon}>
                      {getReportTypeIcon(report.report_type)}
                    </span>
                    <span className={styles.reportType}>{report.report_type}</span>
                  </div>
                  <h3>{report.title}</h3>
                  <p className={styles.projectName}>
                    {report.projects?.name || '프로젝트'}
                  </p>
                  <div className={styles.reportMeta}>
                    <span>견적: {formatAmount(report.quote_total)}</span>
                    <span>리스크: {report.diagnostic_score || 0}점</span>
                  </div>
                  <div className={styles.reportDate}>
                    {new Date(report.created_at).toLocaleDateString('ko-KR')}
                  </div>
                  <div className={styles.reportActions}>
                    <button
                      onClick={() => router.push(`/projects/${report.project_id}/report`)}
                    >
                      상세보기
                    </button>
                    <button onClick={() => deleteReport(report.id)}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
