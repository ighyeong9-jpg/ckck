'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AlertBanner from '@/components/ui/AlertBanner'
import { SAFETY_LEVELS, getSafetyLevelFromRate } from '@/types/safety-levels'

interface Project {
  id: string
  name: string
  status: string
  risk_score: number | null
  progress: number | null
  end_date: string | null
}

interface Issue {
  id: string
  title: string
  status: string
  project_id: string
  created_at: string
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

export default function DashboardPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('소장님')

  const highestRisk = projects.reduce((max, p) => Math.max(max, p.risk_score ?? 0), 0)
  const activeProjects = projects.filter(p => p.status !== 'completed').length
  const pendingIssues = issues.filter(i => i.status === 'open' || i.status === 'reviewing').length
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

        const [{ data: projectData }, { data: issueData }] = await Promise.all([
          supabase.from('projects').select('id,name,status,risk_score,progress,end_date').eq('user_id', user.id).limit(10),
          supabase.from('issues').select('id,title,status,project_id,created_at').eq('user_id', user.id).limit(20),
        ])

        setProjects(projectData ?? [])
        setIssues(issueData ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const riskColor =
    highestRisk >= 61 ? 'text-red-500' :
    highestRisk >= 31 ? 'text-amber-500' :
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

  return (
    <div className="p-7 space-y-6">
      {/* 알림 배너 (리스크 61+) */}
      <AlertBanner score={highestRisk} />

      {/* 파일럿 배너 */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl p-4 flex items-center justify-between fade-up">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <div>
            <div className="text-sm font-bold text-white">파일럿 프로그램 진행 중</div>
            <div className="text-xs text-white/70 mt-0.5">4주 무료 · 정식 출시 후 6개월 50% 할인 · 12개 법규 자동확인</div>
          </div>
        </div>
        <Link href="/pricing" className="text-xs font-bold text-orange-500 bg-white px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors flex-shrink-0">
          플랜 보기
        </Link>
      </div>

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
          badge={highestRisk >= 61 ? { text: '⚡ HIGH', variant: 'red' } : highestRisk >= 31 ? { text: '주의', variant: 'amber' } : { text: '안전', variant: 'green' }}
          delay={0}
        />
        <KpiCard label="진행 중 현장" value={activeProjects} unit="개" badge={{ text: '진행 중', variant: 'blue' }} delay={0.1} />
        <KpiCard label="미처리 이슈" value={pendingIssues} unit="건" color={pendingIssues > 0 ? 'text-amber-500' : 'text-green-500'} badge={pendingIssues > 0 ? { text: '처리 필요', variant: 'amber' } : { text: '이상 없음', variant: 'green' }} delay={0.2} />
        <KpiCard label="평균 진행률" value={avgProgress} unit="%" badge={{ text: '전체', variant: 'blue' }} delay={0.3} />
      </div>

      {/* 4단계 안전 현황 뱃지 */}
      <div className="flex flex-wrap gap-3 fade-up" style={{ animationDelay: '0.15s' }}>
        {(['safe', 'caution', 'warning', 'danger'] as const).map(level => {
          const info = SAFETY_LEVELS[level]
          const count = projects.filter(p => getSafetyLevelFromRate(p.progress ?? 0) === level).length
          return (
            <span key={level} style={{ background: info.bg, color: info.color, padding: '6px 14px', borderRadius: '1rem', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {info.icon} {info.label} {count}개
            </span>
          )
        })}
      </div>

      {/* 5종 세트 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 fade-up" style={{ animationDelay: '0.2s' }}>
        {[
          { icon: '🛡️', label: '안전관리', desc: '체크리스트·TBM', color: 'from-green-500/10 to-green-600/5', textColor: 'text-green-600', href: '/projects' },
          { icon: '🔧', label: '공정관리', desc: '일정·진행률', color: 'from-blue-500/10 to-blue-600/5', textColor: 'text-blue-600', href: '/projects' },
          { icon: '👷', label: '인력현장', desc: 'QR출역·인력', color: 'from-amber-500/10 to-amber-600/5', textColor: 'text-amber-600', href: '/projects' },
          { icon: '📦', label: '자재비용', desc: '자재·예산', color: 'from-purple-500/10 to-purple-600/5', textColor: 'text-purple-600', href: '/quotes' },
          { icon: '⚖️', label: '법규증빙', desc: '12법규·서류', color: 'from-red-500/10 to-red-600/5', textColor: 'text-red-600', href: '/warranty' },
        ].map((set) => (
          <Link
            key={set.label}
            href={set.href}
            className={`bg-gradient-to-br ${set.color} border border-gray-200 rounded-xl p-4 shadow-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block`}
          >
            <div className="text-2xl mb-2">{set.icon}</div>
            <div className={`text-[13px] font-bold ${set.textColor}`}>{set.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{set.desc}</div>
          </Link>
        ))}
      </div>

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
              {highestRisk >= 61 ? (
                <>현재 리스크 점수가 <strong className="text-orange-500">{highestRisk}점</strong>으로 기록 관리 위험 구간입니다. 즉시 증빙 패키지를 확보하고 현장 기록을 보강하세요.</>
              ) : activeProjects === 0 ? (
                <>현재 진행 중인 현장이 없습니다. <strong className="text-orange-500">새 현장을 추가</strong>하고 체크인로 관리를 시작하세요.</>
              ) : (
                <>현재 <strong className="text-orange-500">{activeProjects}개</strong> 현장이 진행 중입니다. 리스크 점수가 양호한 상태입니다. 꾸준한 기록으로 기록 관리을 예방하세요.</>
              )}
            </p>
            {highestRisk >= 61 && (
              <Link href="/projects" className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
                🛡 증빙 패키지 확보 →
              </Link>
            )}
          </div>

          {/* 현장 목록 */}
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
                  const riskCls = risk >= 61 ? 'text-red-500' : risk >= 31 ? 'text-amber-500' : 'text-green-500'
                  const barCls = prog >= 70 ? 'bg-green-500' : prog >= 40 ? 'bg-amber-500' : 'bg-red-400'
                  return (
                    <li key={project.id}>
                      <Link href={`/projects/${project.id}/diagnostic`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-gray-900 truncate">{project.name}</div>
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
            <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">리스크 점수</div>
            <div
              className={`text-[56px] font-black leading-none text-center mb-1.5 ${riskColor}`}
              style={{ textShadow: highestRisk >= 61 ? '0 0 30px rgba(239,68,68,0.4)' : undefined }}
            >
              {highestRisk}
            </div>
            <div className="text-center text-sm text-white/50 mb-4">
              기록 관리 위험{' '}
              <strong className={riskColor}>
                {highestRisk >= 61 ? '높음' : highestRisk >= 31 ? '보통' : '낮음'}
              </strong>
            </div>
            {/* 리스크 바 */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all ${highestRisk >= 61 ? 'bg-red-500' : highestRisk >= 31 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${highestRisk}%` }}
              />
            </div>
            <Link
              href="/projects"
              className="block text-center py-2.5 rounded-lg text-sm font-bold text-white bg-orange-500 hover:bg-orange-400 transition-colors"
            >
              🛡 지금 시공 기록 확보
            </Link>
          </div>

          {/* 하자담보 현황 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-card fade-up" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-gray-900">🛡️ 하자담보</h3>
              <Link href="/warranty" className="text-xs font-semibold text-orange-500 hover:text-orange-400 transition-colors">관리 →</Link>
            </div>
            <div className="space-y-2.5">
              {[
                { label: '방수', months: 36, status: '정상', color: 'text-green-500' },
                { label: '타일', months: 12, status: '주의', color: 'text-amber-500' },
                { label: '도장', months: 6, status: '만료임박', color: 'text-red-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-xs font-semibold text-gray-700">{item.label}</div>
                    <div className="text-[10px] text-gray-400">{item.months}개월</div>
                  </div>
                  <span className={`text-[10px] font-bold ${item.color}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
