'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QuickActions from '@/components/ui/QuickActions'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
import TodayStatusBar from '@/components/dashboard/TodayStatusBar'
import AIBriefing from '@/components/dashboard/AIBriefing'
import styles from './page.module.scss'

// ─── 타입 ─────────────────────────────────────────────────

interface UrgentProject {
  id: string
  name: string
  clientName: string
  status: string
  riskScore: number
  progress: number
  endDate: string | null
  daysLeft: number | null
  industry: string
  urgencyScore: number
}

interface RiskAlert {
  id: string
  projectId: string
  projectName: string
  severity: 'CRITICAL' | 'DANGER' | 'WARNING' | 'INFO'
  title: string
  message: string
  actionUrl: string
}

interface PendingItem {
  id: string
  projectId: string
  projectName: string
  type: 'change_order' | 'checklist' | 'deadline'
  title: string
  count: number
  actionUrl: string
}

interface DisputeSignal {
  id: string
  project_id: string
  signal_type: string
  description: string
  created_at: string
}

// ─── 상수 ─────────────────────────────────────────────────

const INDUSTRY_ICONS: Record<string, string> = {
  cafe: '☕', restaurant: '🍽️', bar: '🍺', bakery: '🥐', beauty: '💇',
  clinic: '🏥', fitness: '💪', retail: '🛒', office: '🏢', academy: '📚',
  apartment: '🏠', villa: '🏡', house: '🏘️',
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#FF3B5C', DANGER: '#FF6B2B', WARNING: '#FFB800', INFO: '#3b82f6',
}

const SEVERITY_ICON: Record<string, string> = {
  CRITICAL: '🚨', DANGER: '⚠️', WARNING: '💛', INFO: '💡',
}

const SIGNAL_LABELS: Record<string, string> = {
  verbal_agreement: '구두합의 감지',
  additional_cost: '추가비용 분쟁',
  abandonment_risk: '먹튀 위험',
  quality_issue: '품질 불량',
  delay: '공사 지연',
  subcontractor_wage: '임금 체불',
  no_contract: '계약서 없음',
}

// ─── 오늘 요약 생성 ────────────────────────────────────────

