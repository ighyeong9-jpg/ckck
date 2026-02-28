'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checklistMap } from '@/data/checklists'
import { getRiskGradeAndLevel } from '@/lib/utils/riskCalculator'
import type { Project } from '@/types/project'
import RiskGauge from '@/components/risk/RiskGauge'
import styles from './page.module.scss'

interface LawSummary {
  compliant: number
  violated: number
  not_applicable: number
  pending: number
}

interface ActivityItem {
  id: string
  type: 'checklist' | 'photo' | 'law' | 'report' | 'project'
  label: string
  time: string
}

export default function OverviewPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [project, setProject] = useState<Project | null>(null)
  const [lawSummary, setLawSummary] = useState<LawSummary>({ compliant: 0, violated: 0, not_applicable: 0, pending: 0 })
  const [checkedCount, setCheckedCount] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const loadData = useCallback(async () => {
    try {
      // 프로젝트 정보
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (proj) {
        setProject(proj as Project)

        // 체크리스트 총 항목 수 (JSON 기반)
        const industry = (proj as Project).industry || 'cafe'
        const cl = checklistMap[industry]
        if (cl) setTotalItems(cl.items.length)
      }

      // 법령 현황
      const { data: lawChecks } = await supabase
        .from('law_checks')
        .select('status')
        .eq('project_id', projectId)

      if (lawChecks) {
        const summary = lawChecks.reduce(
          (acc, c) => {
            acc[c.status as keyof LawSummary] = (acc[c.status as keyof LawSummary] || 0) + 1
            return acc
          },
          { compliant: 0, violated: 0, not_applicable: 0, pending: 0 } as LawSummary
        )
        setLawSummary(summary)
      }

      // 체크된 항목 수
      const { count: checkCount } = await supabase
        .from('diagnostic_responses')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('checked', true)

      setCheckedCount(checkCount ?? 0)

      // 최근 활동 (여러 테이블에서 수집)
      const acts: ActivityItem[] = []

      const { data: recentChecks } = await supabase
        .from('diagnostic_responses')
        .select('id, updated_at, item_id')
        .eq('project_id', projectId)
        .eq('checked', true)
        .order('updated_at', { ascending: false })
        .limit(3)

      recentChecks?.forEach(r => {
        acts.push({ id: r.id, type: 'checklist', label: `체크리스트 항목 확인`, time: r.updated_at })
      })

      const { data: recentFiles } = await supabase
        .from('evidence_files')
        .select('id, created_at, file_name')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(2)

      recentFiles?.forEach(f => {
        acts.push({ id: f.id, type: 'photo', label: `증빙 업로드: ${f.file_name}`, time: f.created_at })
      })

      const { data: recentLaw } = await supabase
        .from('law_checks')
        .select('id, checked_at')
        .eq('project_id', projectId)
        .order('checked_at', { ascending: false })
        .limit(1)

      recentLaw?.forEach(l => {
        acts.push({ id: l.id, type: 'law', label: '법령 점검 실행', time: l.checked_at })
      })

      acts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setActivities(acts.slice(0, 6))
    } catch (err) {
      console.error('Overview load error:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRecheck = async () => {
    setRunning(true)
    try {
      await fetch(`/api/projects/${projectId}/law-check`, { method: 'POST' })
      await loadData()
    } catch {
      // silently ignore
    } finally {
      setRunning(false)
    }
  }

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}분 전`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}시간 전`
    return `${Math.floor(h / 24)}일 전`
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>데이터 불러오는 중...</p>
      </div>
    )
  }

  if (!project) return null

  const riskGrade = getRiskGradeAndLevel(project.risk_score || 0)
  const checklistPct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0
  const totalLaws = lawSummary.compliant + lawSummary.violated + lawSummary.not_applicable + lawSummary.pending
  const lawCompliantPct = totalLaws > 0 ? Math.round((lawSummary.compliant / totalLaws) * 100) : 0

  const gradeLabel: Record<string, string> = {
    low: '안심 구간', medium: '주의 구간', high: '위험 구간',
  }

  const activityIcons: Record<string, string> = {
    checklist: '📋', photo: '📷', law: '⚖️', report: '📄', project: '🏗️',
  }

  return (
    <div className={styles.page}>
      {/* Summary Cards */}
      <section className={styles.summaryCards}>
        {/* Risk Score */}
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>리스크 점수</div>
          <div className={styles.gaugeWrap}>
            <RiskGauge score={project.risk_score || 0} grade={riskGrade.grade} size="medium" />
          </div>
          <div
            className={styles.gradeBadge}
            style={{
              background: riskGrade.level === 'low' ? '#ecfdf5' : riskGrade.level === 'medium' ? '#fef3c7' : '#fef2f2',
              color: riskGrade.level === 'low' ? '#10b981' : riskGrade.level === 'medium' ? '#d97706' : '#dc2626',
            }}
          >
            {gradeLabel[riskGrade.level]}
          </div>
        </div>

        {/* Checklist Progress */}
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>체크리스트 진행률</div>
          <div className={styles.bigNumber}>{checklistPct}%</div>
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${checklistPct}%`,
                  background: checklistPct >= 80 ? '#10b981' : checklistPct >= 50 ? '#f59e0b' : '#E8651A',
                }}
              />
            </div>
          </div>
          <div className={styles.progressLabel}>
            {checkedCount} / {totalItems}항목 완료
          </div>
          <button
            type="button"
            className={styles.goBtn}
            onClick={() => router.push(`/projects/${projectId}/diagnostic`)}
          >
            체크리스트 작성 →
          </button>
        </div>

        {/* Law Status */}
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>법령 준수 현황</div>
          <div className={styles.bigNumber}>{lawCompliantPct}%</div>
          <div className={styles.lawSummaryList}>
            <div className={styles.lawItem} style={{ color: '#10b981' }}>
              ✅ 충족 <strong>{lawSummary.compliant}</strong>
            </div>
            <div className={styles.lawItem} style={{ color: '#ef4444' }}>
              ⚠️ 미충족 <strong>{lawSummary.violated}</strong>
            </div>
            <div className={styles.lawItem} style={{ color: '#6b7280' }}>
              ➖ 해당없음 <strong>{lawSummary.not_applicable}</strong>
            </div>
            <div className={styles.lawItem} style={{ color: '#f59e0b' }}>
              🔍 확인필요 <strong>{lawSummary.pending}</strong>
            </div>
          </div>
          <button
            type="button"
            className={styles.goBtn}
            onClick={() => router.push(`/projects/${projectId}/law-check`)}
          >
            법령 현황 보기 →
          </button>
        </div>
      </section>

      {/* Project Info */}
      <section className={styles.infoSection}>
        <div className={styles.infoHeader}>
          <h2>프로젝트 기본 정보</h2>
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => router.push(`/projects/${projectId}/diagnostic`)}
          >
            수정
          </button>
        </div>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>현장명</span>
            <span className={styles.infoValue}>{project.name}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>업종</span>
            <span className={styles.infoValue}>{project.industry || '미설정'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>고객/발주처</span>
            <span className={styles.infoValue}>{project.client_name || '미설정'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>주소</span>
            <span className={styles.infoValue}>{(project as Project & { address?: string }).address || '미설정'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>공사 기간</span>
            <span className={styles.infoValue}>
              {project.start_date || '미설정'} ~ {project.end_date || '미설정'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>예산</span>
            <span className={styles.infoValue}>
              {(project as Project & { budget?: number }).budget
                ? `${(((project as Project & { budget?: number }).budget ?? 0) / 10000).toLocaleString()}만원`
                : '미설정'}
            </span>
          </div>
        </div>
      </section>

      {/* Bottom: Activity + Recheck */}
      <div className={styles.bottom}>
        {/* Activity Timeline */}
        <section className={styles.activitySection}>
          <h2>최근 활동</h2>
          {activities.length === 0 ? (
            <div className={styles.emptyActivity}>
              아직 활동 기록이 없습니다.<br />체크리스트를 작성하거나 사진을 업로드해보세요.
            </div>
          ) : (
            <ul className={styles.activityList}>
              {activities.map(act => (
                <li key={act.id} className={styles.activityItem}>
                  <span className={styles.actIcon}>{activityIcons[act.type]}</span>
                  <div className={styles.actContent}>
                    <span className={styles.actLabel}>{act.label}</span>
                    <span className={styles.actTime}>{formatTime(act.time)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recheck Panel */}
        <section className={styles.recheckSection}>
          <h2>법령 재점검</h2>
          <p>현재 체크리스트 상태를 기반으로 17개 법령 전체를 재점검합니다.</p>
          <button
            type="button"
            className={styles.recheckBtn}
            onClick={handleRecheck}
            disabled={running}
          >
            {running ? '점검 중...' : '⚖️ 법령 재점검 실행'}
          </button>
          {lawSummary.violated > 0 && (
            <div className={styles.violationAlert}>
              ⚠️ 현재 <strong>{lawSummary.violated}개</strong> 법령이 미충족 상태입니다.
              <button
                type="button"
                onClick={() => router.push(`/projects/${projectId}/law-check`)}
                className={styles.alertLink}
              >
                확인하기 →
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
