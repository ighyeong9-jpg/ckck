'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AlertBanner from '@/components/ui/AlertBanner'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Project {
  id: string
  name: string
  status: string
  risk_score: number | null
  progress: number | null
  end_date: string | null
}

interface SummaryData {
  total_projects: number
  projects_by_risk: { safe: number; caution: number; warning: number; danger: number }
  average_risk_score: number
  urgent_issues: { project_id: string; project_name: string; issue: string; risk_grade: string }[]
  upcoming_warranty_expiries: { project_name: string; category: string; days_remaining: number; end_date: string }[]
  recent_go_nogo: { go: number; nogo: number }
  risk_trend: { date: string; avg_score: number }[]
  violated_by_project: Record<string, number>
}

// ──── countUp 훅 ────
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * ease))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

function KpiCard({ label, value, unit = '', color = 'text-navy-800', badge, delay = 0 }: {
  label: string
  value: number
  unit?: string
  color?: string
  badge?: { text: string; variant: 'red' | 'green' | 'amber' | 'blue' }
  delay?: number
}) {
  const displayValue = useCountUp(value, 1200)
  const badgeColors = {
    red:   'bg-red-100 text-red-500',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    blue:  'bg-blue-100 text-blue-600',
  }
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-5 shadow-card transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.04em] mb-2.5">{label}</div>
      <div className={`text-[30px] font-black leading-none mb-2 ${color}`}>
        {displayValue}{unit}
      </div>
      {badge && (
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${badgeColors[badge.variant]}`}>
          {badge.text}
        </span>
      )}
    </div>
  )
}

const GRADE_CONFIG = {
  safe:    { label: '안전',   color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  caution: { label: '주의',   color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  warning: { label: '경고',   color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  danger:  { label: '위험',   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
}

export default function DashboardPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('소장님')
  const [summary, setSummary] = useState<SummaryData | null>(null)

  const highestRisk = projects.reduce((max, p) => Math.max(max, p.risk_score ?? 0), 0)
  const activeProjects = projects.filter(p => p.status !== 'completed').length
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + (p.progress ?? 0), 0) / projects.length)
    : 0

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: settings } = await supabase
          .from('user_settings')
          .select('display_name')
          .eq('user_id', user.id)
          .single()
        if (settings?.display_name) setUserName(settings.display_name)

        const { data: projectData } = await supabase
          .from('projects')
          .select('id,name,status,risk_score,progress,end_date')
          .eq('user_id', user.id)
          .limit(10)
        setProjects(projectData ?? [])

        // 대시보드 요약 API (법령 위반 이슈 + 하자담보 + 추이)
        const res = await fetch('/api/dashboard/summary')
        if (res.ok) {
          const json = await res.json()
          if (json.success) setSummary(json.data)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const riskColor =
    highestRisk >= 76 ? 'text-red-500' :
    highestRisk >= 51 ? 'text-orange-500' :
    highestRisk >= 26 ? 'text-amber-500' :
    'text-green-500'

  if (loading) {
    return (
      <div className="p-7">
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const nogoCount = summary?.recent_go_nogo.nogo ?? 0

  // 온보딩 화면 (프로젝트 없을 때)
  if (!loading && projects.length === 0) {
    return (
      <div className="p-7">
        <div className="max-w-xl mx-auto text-center py-16">
          <div className="text-6xl mb-5">🏗️</div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">체크인에 오신 것을 환영합니다</h1>
          <p className="text-base text-gray-500 mb-8 leading-relaxed">
            첫 현장을 등록하면 체크리스트·법령점검·리스크 관리가<br/>자동으로 시작됩니다.
          </p>
          {/* 3단계 설명 */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { step: '1', icon: '📋', title: '현장 등록', desc: '업종 선택 → 체크리스트 자동 생성' },
              { step: '2', icon: '⚖️', title: '법령 점검', desc: '17개 건설·소방 법령 자동 분석' },
              { step: '3', icon: '📄', title: '증거 패키지', desc: 'SHA-256 해시로 무결성 보장' },
            ].map(item => (
              <div key={item.step} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl mb-1.5">{item.icon}</div>
                <div className="text-xs font-bold text-orange-500 mb-1">Step {item.step}</div>
                <div className="text-sm font-bold text-gray-800 mb-1">{item.title}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 text-base"
          >
            🚀 첫 현장 등록하기
          </Link>
          <p className="mt-3 text-xs text-gray-400">무료로 시작 · 설치 불필요 · 3분 완성</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-7 space-y-6">
      {/* 알림 배너 */}
      <AlertBanner score={highestRisk} />

      {/* 인사 */}
      <div className="fade-up">
        <h1 className="text-[22px] font-black text-gray-900">안녕하세요, {userName} 👋</h1>
        <p className="text-sm text-gray-400 mt-0.5">오늘도 현장을 안전하게 지켜봅시다.</p>
      </div>

      {/* KPI 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="최고 리스크"
          value={highestRisk}
          color={riskColor}
          badge={
            highestRisk >= 76 ? { text: '⚡ 위험', variant: 'red' } :
            highestRisk >= 51 ? { text: '경고', variant: 'amber' } :
            highestRisk >= 26 ? { text: '주의', variant: 'amber' } :
            { text: '안전', variant: 'green' }
          }
          delay={0}
        />
        <KpiCard label="진행 중 현장" value={activeProjects} unit="개" badge={{ text: '진행 중', variant: 'blue' }} delay={0.1} />
        <KpiCard
          label="NO-GO 현황"
          value={nogoCount}
          unit="건"
          color={nogoCount > 0 ? 'text-red-500' : 'text-green-500'}
          badge={nogoCount > 0 ? { text: '법령 위반', variant: 'red' } : { text: '이상 없음', variant: 'green' }}
          delay={0.2}
        />
        <KpiCard label="평균 진행률" value={avgProgress} unit="%" badge={{ text: '전체', variant: 'blue' }} delay={0.3} />
      </div>

      {/* 등급별 현황 (summary API) */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 fade-up" style={{ animationDelay: '0.15s' }}>
          {(Object.keys(GRADE_CONFIG) as (keyof typeof GRADE_CONFIG)[]).map(grade => {
            const cfg = GRADE_CONFIG[grade]
            const count = summary.projects_by_risk[grade]
            return (
              <div key={grade} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
                <div className={`text-[11px] font-semibold uppercase tracking-wider ${cfg.color} mb-1`}>{cfg.label}</div>
                <div className={`text-[28px] font-black leading-none ${cfg.color}`}>{count}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">개 현장</div>
              </div>
            )
          })}
        </div>
      )}

      {/* 2칸 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        {/* 좌측 */}
        <div className="space-y-5">
          {/* AI 브리핑 */}
          <div className="bg-gradient-to-br from-navy-800 to-navy-700 border border-white/[0.08] rounded-xl p-[22px] text-white fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center text-lg animate-pulse-glow">🤖</div>
              <div>
                <div className="text-sm font-bold">체크인 AI 브리핑</div>
                <div className="text-[10px] text-white/40 mt-0.5">자동 생성</div>
              </div>
            </div>
            <p className="text-sm text-white/75 leading-[1.8]">
              {nogoCount > 0 ? (
                <>현재 <strong className="text-red-400">{nogoCount}개</strong> 현장이 NO-GO 상태입니다. 법령 위반 사항을 즉시 해소하고 증빙을 보강하세요.</>
              ) : highestRisk >= 76 ? (
                <>리스크 점수 <strong className="text-orange-500">{highestRisk}점</strong> — 위험 등급. 즉시 증빙 패키지를 확보하고 법령 체크를 실행하세요.</>
              ) : activeProjects === 0 ? (
                <>진행 중인 현장이 없습니다. <strong className="text-orange-500">새 현장을 추가</strong>하고 체크인으로 관리를 시작하세요.</>
              ) : (
                <>현재 <strong className="text-orange-500">{activeProjects}개</strong> 현장이 진행 중입니다. 평균 리스크 {summary?.average_risk_score ?? 0}점 — 꾸준한 기록으로 분쟁을 예방하세요.</>
              )}
            </p>
            {highestRisk >= 51 && (
              <Link href="/projects" className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
                🛡 증빙 패키지 확보 →
              </Link>
            )}
          </div>

          {/* 현장 목록 (GO/NO-GO 배지 포함) */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-card fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-[14px] font-bold text-gray-900">진행 중 현장</h3>
              <Link href="/projects" className="text-xs font-semibold text-orange-500 hover:text-orange-400 transition-colors">전체 보기 →</Link>
            </div>
            {projects.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                현장이 없습니다.{' '}
                <Link href="/projects" className="text-orange-500 font-semibold hover:underline">새 현장 추가 →</Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {projects.slice(0, 5).map((project) => {
                  const risk = project.risk_score ?? 0
                  const prog = project.progress ?? 0
                  const riskCls = risk >= 76 ? 'text-red-500' : risk >= 51 ? 'text-orange-500' : risk >= 26 ? 'text-amber-500' : 'text-green-500'
                  const barCls = prog >= 70 ? 'bg-green-500' : prog >= 40 ? 'bg-amber-500' : 'bg-red-400'
                  const violatedCount = summary?.violated_by_project?.[project.id] ?? 0
                  return (
                    <li key={project.id}>
                      <Link href={`/projects/${project.id}/law-check`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-[13px] font-semibold text-gray-900 truncate">{project.name}</div>
                            {violatedCount > 0 && (
                              <span className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                                법령 미충족 {violatedCount}건
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                              <div className={`h-full ${barCls} rounded-full transition-all`} style={{ width: `${prog}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-400">{prog}%</span>
                          </div>
                        </div>
                        <div className={`text-[15px] font-black ${riskCls} flex-shrink-0`}>{risk}</div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* 우측 */}
        <div className="space-y-5">
          {/* 리스크 점수 카드 */}
          <div className="bg-gradient-to-br from-navy-800 to-navy-700 border border-white/[0.08] rounded-xl p-5 fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">평균 리스크</div>
            <div
              className={`text-[56px] font-black leading-none text-center mb-1.5 ${riskColor}`}
              style={{ textShadow: highestRisk >= 76 ? '0 0 30px rgba(239,68,68,0.4)' : undefined }}
            >
              {summary?.average_risk_score ?? highestRisk}
            </div>
            <div className="text-center text-sm text-white/50 mb-4">
              분쟁 위험{' '}
              <strong className={riskColor}>
                {highestRisk >= 76 ? '위험' : highestRisk >= 51 ? '경고' : highestRisk >= 26 ? '주의' : '안전'}
              </strong>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all ${highestRisk >= 76 ? 'bg-red-500' : highestRisk >= 51 ? 'bg-orange-500' : highestRisk >= 26 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${summary?.average_risk_score ?? highestRisk}%` }}
              />
            </div>
            <Link
              href="/projects"
              className="block text-center py-2.5 rounded-lg text-sm font-bold text-white bg-orange-500 hover:bg-orange-400 transition-colors"
            >
              🛡 지금 증거 확보
            </Link>
          </div>

          {/* 긴급 이슈 (법령 위반) */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card fade-up" style={{ animationDelay: '0.22s' }}>
            <h3 className="text-[14px] font-bold text-gray-900 mb-3">⚠️ 긴급 이슈</h3>
            {!summary || summary.urgent_issues.length === 0 ? (
              <div className="text-xs text-gray-400 py-2">법령 위반 이슈 없음 ✅</div>
            ) : (
              <ul className="space-y-2">
                {summary.urgent_issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-500 text-[11px] font-black mt-0.5 flex-shrink-0">✗</span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-gray-800 truncate">{issue.issue}</div>
                      <div className="text-[10px] text-gray-400 truncate">{issue.project_name}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 하자담보 만료 임박 (실데이터) */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card fade-up" style={{ animationDelay: '0.28s' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-gray-900">🛡️ 하자담보 만료임박</h3>
            </div>
            {!summary || summary.upcoming_warranty_expiries.length === 0 ? (
              <div className="text-xs text-gray-400 py-2">90일 내 만료 예정 없음 ✅</div>
            ) : (
              <div className="space-y-2.5">
                {summary.upcoming_warranty_expiries.slice(0, 4).map((w, i) => {
                  const color = w.days_remaining <= 14 ? 'text-red-500' : w.days_remaining <= 30 ? 'text-amber-500' : 'text-green-600'
                  return (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div>
                        <div className="text-xs font-semibold text-gray-700 truncate max-w-[110px]">{w.category}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[110px]">{w.project_name}</div>
                      </div>
                      <span className={`text-[11px] font-bold ${color}`}>{w.days_remaining}일 후</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 리스크 점수 추이 차트 (최근 30일) */}
      {summary && summary.risk_trend.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-gray-900">📈 리스크 점수 추이 (최근 30일)</h3>
            <span className="text-[11px] text-gray-400">전체 프로젝트 평균</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={summary.risk_trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={v => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                labelFormatter={v => `날짜: ${v}`}
                formatter={(v: number) => [`${v}점`, '평균 리스크']}
              />
              <Area
                type="monotone"
                dataKey="avg_score"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#riskGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#f97316' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
