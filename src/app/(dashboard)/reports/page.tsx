'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

interface DailyReportDraft {
  title: string
  date: string
  projectName: string
  content: string
  summary: {
    workersToday: number
    processesInProgress: number
    checklistProgress: number
    hasCriticalIssue: boolean
  }
  model: 'gemini' | 'claude'
}

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  // AI 일보 생성 상태
  const [selectedProject, setSelectedProject] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<DailyReportDraft | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: reportsData } = await supabase
          .from('reports')
          .select('*, projects(name)')
          .order('created_at', { ascending: false })
          .limit(50)

        if (reportsData) setReports(reportsData)

        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name')
          .neq('status', 'completed')
          .order('name')

        if (projectsData) {
          setProjects(projectsData)
          if (projectsData.length > 0) setSelectedProject(projectsData[0].id)
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleGenerate = async () => {
    if (!selectedProject) {
      toast.error('현장을 선택해주세요.')
      return
    }
    setGenerating(true)
    setDraft(null)
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject, date: reportDate }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || '일보 생성 실패')
      }
      const data: DailyReportDraft = await res.json()
      setDraft(data)
      toast.success('AI 일보 초안이 생성되었어요!')
    } catch (err: any) {
      toast.error(err?.message || '일보 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!draft) return
    const text = `[${draft.title}]\n날짜: ${draft.date}\n프로젝트: ${draft.projectName}\n\n${draft.content}`
    await navigator.clipboard.writeText(text)
    toast.success('일보 내용이 클립보드에 복사되었어요.')
  }

  const deleteReport = async (id: string) => {
    if (!confirm('이 리포트를 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('reports').delete().eq('id', id)
      if (error) throw error
      setReports(prev => prev.filter(r => r.id !== id))
      toast.success('리포트가 삭제되었어요.')
    } catch (err: any) {
      toast.error('삭제 중 오류가 발생했어요.')
    }
  }

  const getTypeLabel = (type: string) => {
    const m: Record<string, string> = {
      summary: '종합', diagnostic: '진단', quote: '견적', cost: '비용', full: '전체', daily: '일보',
    }
    return m[type] || type
  }

  const getTypeIcon = (type: string) => {
    const m: Record<string, string> = {
      summary: '📊', diagnostic: '🔍', quote: '💰', cost: '📈', full: '📑', daily: '📝',
    }
    return m[type] || '📄'
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          데이터 불러오는 중...
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* ── 헤더 ── */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>📊 리포트</h1>
            <p className={styles.subtitle}>AI가 현장 일보를 자동으로 작성해드려요</p>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.statChip}>
              <b>{reports.length}</b><small>저장된 리포트</small>
            </div>
            <div className={styles.statChip}>
              <b>{projects.length}</b><small>진행 현장</small>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── AI 자동 일보 생성 ── */}
        <section className={styles.aiSection}>
          <div className={styles.aiSectionHead}>
            <span className={styles.aiBadge}>AI</span>
            <div>
              <h2 className={styles.aiTitle}>자동 일보 생성</h2>
              <p className={styles.aiDesc}>공정·인력·자재 데이터를 AI가 분석해 일보 초안을 자동으로 작성해요</p>
            </div>
          </div>

          <div className={styles.aiForm}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>현장</label>
              {projects.length === 0 ? (
                <p className={styles.noProjectMsg}>
                  진행 중인 현장이 없어요.{' '}
                  <button className={styles.noProjectLink} onClick={() => router.push('/projects')}>
                    현장 등록하기 →
                  </button>
                </p>
              ) : (
                <select
                  className={styles.formSelect}
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>날짜</label>
              <input
                type="date"
                className={styles.formInput}
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
              />
            </div>

            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={generating || projects.length === 0}
            >
              {generating ? (
                <><span className={styles.btnSpinner} /> 생성 중...</>
              ) : (
                <><span>🤖</span> AI 일보 생성</>
              )}
            </button>
          </div>

          {/* ── 생성된 초안 ── */}
          {generating && (
            <div className={styles.generatingState}>
              <div className={styles.generatingSpinner} />
              <p>AI가 현장 데이터를 분석하고 있어요...</p>
              <small>공정·인력·자재·체크리스트를 종합해 일보를 작성합니다</small>
            </div>
          )}

          {draft && !generating && (
            <div className={styles.draftCard}>
              <div className={styles.draftTop}>
                <div>
                  <h3 className={styles.draftTitle}>{draft.title}</h3>
                  <p className={styles.draftMeta}>
                    {draft.projectName} · {draft.date} ·{' '}
                    <span className={styles.modelBadge}>
                      {draft.model === 'gemini' ? '🔮 Gemini' : '🤖 Claude'}
                    </span>
                  </p>
                </div>
                <button className={styles.copyBtn} onClick={handleCopy}>
                  📋 복사
                </button>
              </div>

              <div className={styles.draftSummary}>
                <div className={styles.sumChip}>
                  <span className={styles.sumIcon}>👷</span>
                  <div>
                    <b>{draft.summary.workersToday}</b>
                    <small>오늘 인원</small>
                  </div>
                </div>
                <div className={styles.sumChip}>
                  <span className={styles.sumIcon}>🔄</span>
                  <div>
                    <b>{draft.summary.processesInProgress}</b>
                    <small>진행 공정</small>
                  </div>
                </div>
                <div className={styles.sumChip}>
                  <span className={styles.sumIcon}>✅</span>
                  <div>
                    <b>{draft.summary.checklistProgress}%</b>
                    <small>체크리스트</small>
                  </div>
                </div>
                {draft.summary.hasCriticalIssue && (
                  <div className={`${styles.sumChip} ${styles.sumChipAlert}`}>
                    <span className={styles.sumIcon}>🚨</span>
                    <div>
                      <b>주의</b>
                      <small>이슈 발생</small>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.draftContent}>{draft.content}</div>
            </div>
          )}
        </section>

        {/* ── 저장된 리포트 목록 ── */}
        <section className={styles.reportsList}>
          <h2 className={styles.sectionTitle}>저장된 리포트</h2>

          {reports.length === 0 ? (
            <div className={styles.emptyState}>
              <span>📄</span>
              <p>저장된 리포트가 없어요</p>
              <small>프로젝트 상세 → 리포트 탭에서 생성할 수 있어요</small>
            </div>
          ) : (
            <div className={styles.reportsGrid}>
              {reports.map(report => (
                <div key={report.id} className={styles.reportCard}>
                  <div className={styles.reportHead}>
                    <span className={styles.reportIcon}>{getTypeIcon(report.report_type)}</span>
                    <span className={styles.reportTypeBadge}>{getTypeLabel(report.report_type)}</span>
                  </div>
                  <h3 className={styles.reportCardTitle}>{report.title}</h3>
                  <p className={styles.projectName}>{report.projects?.name || '프로젝트'}</p>
                  <div className={styles.reportMeta}>
                    {(report.quote_total || 0) > 0 && (
                      <span>견적 {(report.quote_total || 0).toLocaleString()}원</span>
                    )}
                    {(report.diagnostic_score || 0) > 0 && (
                      <span>리스크 {report.diagnostic_score}점</span>
                    )}
                  </div>
                  <div className={styles.reportDate}>
                    {new Date(report.created_at).toLocaleDateString('ko-KR')}
                  </div>
                  <div className={styles.reportActions}>
                    <button onClick={() => router.push(`/projects/${report.project_id}/report`)}>
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
