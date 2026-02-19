'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QuickActions from '@/components/ui/QuickActions'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'
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
  daysLeft: number | null   // null = 마감 미설정
  industry: string
  urgencyScore: number      // 긴급도 (높을수록 먼저)
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

// ─── 상수 ─────────────────────────────────────────────────

const INDUSTRY_ICONS: Record<string, string> = {
  cafe: '☕', restaurant: '🍽️', bar: '🍺', bakery: '🥐', beauty: '💇',
  clinic: '🏥', fitness: '💪', retail: '🛒', office: '🏢', academy: '📚',
  apartment: '🏠', villa: '🏡', house: '🏘️',
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444', DANGER: '#f97316', WARNING: '#f59e0b', INFO: '#3b82f6'
}
const SEVERITY_BG: Record<string, string> = {
  CRITICAL: '#fee2e2', DANGER: '#ffedd5', WARNING: '#fef3c7', INFO: '#eff6ff'
}
const SEVERITY_ICON: Record<string, string> = {
  CRITICAL: '🚨', DANGER: '⚠️', WARNING: '💛', INFO: '💡'
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

  useEffect(() => {
    const load = async () => {
      try {
        // 사용자 정보
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('display_name')
            .eq('user_id', user.id)
            .maybeSingle()
          setUserName(settings?.display_name || user.email?.split('@')[0] || '사용자')
        }

        // 프로젝트 전체
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false })

        if (!projects) return

        const now = Date.now()

        // ── KPI 집계 ──────────────────────────────────────
        const active = projects.filter(p => p.status === 'in_progress').length
        const completed = projects.filter(p => p.status === 'completed').length
        const highRisk = projects.filter(p => (p.risk_score ?? 0) >= 70).length
        const totalCount = projects.length
        setStats({ total: totalCount, active, highRisk, completed })

        // 최초 방문 시 온보딩 자동 표시
        if (totalCount === 0 && !localStorage.getItem('onboarding_done')) {
          setShowOnboarding(true)
        }

        // ── 긴급도 계산 및 정렬 ──────────────────────────
        const urgent: UrgentProject[] = projects
          .filter(p => p.status !== 'completed')
          .map(p => {
            let daysLeft: number | null = null
            if (p.end_date) {
              daysLeft = Math.ceil((new Date(p.end_date).getTime() - now) / 86400000)
            }
            // 긴급도 점수: 리스크 고점 + 마감 임박 + 지연 가중
            let urgencyScore = (p.risk_score ?? 0)
            if (daysLeft !== null) {
              if (daysLeft < 0) urgencyScore += 50
              else if (daysLeft <= 3) urgencyScore += 35
              else if (daysLeft <= 7) urgencyScore += 20
              else if (daysLeft <= 14) urgencyScore += 8
            }
            return {
              id: p.id,
              name: p.name,
              clientName: p.client_name,
              status: p.status,
              riskScore: p.risk_score ?? 0,
              progress: p.progress ?? 0,
              endDate: p.end_date,
              daysLeft,
              industry: p.industry ?? '',
              urgencyScore,
            }
          })
          .sort((a, b) => b.urgencyScore - a.urgencyScore)
          .slice(0, 6)
        setUrgentProjects(urgent)

        // ── AI 리스크 알림 생성 (규칙 기반) ─────────────
        const alerts: RiskAlert[] = []
        projects.forEach(p => {
          if (p.status === 'completed') return
          const riskScore = p.risk_score ?? 0
          const daysLeft = p.end_date
            ? Math.ceil((new Date(p.end_date).getTime() - now) / 86400000)
            : null

          if (daysLeft !== null && daysLeft < 0) {
            alerts.push({
              id: `overdue-${p.id}`,
              projectId: p.id,
              projectName: p.name,
              severity: 'CRITICAL',
              title: `마감 ${Math.abs(daysLeft)}일 초과`,
              message: `${p.name}의 마감일이 지났습니다. 고객과 일정을 조율하고 합의서를 갱신해주세요.`,
              actionUrl: `/projects/${p.id}/agreement`,
            })
          } else if (daysLeft !== null && daysLeft <= 3) {
            alerts.push({
              id: `soon-${p.id}`,
              projectId: p.id,
              projectName: p.name,
              severity: 'DANGER',
              title: `D-${daysLeft} 마감 임박`,
              message: `${p.name}이 ${daysLeft}일 후 마감입니다. 미완료 공정을 확인하세요.`,
              actionUrl: `/projects/${p.id}/process`,
            })
          }

          if (riskScore >= 80) {
            alerts.push({
              id: `risk-critical-${p.id}`,
              projectId: p.id,
              projectName: p.name,
              severity: 'CRITICAL',
              title: `리스크 F등급 (${riskScore}점)`,
              message: `${p.name}의 리스크가 매우 높습니다. 즉시 체크리스트를 확인해주세요.`,
              actionUrl: `/projects/${p.id}/diagnostic`,
            })
          } else if (riskScore >= 60) {
            alerts.push({
              id: `risk-high-${p.id}`,
              projectId: p.id,
              projectName: p.name,
              severity: 'DANGER',
              title: `리스크 D등급 (${riskScore}점)`,
              message: `${p.name}의 리스크 점수가 높습니다. 진단 체크리스트를 점검하세요.`,
              actionUrl: `/projects/${p.id}/diagnostic`,
            })
          }
        })

        // 심각도 순 정렬
        const severityOrder: Record<string, number> = { CRITICAL: 0, DANGER: 1, WARNING: 2, INFO: 3 }
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
        setRiskAlerts(alerts.slice(0, 5))

        // ── 승인 대기 항목 ──────────────────────────────
        const pending: PendingItem[] = []

        // 변경사항 승인 대기 (status 'requested' = DB 기본값, 승인 대기 상태)
        const { data: changeOrders } = await supabase
          .from('change_orders')
          .select('id, project_id, title, status')
          .eq('status', 'requested')
          .limit(20)

        if (changeOrders && changeOrders.length > 0) {
          // 프로젝트별 집계
          const byProject: Record<string, { count: number; projectName: string }> = {}
          changeOrders.forEach((c: any) => {
            const proj = projects.find(p => p.id === c.project_id)
            if (!proj) return
            if (!byProject[c.project_id]) {
              byProject[c.project_id] = { count: 0, projectName: proj.name }
            }
            byProject[c.project_id].count++
          })
          Object.entries(byProject).forEach(([projectId, { count, projectName }]) => {
            pending.push({
              id: `co-${projectId}`,
              projectId,
              projectName,
              type: 'change_order',
              title: '변경사항 승인 대기',
              count,
              actionUrl: `/projects/${projectId}/changes`,
            })
          })
        }

        // 미완료 체크리스트 (30% 미만이고 진행중)
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
                pending.push({
                  id: `cl-${p.id}`,
                  projectId: p.id,
                  projectName: p.name,
                  type: 'checklist',
                  title: `체크리스트 ${pct}% 완료`,
                  count: total - done,
                  actionUrl: `/projects/${p.id}/diagnostic`,
                })
              }
            }
          })
        )

        pending.sort((a, b) => {
          const typeOrder: Record<string, number> = { change_order: 0, deadline: 1, checklist: 2 }
          return typeOrder[a.type] - typeOrder[b.type]
        })
        setPendingItems(pending.slice(0, 6))
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ─── 헬퍼 ────────────────────────────────────────────────

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 6) return { text: '늦은 밤까지 수고하세요', emoji: '🌙' }
    if (h < 9) return { text: '좋은 아침이에요', emoji: '🌅' }
    if (h < 12) return { text: '활기찬 오전이에요', emoji: '☀️' }
    if (h < 14) return { text: '점심 식사는 하셨나요?', emoji: '🍚' }
    if (h < 18) return { text: '오후도 힘내세요', emoji: '💪' }
    if (h < 21) return { text: '오늘도 수고했어요', emoji: '🌆' }
    return { text: '편안한 저녁 되세요', emoji: '🌙' }
  }

  const getRiskGrade = (score: number) => {
    if (score <= 20) return { grade: 'A', color: '#10b981' }
    if (score <= 40) return { grade: 'B', color: '#34d399' }
    if (score <= 60) return { grade: 'C', color: '#f59e0b' }
    if (score <= 80) return { grade: 'D', color: '#f97316' }
    return { grade: 'F', color: '#ef4444' }
  }

  const getDdayLabel = (daysLeft: number | null) => {
    if (daysLeft === null) return null
    if (daysLeft < 0) return { text: `D+${Math.abs(daysLeft)}`, type: 'overdue' }
    if (daysLeft === 0) return { text: 'D-Day', type: 'today' }
    if (daysLeft <= 7) return { text: `D-${daysLeft}`, type: 'soon' }
    return { text: `D-${daysLeft}`, type: 'normal' }
  }

  const getStatusLabel = (status: string) => {
    const m: Record<string, string> = { planning: '기획', in_progress: '진행중', review: '검토', completed: '완료' }
    return m[status] ?? status
  }

  // ─── 스켈레톤 로딩 ───────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.welcome}>
              <div className={styles.skeletonLine} style={{ width: '220px', height: '28px' }} />
              <div className={styles.skeletonLine} style={{ width: '160px', height: '16px', marginTop: '8px' }} />
            </div>
          </div>
        </header>
        <main className={styles.main}>
          <section className={styles.kpiGrid}>
            {[1,2,3,4].map(i => <div key={i} className={styles.skeletonKpi} />)}
          </section>
          <div className={styles.triplePanel}>
            {[1,2,3].map(i => <div key={i} className={styles.skeletonCard} />)}
          </div>
        </main>
      </div>
    )
  }

  const greeting = getGreeting()

  return (
    <div className={styles.container}>
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
      {/* ── 헤더 ─────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.welcome}>
            <h1>{greeting.emoji} {greeting.text}, {userName}님</h1>
            <p>
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          <button className={styles.newProjectBtn} onClick={() => router.push('/projects')}>
            + 새 프로젝트
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* ── KPI 카드 ─────────────────────────────────── */}
        <section className={styles.kpiGrid}>
          {[
            { label: '전체 프로젝트', value: stats.total, color: '#7c3aed', icon: '📁' },
            { label: '진행중', value: stats.active, color: '#3b82f6', icon: '🔄' },
            { label: '고위험', value: stats.highRisk, color: '#ef4444', icon: '🚨' },
            { label: '완료', value: stats.completed, color: '#10b981', icon: '✅' },
          ].map((kpi, i) => (
            <div key={i} className={styles.kpiCard} style={{ '--kpi-color': kpi.color } as React.CSSProperties}>
              <span className={styles.kpiIcon}>{kpi.icon}</span>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiValue}>{kpi.value}</span>
                <span className={styles.kpiLabel}>{kpi.label}</span>
              </div>
            </div>
          ))}
        </section>

        {/* ── AI 체키 바로가기 ──────────────────────────── */}
        <QuickActions
          title="AI 체키 바로가기"
          actions={[
            { icon: '💰', label: 'AI 자동 견적', description: '업종별 표준 견적 자동 생성', message: '표준 견적 자동으로 생성해줘', color: '#7c3aed' },
            { icon: '📈', label: '리스크 분석', description: '전체 프로젝트 리스크 현황', message: '전체 리스크 현황 분석해줘', color: '#ef4444' },
            { icon: '📋', label: '오늘 할일', description: '오늘 해야 할 작업 확인', message: '오늘 해야 할 작업 알려줘', color: '#3b82f6' },
            { icon: '📊', label: '대시보드 요약', description: 'AI가 현황을 종합 분석', message: '대시보드 요약해줘', color: '#10b981' },
          ]}
        />

        {/* ── 프로젝트 없을 때 웰컴 상태 ───────────────── */}
        {stats.total === 0 && (
          <div className={styles.welcomeState}>
            <span className={styles.welcomeIcon}>🏗️</span>
            <h2 className={styles.welcomeTitle}>Check-In에 오신 것을 환영해요!</h2>
            <p className={styles.welcomeDesc}>
              첫 번째 프로젝트를 만들면 AI가 리스크 분석, 공정 관리, 자동 리포트를 도와드려요.
            </p>
            <div className={styles.welcomeSteps}>
              <div className={styles.welcomeStep}><span>1️⃣</span> 프로젝트 생성</div>
              <div className={styles.welcomeStep}><span>2️⃣</span> 진단 체크리스트</div>
              <div className={styles.welcomeStep}><span>3️⃣</span> AI 리스크 분석</div>
            </div>
            <button className={styles.welcomeBtn} onClick={() => router.push('/projects')}>
              첫 프로젝트 만들기 →
            </button>
          </div>
        )}

        {/* ── 3대 핵심 패널 ────────────────────────────── */}
        <div className={styles.triplePanel}>

          {/* 패널 1: 오늘 확인할 현장 (긴급도 순) */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <span className={styles.panelDot} style={{ background: '#ef4444' }} />
                오늘 확인할 현장
              </h2>
              <span className={styles.panelBadge}>{urgentProjects.length}건</span>
            </div>

            {urgentProjects.length === 0 ? (
              <div className={styles.panelEmpty}>
                <span>🎉</span>
                <p>긴급 현장이 없습니다</p>
              </div>
            ) : (
              <ul className={styles.urgentList}>
                {urgentProjects.map(p => {
                  const dday = getDdayLabel(p.daysLeft)
                  const risk = getRiskGrade(p.riskScore)
                  const isUrgent = p.urgencyScore >= 60
                  return (
                    <li
                      key={p.id}
                      className={`${styles.urgentItem} ${isUrgent ? styles.urgentHigh : ''}`}
                      onClick={() => router.push(`/projects/${p.id}/diagnostic`)}
                    >
                      <span className={styles.urgentIcon}>
                        {INDUSTRY_ICONS[p.industry] || '🏗️'}
                      </span>
                      <div className={styles.urgentInfo}>
                        <span className={styles.urgentName}>{p.name}</span>
                        <span className={styles.urgentClient}>{p.clientName}</span>
                        <div className={styles.urgentProgress}>
                          <div className={styles.urgentProgressBar}>
                            <div
                              className={styles.urgentProgressFill}
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                          <span className={styles.urgentProgressPct}>{p.progress}%</span>
                        </div>
                      </div>
                      <div className={styles.urgentMeta}>
                        {dday && (
                          <span
                            className={styles.ddayBadge}
                            style={{
                              background: dday.type === 'overdue' ? '#fee2e2' : dday.type === 'today' ? '#fef3c7' : dday.type === 'soon' ? '#fff7ed' : '#f3f4f6',
                              color: dday.type === 'overdue' ? '#ef4444' : dday.type === 'today' ? '#d97706' : dday.type === 'soon' ? '#f97316' : '#6b7280',
                            }}
                          >
                            {dday.text}
                          </span>
                        )}
                        <span
                          className={styles.riskBadge}
                          style={{ color: risk.color, background: `${risk.color}18` }}
                        >
                          {risk.grade}등급
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <button className={styles.panelViewAll} onClick={() => router.push('/projects')}>
              전체 프로젝트 보기 →
            </button>
          </section>

          {/* 패널 2: AI 감지 리스크 */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <span className={styles.panelDot} style={{ background: '#f97316' }} />
                AI 감지 리스크
              </h2>
              <span
                className={styles.panelBadge}
                style={riskAlerts.some(a => a.severity === 'CRITICAL') ? { background: '#fee2e2', color: '#ef4444' } : {}}
              >
                {riskAlerts.length}건
              </span>
            </div>

            {riskAlerts.length === 0 ? (
              <div className={styles.panelEmpty}>
                <span>🛡️</span>
                <p>감지된 리스크가 없어요</p>
              </div>
            ) : (
              <ul className={styles.alertList}>
                {riskAlerts.map(alert => (
                  <li
                    key={alert.id}
                    className={styles.alertItem}
                    onClick={() => router.push(alert.actionUrl)}
                    style={{ '--alert-color': SEVERITY_COLOR[alert.severity], '--alert-bg': SEVERITY_BG[alert.severity] } as React.CSSProperties}
                  >
                    <span className={styles.alertSeverityIcon}>{SEVERITY_ICON[alert.severity]}</span>
                    <div className={styles.alertContent}>
                      <div className={styles.alertHeader}>
                        <span className={styles.alertProject}>{alert.projectName}</span>
                        <span
                          className={styles.alertSeverityBadge}
                          style={{ color: SEVERITY_COLOR[alert.severity], background: SEVERITY_BG[alert.severity] }}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <span className={styles.alertTitle}>{alert.title}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button className={styles.panelViewAll} onClick={() => router.push('/projects')}>
              전체 리스크 관리 →
            </button>
          </section>

          {/* 패널 3: 승인 대기 항목 */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <span className={styles.panelDot} style={{ background: '#f59e0b' }} />
                승인 대기 항목
              </h2>
              <span
                className={styles.panelBadge}
                style={pendingItems.length > 0 ? { background: '#fef3c7', color: '#d97706' } : {}}
              >
                {pendingItems.length}건
              </span>
            </div>

            {pendingItems.length === 0 ? (
              <div className={styles.panelEmpty}>
                <span>✅</span>
                <p>대기 중인 항목이 없어요</p>
              </div>
            ) : (
              <ul className={styles.pendingList}>
                {pendingItems.map(item => (
                  <li
                    key={item.id}
                    className={styles.pendingItem}
                    onClick={() => router.push(item.actionUrl)}
                  >
                    <span className={styles.pendingTypeIcon}>
                      {item.type === 'change_order' ? '📝' : item.type === 'checklist' ? '☑️' : '📅'}
                    </span>
                    <div className={styles.pendingInfo}>
                      <span className={styles.pendingProject}>{item.projectName}</span>
                      <span className={styles.pendingTitle}>{item.title}</span>
                    </div>
                    <span className={styles.pendingCount}>{item.count}건</span>
                  </li>
                ))}
              </ul>
            )}

            <button className={styles.panelViewAll} onClick={() => router.push('/projects')}>
              전체 항목 확인 →
            </button>
          </section>
        </div>

        {/* ── 빠른 액션 ────────────────────────────────── */}
        <section className={styles.quickActionsSection}>
          <h2 className={styles.sectionTitle}>빠른 액션</h2>
          <div className={styles.quickGrid}>
            <button className={styles.quickBtn} onClick={() => router.push('/projects')}>
              <span>📁</span><span>새 프로젝트</span>
            </button>
            <button className={styles.quickBtn} onClick={() => router.push('/ai-chat')}>
              <span>🤖</span><span>AI 채팅</span>
            </button>
            <button className={styles.quickBtn} onClick={() => router.push('/reports')}>
              <span>📊</span><span>리포트</span>
            </button>
            <button className={styles.quickBtn} onClick={() => router.push('/clients')}>
              <span>👥</span><span>고객관리</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