function computeTodaySummary(
  stats: { total: number; active: number; highRisk: number },
  urgentProjects: UrgentProject[],
  riskAlerts: RiskAlert[],
  pendingItems: PendingItem[],
): string {
  const critical = riskAlerts.filter(a => a.severity === 'CRITICAL')
  if (critical.length > 0) {
    return `${critical[0].projectName} — ${critical[0].title} 즉시 확인이 필요합니다.`
  }
  if (urgentProjects.length > 0 && urgentProjects[0].urgencyScore >= 60) {
    const p = urgentProjects[0]
    if (p.daysLeft !== null && p.daysLeft < 0)
      return `${p.name} 마감 ${Math.abs(p.daysLeft)}일 초과 — 고객과 일정 협의가 필요합니다.`
    if (p.daysLeft !== null && p.daysLeft <= 3)
      return `${p.name} D-${p.daysLeft} 마감 임박 — 미완료 공정을 지금 확인하세요.`
    return `${p.name} 리스크 ${p.riskScore}점 — 진단 체크리스트 점검이 필요합니다.`
  }
  if (pendingItems.length > 0)
    return `${pendingItems[0].projectName} — ${pendingItems[0].title} 처리를 기다리고 있습니다.`
  if (stats.active > 0)
    return `${stats.active}개 현장이 진행 중입니다. 오늘 체크리스트를 완료하세요.`
  return '모든 현장이 안정적입니다. 새 현장을 등록해보세요.'
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userName, setUserName] = useState('')
  const [stats, setStats] = useState({ total: 0, active: 0, highRisk: 0, completed: 0 })
  const [urgentProjects, setUrgentProjects] = useState<UrgentProject[]>([])
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([])
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [disputeSignals, setDisputeSignals] = useState<DisputeSignal[]>([])
  const [todaySummary, setTodaySummary] = useState('')
  const [openIssueCount, setOpenIssueCount] = useState(0)

  const loadDashboard = useCallback(async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('display_name')
            .eq('user_id', user.id)
            .maybeSingle()
          setUserName(settings?.display_name || user.email?.split('@')[0] || '사용자')
        }

        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false })

        if (!projects) return

        const now = Date.now()
        const active = projects.filter(p => p.status === 'in_progress').length
        const completed = projects.filter(p => p.status === 'completed').length
        const highRisk = projects.filter(p => (p.risk_score ?? 0) >= 70).length
        setStats({ total: projects.length, active, highRisk, completed })

        if (projects.length === 0 && !localStorage.getItem('onboarding_done')) {
          setShowOnboarding(true)
        }

        // 긴급도 계산
        const urgent: UrgentProject[] = projects
          .filter(p => p.status !== 'completed')
          .map(p => {
            let daysLeft: number | null = null
            if (p.end_date) daysLeft = Math.ceil((new Date(p.end_date).getTime() - now) / 86400000)
            let urgencyScore = p.risk_score ?? 0
            if (daysLeft !== null) {
              if (daysLeft < 0) urgencyScore += 50
              else if (daysLeft <= 3) urgencyScore += 35
              else if (daysLeft <= 7) urgencyScore += 20
              else if (daysLeft <= 14) urgencyScore += 8
            }
            return {
              id: p.id, name: p.name, clientName: p.client_name,
              status: p.status, riskScore: p.risk_score ?? 0,
              progress: p.progress ?? 0, endDate: p.end_date,
              daysLeft, industry: p.industry ?? '', urgencyScore,
            }
          })
          .sort((a, b) => b.urgencyScore - a.urgencyScore)
          .slice(0, 6)
        setUrgentProjects(urgent)

        // 리스크 알림
        const alerts: RiskAlert[] = []
        projects.forEach(p => {
          if (p.status === 'completed') return
          const riskScore = p.risk_score ?? 0
          const daysLeft = p.end_date
            ? Math.ceil((new Date(p.end_date).getTime() - now) / 86400000)
            : null
          if (daysLeft !== null && daysLeft < 0) {
            alerts.push({ id: `overdue-${p.id}`, projectId: p.id, projectName: p.name,
              severity: 'CRITICAL', title: `마감 ${Math.abs(daysLeft)}일 초과`,
              message: `${p.name}의 마감일이 지났습니다.`, actionUrl: `/projects/${p.id}/agreement` })
          } else if (daysLeft !== null && daysLeft <= 3) {
            alerts.push({ id: `soon-${p.id}`, projectId: p.id, projectName: p.name,
              severity: 'DANGER', title: `D-${daysLeft} 마감 임박`,
              message: `${p.name}이 ${daysLeft}일 후 마감입니다.`, actionUrl: `/projects/${p.id}/process` })
          }
          if (riskScore >= 80) {
            alerts.push({ id: `risk-f-${p.id}`, projectId: p.id, projectName: p.name,
              severity: 'CRITICAL', title: `리스크 F등급 (${riskScore}점)`,
              message: `즉시 체크리스트를 확인하세요.`, actionUrl: `/projects/${p.id}/diagnostic` })
          } else if (riskScore >= 60) {
            alerts.push({ id: `risk-d-${p.id}`, projectId: p.id, projectName: p.name,
              severity: 'DANGER', title: `리스크 D등급 (${riskScore}점)`,
              message: `진단 체크리스트를 점검하세요.`, actionUrl: `/projects/${p.id}/diagnostic` })
          }
        })
        const sevOrder: Record<string, number> = { CRITICAL: 0, DANGER: 1, WARNING: 2, INFO: 3 }
        alerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])
        setRiskAlerts(alerts.slice(0, 5))

        // dispute_signals (최근 5개, 미해결)
        if (user) {
          const { data: signals } = await supabase
            .from('dispute_signals')
            .select('id, project_id, signal_type, description, created_at')
            .eq('resolved', false)
            .order('created_at', { ascending: false })
            .limit(5)
          setDisputeSignals(signals ?? [])

          // 현장 이슈 미처리 카운트
          const { count: issueCount } = await supabase
            .from('site_issues')
            .select('*', { count: 'exact', head: true })
            .in('status', ['open', 'reviewing'])
          setOpenIssueCount(issueCount ?? 0)
        }

        // 승인 대기 항목
        const pending: PendingItem[] = []
        const { data: changeOrders } = await supabase
          .from('change_orders').select('id, project_id, title, status').eq('status', 'requested').limit(20)
        if (changeOrders?.length) {
          const byProject: Record<string, { count: number; projectName: string }> = {}
          changeOrders.forEach((c: any) => {
            const proj = projects.find(p => p.id === c.project_id)
            if (!proj) return
            if (!byProject[c.project_id]) byProject[c.project_id] = { count: 0, projectName: proj.name }
            byProject[c.project_id].count++
          })
          Object.entries(byProject).forEach(([projectId, { count, projectName }]) => {
            pending.push({ id: `co-${projectId}`, projectId, projectName,
              type: 'change_order', title: '변경사항 승인 대기', count, actionUrl: `/projects/${projectId}/changes` })
          })
        }
        const activeProjects = projects.filter(p => p.status === 'in_progress')
        await Promise.all(
          activeProjects.slice(0, 5).map(async p => {
            const [{ count: total }, { count: done }] = await Promise.all([
              supabase.from('diagnostic_responses').select('*', { count: 'exact', head: true }).eq('project_id', p.id),
              supabase.from('diagnostic_responses').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('checked', true),
            ])
            if (total && total > 0 && done !== null) {
              const pct = Math.round((done / total) * 100)
              if (pct < 40 && (p.progress ?? 0) > 30) {
                pending.push({ id: `cl-${p.id}`, projectId: p.id, projectName: p.name,
                  type: 'checklist', title: `체크리스트 ${pct}% 완료`, count: total - done,
                  actionUrl: `/projects/${p.id}/diagnostic` })
              }
            }
          }),
        )
        const typeOrder: Record<string, number> = { change_order: 0, deadline: 1, checklist: 2 }
        pending.sort((a, b) => typeOrder[a.type] - typeOrder[b.type])
        setPendingItems(pending.slice(0, 6))

        // 오늘 요약 (모든 데이터 로드 후 계산)
        const computedAlerts = alerts.slice(0, 5)
        const computedUrgent = urgent
        setTodaySummary(computeTodaySummary(
          { total: projects.length, active, highRisk },
          computedUrgent,
          computedAlerts,
          pending.slice(0, 6),
        ))
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // ─── Supabase Realtime 실시간 연결 ──────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        loadDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'change_orders' }, () => {
        loadDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diagnostic_responses' }, () => {
        loadDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispute_signals' }, () => {
        loadDashboard()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadDashboard])

  // ─── 헬퍼 ──────────────────────────────────────────────────

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 9) return '좋은 아침이에요'
    if (h < 12) return '활기찬 오전이에요'
    if (h < 14) return '점심 식사는 하셨나요?'
    if (h < 18) return '오후도 힘내세요'
    return '오늘도 수고하셨어요'
  }

  const getRiskGrade = (score: number) => {
    if (score <= 20) return { grade: 'A', color: '#00D084' }
    if (score <= 40) return { grade: 'B', color: '#34d399' }
    if (score <= 60) return { grade: 'C', color: '#FFB800' }
    if (score <= 80) return { grade: 'D', color: '#FF6B2B' }
    return { grade: 'F', color: '#FF3B5C' }
  }

  const getDday = (daysLeft: number | null) => {
    if (daysLeft === null) return null
    if (daysLeft < 0) return { text: `D+${Math.abs(daysLeft)}`, danger: true }
    if (daysLeft === 0) return { text: 'D-Day', danger: true }
    if (daysLeft <= 7) return { text: `D-${daysLeft}`, danger: true }
    return { text: `D-${daysLeft}`, danger: false }
  }

  // ─── 로딩 스켈레톤 ──────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.summaryBanner}>
          <div className={styles.skeletonLine} style={{ width: '60%', height: '18px' }} />
        </div>
        <div className={styles.kpiRow}>
          {[1,2,3,4].map(i => <div key={i} className={styles.skeletonKpi} />)}
        </div>
        <div className={styles.panels}>
          {[1,2,3].map(i => <div key={i} className={styles.skeletonPanel} />)}
        </div>
      </div>
    )
  }

  const totalRiskCount = riskAlerts.length + disputeSignals.length

  return (
    <div className={styles.page}>
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}

      {/* ── 체키 프로액티브 브리핑 ──────────────────────── */}
      <AIBriefing />

      {/* ── 오늘 현장 상태 바 ────────────────────────────── */}
      <TodayStatusBar />

      {/* ── 오늘의 AI 한 줄 요약 ────────────────────────── */}
      <div className={`${styles.summaryBanner} ${riskAlerts.some(a => a.severity === 'CRITICAL') ? styles.bannerCritical : styles.bannerNormal}`}>
        <span className={styles.summaryIcon}>
          {riskAlerts.some(a => a.severity === 'CRITICAL') ? '🚨' : totalRiskCount > 0 ? '⚡' : '✅'}
        </span>
        <p className={styles.summaryText}>
          <strong>{getGreeting()}, {userName}님.</strong>{' '}
          {todaySummary}
        </p>
        <button className={styles.newProjBtn} onClick={() => router.push('/projects')}>
          + 새 현장
        </button>
      </div>

      {/* ── KPI 행 ──────────────────────────────────────── */}
      <div className={styles.kpiRow}>
        {[
          { label: '전체 현장', value: stats.total, icon: '📁', accent: false },
          { label: '진행 중', value: stats.active, icon: '🔄', accent: false },
          { label: '고위험', value: stats.highRisk, icon: '🚨', accent: stats.highRisk > 0 },
          { label: '완료', value: stats.completed, icon: '✅', accent: false },
        ].map((kpi, i) => (
          <div key={i} className={`${styles.kpiCard} ${kpi.accent ? styles.kpiCardDanger : ''}`}>
            <span className={styles.kpiIcon}>{kpi.icon}</span>
            <div>
              <div className={styles.kpiValue}>{kpi.value}</div>
              <div className={styles.kpiLabel}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── AI 신기능 바로가기 카드 ──────────────────────────────── */}
      <div className={styles.aiShortcuts}>
        <a href="/quotes/new" className={styles.aiShortcutCard}>
          <span className={styles.aiShortcutEmoji}>💰</span>
          <div>
            <p className={styles.aiShortcutTitle}>AI 예산 가이드</p>
            <p className={styles.aiShortcutDesc}>30초 안에 인테리어 예산 범위 파악</p>
          </div>
          <span className={styles.aiShortcutArrow}>→</span>
        </a>
        <a href="/issues" className={`${styles.aiShortcutCard} ${openIssueCount > 0 ? styles.aiShortcutAlert : ''}`}>
          <span className={styles.aiShortcutEmoji}>📡</span>
          <div>
            <p className={styles.aiShortcutTitle}>
              현장 이슈
              {openIssueCount > 0 && (
                <span className={styles.aiShortcutBadge}>{openIssueCount}</span>
              )}
            </p>
            <p className={styles.aiShortcutDesc}>
              {openIssueCount > 0 ? `미처리 이슈 ${openIssueCount}건 — 확인 필요` : 'AI 이슈 분류 + 조치 가이드'}
            </p>
          </div>
          <span className={styles.aiShortcutArrow}>→</span>
        </a>
      </div>

      {/* ── AI 체키 바로가기 ──────────────────────────────── */}
      <QuickActions
        title="AI 체키 바로가기"
        actions={[
          { icon: '💰', label: 'AI 자동 견적', description: '업종별 표준 견적 자동 생성', message: '표준 견적 자동으로 생성해줘', color: '#7c3aed' },
          { icon: '📈', label: '리스크 분석', description: '전체 현장 리스크 현황', message: '전체 리스크 현황 분석해줘', color: '#FF3B5C' },
          { icon: '📋', label: '오늘 할일', description: '오늘 해야 할 작업 확인', message: '오늘 해야 할 작업 알려줘', color: '#3b82f6' },
          { icon: '📊', label: '대시보드 요약', description: 'AI가 현황을 종합 분석', message: '대시보드 요약해줘', color: '#00D084' },
        ]}
      />

      {/* ── 빈 상태 ──────────────────────────────────────── */}
      {stats.total === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏗️</div>
          <h2>첫 현장을 등록해보세요</h2>
          <p>현장을 등록하면 AI가 리스크 분석, 공정 관리, 분쟁 예방을 자동으로 도와드립니다.</p>
          <button className={styles.emptyBtn} onClick={() => router.push('/projects')}>
            첫 현장 등록하기 →
          </button>
        </div>
      )}

      {/* ── 3대 핵심 패널 ────────────────────────────────── */}
      {stats.total > 0 && (
        <div className={styles.panels} id="section-panels">

          {/* 패널 1: 지금 확인해야 할 것 */}
          <section className={styles.panel} id="section-todo">
            <div className={styles.panelHead}>
              <div className={styles.panelHeadLeft}>
                <span className={styles.panelHeadIcon} style={{ color: '#FF3B5C' }}>🚨</span>
                <h2>지금 확인해야 할 것</h2>
              </div>
              {urgentProjects.length > 0 && (
                <span className={`${styles.badge} ${urgentProjects.some(p => p.urgencyScore >= 70) ? styles.badgeDanger : styles.badgeNeutral}`}>
                  {urgentProjects.length}건
                </span>
              )}
            </div>

            {urgentProjects.length === 0 ? (
              <div className={styles.panelEmpty}>
                <span>🎉</span>
                <p>긴급 현장이 없습니다</p>
              </div>
            ) : (
              <ul className={styles.urgentList}>
                {urgentProjects.map(p => {
                  const dday = getDday(p.daysLeft)
                  const risk = getRiskGrade(p.riskScore)
                  return (
                    <li key={p.id} className={styles.urgentItem} onClick={() => router.push(`/projects/${p.id}/diagnostic`)}>
                      <div className={styles.urgentLeft}>
                        <span className={styles.urgentIco}>{INDUSTRY_ICONS[p.industry] || '🏗️'}</span>
                        <div>
                          <div className={styles.urgentName}>{p.name}</div>
                          <div className={styles.urgentClient}>{p.clientName}</div>
                        </div>
                      </div>
                      <div className={styles.urgentRight}>
                        {dday && (
                          <span className={`${styles.ddayBadge} ${dday.danger ? styles.ddayDanger : styles.ddayNormal}`}>
                            {dday.text}
                          </span>
                        )}
                        <span className={styles.riskBadge} style={{ color: risk.color }}>
                          {risk.grade}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <button className={styles.panelLink} onClick={() => router.push('/projects')}>
              전체 현장 보기 →
            </button>
          </section>

          {/* 패널 2: AI 감지 리스크 */}
          <section className={styles.panel} id="section-risks">
            <div className={styles.panelHead}>
              <div className={styles.panelHeadLeft}>
                <span className={styles.panelHeadIcon} style={{ color: '#FF6B2B' }}>⚡</span>
                <h2>AI가 감지한 리스크</h2>
              </div>
              {totalRiskCount > 0 && (
                <span className={`${styles.badge} ${riskAlerts.some(a => a.severity === 'CRITICAL') ? styles.badgeDanger : styles.badgeWarn}`}>
                  {totalRiskCount}건
                </span>
              )}
            </div>

            {totalRiskCount === 0 ? (
              <div className={styles.panelEmpty}>
                <span>🛡️</span>
                <p>감지된 리스크가 없어요</p>
              </div>
            ) : (
              <ul className={styles.alertList}>
                {riskAlerts.map(alert => (
                  <li key={alert.id} className={styles.alertItem} onClick={() => router.push(alert.actionUrl)}>
                    <span className={styles.alertIco}>{SEVERITY_ICON[alert.severity]}</span>
                    <div className={styles.alertBody}>
                      <div className={styles.alertProject}>{alert.projectName}</div>
                      <div className={styles.alertTitle} style={{ color: SEVERITY_COLOR[alert.severity] }}>
                        {alert.title}
                      </div>
                    </div>
                    <span className={styles.alertArrow}>→</span>
                  </li>
                ))}
                {disputeSignals.map(sig => (
                  <li key={sig.id} className={styles.alertItem} onClick={() => router.push('/projects')}>
                    <span className={styles.alertIco}>⚠️</span>
                    <div className={styles.alertBody}>
                      <div className={styles.alertProject}>분쟁 감지</div>
                      <div className={styles.alertTitle} style={{ color: '#FFB800' }}>
                        {SIGNAL_LABELS[sig.signal_type] || sig.signal_type}
                      </div>
                    </div>
                    <span className={styles.alertArrow}>→</span>
                  </li>
                ))}
              </ul>
            )}

            <button className={styles.panelLink} onClick={() => router.push('/projects')}>
              전체 리스크 관리 →
            </button>
          </section>

          {/* 패널 3: 오늘 완료할 것 */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div className={styles.panelHeadLeft}>
                <span className={styles.panelHeadIcon} style={{ color: '#00D084' }}>✅</span>
                <h2>오늘 완료할 것</h2>
              </div>
              {pendingItems.length > 0 && (
                <span className={`${styles.badge} ${styles.badgeWarn}`}>{pendingItems.length}건</span>
              )}
            </div>

            {pendingItems.length === 0 ? (
              <div className={styles.panelEmpty}>
                <span>🎉</span>
                <p>대기 항목이 없어요</p>
              </div>
            ) : (
              <ul className={styles.todoList}>
                {pendingItems.map(item => (
                  <li key={item.id} className={styles.todoItem} onClick={() => router.push(item.actionUrl)}>
                    <span className={styles.todoIco}>
                      {item.type === 'change_order' ? '📝' : item.type === 'checklist' ? '☑️' : '📅'}
                    </span>
                    <div className={styles.todoBody}>
                      <div className={styles.todoProject}>{item.projectName}</div>
                      <div className={styles.todoTitle}>{item.title}</div>
                    </div>
                    <span className={styles.todoCnt}>{item.count}건</span>
                  </li>
                ))}
              </ul>
            )}

            <button className={styles.panelLink} onClick={() => router.push('/projects')}>
              전체 항목 확인 →
            </button>
          </section>
        </div>
      )}

      {/* ── 현장별 카드 (하단) ──────────────────────────── */}
      {urgentProjects.length > 0 && (
        <section className={styles.projectCards} id="section-projects">
          <div className={styles.projectCardsHeader}>
            <h2>진행 중인 현장</h2>
            <button onClick={() => router.push('/projects')}>전체 보기 →</button>
          </div>
          <div className={styles.projectCardGrid}>
            {urgentProjects.slice(0, 4).map(p => {
              const risk = getRiskGrade(p.riskScore)
              const dday = getDday(p.daysLeft)
              return (
                <div key={p.id} className={styles.projectCard} onClick={() => router.push(`/projects/${p.id}`)}>
                  <div className={styles.pcTop}>
                    <span className={styles.pcIcon}>{INDUSTRY_ICONS[p.industry] || '🏗️'}</span>
                    <div className={styles.pcMeta}>
                      {dday && (
                        <span className={`${styles.pcDday} ${dday.danger ? styles.pcDdayDanger : ''}`}>
                          {dday.text}
                        </span>
                      )}
                      <span className={styles.pcRisk} style={{ color: risk.color }}>
                        {risk.grade}등급
                      </span>
                    </div>
                  </div>
                  <div className={styles.pcName}>{p.name}</div>
                  <div className={styles.pcClient}>{p.clientName}</div>
                  <div className={styles.pcProgressWrap}>
                    <div className={styles.pcProgressBar}>
                      <div
                        className={styles.pcProgressFill}
                        style={{
                          width: `${p.progress}%`,
                          background: p.riskScore >= 70 ? '#FF3B5C' : p.riskScore >= 50 ? '#FF6B2B' : '#00D084',
                        }}
                      />
                    </div>
                    <span className={styles.pcProgressPct}>{p.progress}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
