'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import styles from './page.module.scss'

const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  highRiskProjects: number
  totalQuoteAmount: number
  weekTrend: { total: number; active: number; highRisk: number; completed: number }
}

interface RiskGrade {
  name: string
  value: number
  color: string
}

interface CostData {
  name: string
  견적: number
  실비용: number
}

interface ActivityItem {
  id: string
  type: 'project_create' | 'project_update' | 'status_change'
  message: string
  time: string
  color: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0, activeProjects: 0, completedProjects: 0,
    highRiskProjects: 0, totalQuoteAmount: 0,
    weekTrend: { total: 0, active: 0, highRisk: 0, completed: 0 },
  })
  const [projects, setProjects] = useState<any[]>([])
  const [riskData, setRiskData] = useState<RiskGrade[]>([])
  const [avgRiskScore, setAvgRiskScore] = useState(0)
  const [progressData, setProgressData] = useState<any[]>([])
  const [costData, setCostData] = useState<CostData[]>([])
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([])
  const [upcomingSchedule, setUpcomingSchedule] = useState<any[]>([])
  const [alerts, setAlerts] = useState<{ type: 'danger' | 'warning' | 'info'; icon: string; title: string; desc: string; action?: string }[]>([])

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
            .single()
          setUserName(settings?.display_name || user.email?.split('@')[0] || '사용자')
        }

        // 프로젝트
        const { data: projectsData } = await supabase
          .from('projects').select('*').order('updated_at', { ascending: false })

        if (projectsData) {
          setProjects(projectsData)

          let active = 0, completed = 0, highRisk = 0
          const grades: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
          let totalRisk = 0

          // 전주 대비 증감 계산
          const now = new Date()
          const oneWeekAgo = new Date(now); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

          let thisWeekTotal = 0, lastWeekTotal = 0
          let thisWeekActive = 0, lastWeekActive = 0
          let thisWeekHighRisk = 0, lastWeekHighRisk = 0
          let thisWeekCompleted = 0, lastWeekCompleted = 0

          projectsData.forEach(p => {
            if (p.status === 'in_progress') active++
            if (p.status === 'completed') completed++
            if (p.risk_score >= 70) highRisk++

            const s = p.risk_score || 0
            totalRisk += s
            if (s <= 20) grades.A++
            else if (s <= 40) grades.B++
            else if (s <= 60) grades.C++
            else if (s <= 80) grades.D++
            else grades.F++

            // 주간 트렌드
            const created = new Date(p.created_at)
            if (created >= oneWeekAgo) {
              thisWeekTotal++
              if (p.status === 'in_progress') thisWeekActive++
              if (p.risk_score >= 70) thisWeekHighRisk++
              if (p.status === 'completed') thisWeekCompleted++
            } else if (created >= twoWeeksAgo) {
              lastWeekTotal++
              if (p.status === 'in_progress') lastWeekActive++
              if (p.risk_score >= 70) lastWeekHighRisk++
              if (p.status === 'completed') lastWeekCompleted++
            }
          })

          // 평균 리스크 점수
          setAvgRiskScore(projectsData.length > 0 ? Math.round(totalRisk / projectsData.length) : 0)

          // 리스크 도넛 데이터
          const riskColors: Record<string, string> = {
            A: '#10b981', B: '#34d399', C: '#fbbf24', D: '#f97316', F: '#ef4444'
          }
          setRiskData(
            Object.entries(grades)
              .filter(([, v]) => v > 0)
              .map(([name, value]) => ({ name: `${name}등급`, value, color: riskColors[name] }))
          )

          // 공정 진행률 바 차트 (최근 6개)
          setProgressData(
            projectsData.slice(0, 6).map(p => ({
              name: p.name.length > 8 ? p.name.substring(0, 8) + '...' : p.name,
              진행률: p.progress || 0,
            }))
          )

          // 이번 주 일정
          const weekEnd = new Date(now)
          weekEnd.setDate(weekEnd.getDate() + 7)
          const nowStr = now.toISOString().split('T')[0]
          const weekEndStr = weekEnd.toISOString().split('T')[0]
          const upcoming = projectsData.filter(p => {
            return (p.start_date >= nowStr && p.start_date <= weekEndStr) ||
                   (p.end_date >= nowStr && p.end_date <= weekEndStr)
          }).slice(0, 5)
          setUpcomingSchedule(upcoming)

          // 최근 활동 타임라인 (프로젝트 업데이트 기반)
          const activities: ActivityItem[] = projectsData.slice(0, 8).map(p => {
            const statusLabel: Record<string, string> = {
              planning: '기획 단계', in_progress: '진행 중', review: '검토 중', completed: '완료'
            }
            const statusColors: Record<string, string> = {
              planning: '#6b7280', in_progress: '#3b82f6', review: '#f59e0b', completed: '#10b981'
            }
            return {
              id: p.id,
              type: 'project_update' as const,
              message: `${p.client_name} - ${p.name} (${statusLabel[p.status] || p.status})`,
              time: p.updated_at,
              color: statusColors[p.status] || '#6b7280',
            }
          })
          setActivityLog(activities)

          // 비용 데이터: 프로젝트별 견적 vs 실비용
          const costItems: CostData[] = []
          for (const p of projectsData.slice(0, 6)) {
            const { data: quoteItems } = await supabase
              .from('quote_line_items')
              .select('quantity, unit_price')
              .eq('project_id', p.id)
            const { data: costAnalysis } = await supabase
              .from('cost_analysis')
              .select('adjusted_cost')
              .eq('project_id', p.id)

            const quotedTotal = (quoteItems || []).reduce(
              (sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unit_price)), 0
            )
            const actualTotal = (costAnalysis || []).reduce(
              (sum: number, item: any) => sum + (Number(item.adjusted_cost) || 0), 0
            )

            if (quotedTotal > 0 || actualTotal > 0) {
              costItems.push({
                name: p.name.length > 6 ? p.name.substring(0, 6) + '..' : p.name,
                견적: Math.round(quotedTotal / 10000),
                실비용: Math.round(actualTotal / 10000),
              })
            }
          }
          setCostData(costItems)

          // 견적 합계
          const { data: quoteData } = await supabase
            .from('quote_line_items').select('quantity, unit_price')
          let totalAmount = 0
          if (quoteData) {
            totalAmount = quoteData.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0)
          }

          // 알림 생성
          const newAlerts: typeof alerts = []
          const highRiskProjects = projectsData.filter(p => p.risk_score >= 70)
          if (highRiskProjects.length > 0) {
            newAlerts.push({
              type: 'danger', icon: '🚨',
              title: `고위험 프로젝트 ${highRiskProjects.length}건`,
              desc: highRiskProjects.map(p => p.name).join(', ') + ' - 리스크 점검이 필요합니다',
            })
          }
          const deadlineSoon = projectsData.filter(p => {
            if (!p.end_date || p.status === 'completed') return false
            const daysLeft = Math.ceil((new Date(p.end_date).getTime() - Date.now()) / 86400000)
            return daysLeft >= 0 && daysLeft <= 7
          })
          if (deadlineSoon.length > 0) {
            newAlerts.push({
              type: 'warning', icon: '⚠️',
              title: `마감 임박 프로젝트 ${deadlineSoon.length}건`,
              desc: deadlineSoon.map(p => p.name).join(', ') + ' - 7일 이내 마감',
            })
          }
          const delayedProjects = projectsData.filter(p => {
            if (!p.end_date || p.status === 'completed') return false
            return new Date(p.end_date).getTime() < Date.now()
          })
          if (delayedProjects.length > 0) {
            newAlerts.push({
              type: 'danger', icon: '🚫',
              title: `마감 초과 프로젝트 ${delayedProjects.length}건`,
              desc: delayedProjects.map(p => p.name).join(', ') + ' - 즉시 확인이 필요합니다',
            })
          }
          if (active > 0 && completed === 0) {
            newAlerts.push({
              type: 'info', icon: '💡',
              title: '아직 완료된 프로젝트가 없습니다',
              desc: '진행중인 프로젝트를 관리하고 완료 처리하세요',
            })
          }
          setAlerts(newAlerts)

          setStats({
            totalProjects: projectsData.length,
            activeProjects: active,
            completedProjects: completed,
            highRiskProjects: highRisk,
            totalQuoteAmount: totalAmount,
            weekTrend: {
              total: thisWeekTotal - lastWeekTotal,
              active: thisWeekActive - lastWeekActive,
              highRisk: thisWeekHighRisk - lastWeekHighRisk,
              completed: thisWeekCompleted - lastWeekCompleted,
            },
          })
        }
      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억원`
    if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만원`
    return `${amount.toLocaleString()}원`
  }

  const getRiskGrade = (score: number) => {
    if (score <= 20) return { grade: 'A', color: '#10b981' }
    if (score <= 40) return { grade: 'B', color: '#34d399' }
    if (score <= 60) return { grade: 'C', color: '#fbbf24' }
    if (score <= 80) return { grade: 'D', color: '#f97316' }
    return { grade: 'F', color: '#ef4444' }
  }

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      planning: { label: '기획', color: '#6b7280' },
      in_progress: { label: '진행중', color: '#3b82f6' },
      review: { label: '검토', color: '#f59e0b' },
      completed: { label: '완료', color: '#10b981' },
    }
    return map[status] || { label: status, color: '#6b7280' }
  }

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  const renderTrend = (value: number) => {
    if (value > 0) return <span className={styles.trendUp}>+{value} ▲</span>
    if (value < 0) return <span className={styles.trendDown}>{value} ▼</span>
    return <span className={styles.trendNeutral}>변동없음</span>
  }

  // 반원형 게이지 SVG 계산
  const renderGauge = (score: number) => {
    const risk = getRiskGrade(score)
    const angle = (score / 100) * 180
    const radians = (angle * Math.PI) / 180
    const x = 100 + 70 * Math.cos(Math.PI - radians)
    const y = 100 - 70 * Math.sin(Math.PI - radians)
    const largeArc = angle > 90 ? 1 : 0

    return (
      <div className={styles.gaugeContainer}>
        <svg viewBox="0 0 200 120" className={styles.gaugeSvg}>
          {/* 배경 호 */}
          <path d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
          {/* 값 호 */}
          {score > 0 && (
            <path d={`M 30 100 A 70 70 0 ${largeArc} 1 ${x} ${y}`} fill="none" stroke={risk.color} strokeWidth="14" strokeLinecap="round" />
          )}
          {/* 중앙 텍스트 */}
          <text x="100" y="85" textAnchor="middle" className={styles.gaugeScore}>{score}</text>
          <text x="100" y="105" textAnchor="middle" className={styles.gaugeLabel}>{risk.grade}등급</text>
        </svg>
        <div className={styles.gaugeLabels}>
          <span>0</span>
          <span className={styles.gaugeTitle}>평균 리스크</span>
          <span>100</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <div className={styles.spinner} />
          <span>대시보드를 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Welcome Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.welcome}>
            <h1>안녕하세요, {userName}님</h1>
            <p>오늘의 현장 현황입니다</p>
          </div>
          <div className={styles.headerDate}>
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Alert Cards */}
        {alerts.length > 0 && (
          <section className={styles.alertSection}>
            {alerts.map((alert, i) => (
              <div key={i} className={`${styles.alertCard} ${styles[`alert_${alert.type}`]}`}>
                <span className={styles.alertIcon}>{alert.icon}</span>
                <div className={styles.alertContent}>
                  <div className={styles.alertTitle}>{alert.title}</div>
                  <div className={styles.alertDesc}>{alert.desc}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* KPI Cards */}
        <section className={styles.kpiGrid}>
          <div className={`${styles.kpiCard} ${styles.kpiPurple}`}>
            <div className={styles.kpiIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiValue}>{stats.totalProjects}</span>
              <span className={styles.kpiLabel}>전체 프로젝트</span>
              <span className={styles.kpiTrend}>{renderTrend(stats.weekTrend.total)}</span>
            </div>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiBlue}`}>
            <div className={styles.kpiIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiValue}>{stats.activeProjects}</span>
              <span className={styles.kpiLabel}>진행중</span>
              <span className={styles.kpiTrend}>{renderTrend(stats.weekTrend.active)}</span>
            </div>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiRed}`}>
            <div className={styles.kpiIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiValue}>{stats.highRiskProjects}</span>
              <span className={styles.kpiLabel}>고위험</span>
              <span className={styles.kpiTrend}>{renderTrend(stats.weekTrend.highRisk)}</span>
            </div>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
            <div className={styles.kpiIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiValue}>{stats.completedProjects}</span>
              <span className={styles.kpiLabel}>완료</span>
              <span className={styles.kpiTrend}>{renderTrend(stats.weekTrend.completed)}</span>
            </div>
          </div>
        </section>

        {/* Total Amount Banner */}
        <section className={styles.amountBanner}>
          <div className={styles.amountInfo}>
            <span className={styles.amountLabel}>총 견적 금액</span>
            <span className={styles.amountValue}>{formatAmount(stats.totalQuoteAmount)}</span>
          </div>
          <div className={styles.amountDeco}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8"/><path d="M12 18V6"/></svg>
          </div>
        </section>

        {/* Charts Row 1: Risk Donut + Risk Gauge */}
        <div className={styles.chartsRow}>
          {/* Risk Donut */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>리스크 등급 분포</h2>
            {riskData.length > 0 ? (
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                      {riskData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.legendList}>
                  {riskData.map((d, i) => (
                    <div key={i} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: d.color }} />
                      <span>{d.name}</span>
                      <strong>{d.value}개</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.chartEmpty}>프로젝트를 추가하면 리스크 분포가 표시됩니다</div>
            )}
          </section>

          {/* Risk Gauge */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>전체 리스크 게이지</h2>
            {projects.length > 0 ? (
              renderGauge(avgRiskScore)
            ) : (
              <div className={styles.chartEmpty}>프로젝트를 추가하면 리스크 게이지가 표시됩니다</div>
            )}
          </section>
        </div>

        {/* Charts Row 2: Cost Chart + Progress Bar */}
        <div className={styles.chartsRow}>
          {/* 비용 추이 그래프 */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>프로젝트별 비용 비교 (만원)</h2>
            {costData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={costData} margin={{ left: 0, right: 10, top: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()}만원`} />
                  <Legend />
                  <Bar dataKey="견적" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="실비용" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.chartEmpty}>견적 또는 비용 데이터가 있으면 비교 차트가 표시됩니다</div>
            )}
          </section>

          {/* Progress Bar Chart */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>프로젝트별 진행률</h2>
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={progressData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="진행률" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.chartEmpty}>프로젝트를 추가하면 진행률 차트가 표시됩니다</div>
            )}
          </section>
        </div>

        {/* Bottom Row: Recent + Schedule + Activity Timeline */}
        <div className={styles.tripleRow}>
          {/* Recent Projects */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>최근 프로젝트</h2>
              <button className={styles.viewAllBtn} onClick={() => router.push('/projects')}>전체보기</button>
            </div>
            <div className={styles.recentList}>
              {projects.slice(0, 5).map(project => {
                const risk = getRiskGrade(project.risk_score || 0)
                const status = getStatusInfo(project.status)
                return (
                  <div
                    key={project.id}
                    className={styles.recentItem}
                    onClick={() => router.push(`/projects/${project.id}/diagnostic`)}
                  >
                    <div className={styles.recentColorBar} style={{ background: status.color }} />
                    <div className={styles.recentInfo}>
                      <span className={styles.recentName}>{project.name}</span>
                      <span className={styles.recentClient}>{project.client_name}</span>
                    </div>
                    <span className={styles.recentStatus} style={{ background: `${status.color}18`, color: status.color }}>
                      {status.label}
                    </span>
                    <span className={styles.riskGradeBadge} style={{ background: `${risk.color}18`, color: risk.color }}>
                      {risk.grade}
                    </span>
                    <span className={styles.recentTime}>{getTimeAgo(project.updated_at)}</span>
                  </div>
                )
              })}
              {projects.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <h3>첫 프로젝트를 만들어보세요!</h3>
                  <p>프로젝트를 생성하고 진단부터 리포트까지 한번에 관리하세요</p>
                  <button className={styles.emptyBtn} onClick={() => router.push('/projects')}>
                    프로젝트 만들기
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Activity Timeline */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>최근 활동</h2>
            <div className={styles.activityList}>
              {activityLog.length > 0 ? activityLog.map((activity, i) => (
                <div key={i} className={styles.activityItem}>
                  <div className={styles.activityDot} style={{ background: activity.color }} />
                  {i < activityLog.length - 1 && <div className={styles.activityLine} />}
                  <div className={styles.activityContent}>
                    <span className={styles.activityMessage}>{activity.message}</span>
                    <span className={styles.activityTime}>{getTimeAgo(activity.time)}</span>
                  </div>
                </div>
              )) : (
                <div className={styles.scheduleEmpty}>아직 활동 내역이 없습니다</div>
              )}
            </div>
          </section>

          {/* Schedule */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>이번 주 일정</h2>
            <div className={styles.scheduleList}>
              {upcomingSchedule.length > 0 ? upcomingSchedule.map(p => (
                <div key={p.id} className={styles.scheduleItem} onClick={() => router.push(`/projects/${p.id}/process`)}>
                  <div className={styles.scheduleDot} />
                  <div className={styles.scheduleInfo}>
                    <span className={styles.scheduleName}>{p.name}</span>
                    <span className={styles.scheduleDate}>
                      {p.start_date} ~ {p.end_date}
                    </span>
                  </div>
                  <span className={styles.scheduleStatus} style={{ color: getStatusInfo(p.status).color }}>
                    {getStatusInfo(p.status).label}
                  </span>
                </div>
              )) : (
                <div className={styles.scheduleEmpty}>
                  <span>이번 주 예정된 일정이 없습니다</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
