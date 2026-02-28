'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Project, ProjectStatus, CreateProjectInput } from '@/types/project'
import { SAFETY_LEVELS, getSafetyLevelFromRate } from '@/types/safety-levels'
import QuickStart from '@/components/onboarding/QuickStart'
import { DEFAULT_PROCESSES } from '@/types/process'
import { logActivity } from '@/lib/activity/logger'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

const INDUSTRY_ICONS: Record<string, string> = {
  cafe: '☕', restaurant: '🍽️', bar: '🍺', bakery: '🥐', beauty: '💇',
  clinic: '🏥', fitness: '💪', retail: '🛒', office: '🏢', academy: '📚',
  apartment: '🏠', villa: '🏡', house: '🏘️',
}

export default function ProjectsPage() {
  const supabase = createClient()
  const toast = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [showQuickStart, setShowQuickStart] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '', client_name: '', status: 'planning', start_date: '', end_date: '',
  })

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
      // Show QuickStart for first-time users
      if (data && data.length === 0) {
        setShowQuickStart(true)
      }
    } catch (err: any) {
      console.error('Error fetching projects:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProjects() }, [])

  // 외부 클릭 시 케밥 메뉴 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    setOpenMenuId(null)
    if (!confirm(`"${projectName}" 현장을 삭제하시겠습니까?\n\n삭제하면 모든 데이터가 영구적으로 사라져요.`)) return
    try {
      // site_issues FK가 CASCADE 없음 → 먼저 삭제
      await supabase.from('site_issues').delete().eq('project_id', projectId)

      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) throw error
      setProjects(prev => prev.filter(p => p.id !== projectId))
      toast.success(`"${projectName}" 현장이 삭제되었어요.`)
    } catch (err: any) {
      console.error('[삭제 오류]', err)
      toast.error('삭제 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    // 폼 유효성 확인
    const errs: Record<string, string> = {}
    if (!formData.name.trim()) errs.name = '현장명을 입력해주세요.'
    if (!formData.client_name.trim()) errs.client_name = '고객명을 입력해주세요.'
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      errs.end_date = '종료일은 시작일 이후여야 합니다.'
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setCreating(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')
      const { data, error } = await supabase
        .from('projects').insert([{ ...formData, user_id: user.id, progress: 0, risk_score: 0 }])
        .select().single()
      if (error) throw error

      // 기본 공정 자동 생성 (DEFAULT_PROCESSES)
      if (data?.id) {
        const today = new Date().toISOString().split('T')[0]
        const processRows = DEFAULT_PROCESSES.map((name, i) => ({
          project_id: data.id,
          name,
          status: 'pending',
          progress: 0,
          order_index: i,
          start_date: formData.start_date || today,
          end_date: formData.end_date || null,
        }))
        await supabase.from('processes').insert(processRows)

        // 활동 로그
        logActivity(supabase, {
          userId: user.id,
          projectId: data.id,
          action: 'project_created',
          targetType: 'project',
          targetId: data.id,
          meta: { name: data.name, clientName: data.client_name, status: data.status },
        }).catch(() => {})
      }

      setProjects(prev => [data, ...prev])
      setFormData({ name: '', client_name: '', status: 'planning', start_date: '', end_date: '' })
      setShowModal(false)
      toast.success(`"${data.name}" 현장이 등록됐어요! 기본 공정 ${DEFAULT_PROCESSES.length}개도 자동으로 추가했습니다.`)
    } catch (err: any) {
      const msg = err?.message?.includes('duplicate') ? '이미 같은 이름의 현장이 있어요.' : (err.message || '등록 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.')
      setError(msg)
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  const handleQuickStartComplete = async (data: {
    industry: string; area: string; budget: string; projectName: string; clientName: string
  }) => {
    setShowQuickStart(false)
    // Trigger AI Agent to create the project
    const btn = document.querySelector('[aria-label="AI 비서 체키"]') as HTMLButtonElement
    if (btn) {
      btn.click()
      // Send message to Agent after panel opens
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="체키에게 물어보세요..."]') as HTMLInputElement
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
          )?.set
          nativeInputValueSetter?.call(input, `${data.industry} ${data.area}평 ${data.projectName} 프로젝트 만들어줘. 고객명: ${data.clientName}${data.budget ? `, 예산: ${data.budget}만원` : ''}`)
          input.dispatchEvent(new Event('input', { bubbles: true }))
          // Auto-submit
          setTimeout(() => {
            const sendBtn = input.closest('div')?.querySelector('button:last-child') as HTMLButtonElement
            if (sendBtn && !sendBtn.disabled) sendBtn.click()
          }, 300)
        }
      }, 500)
    }
  }

  const getStatusText = (status: ProjectStatus) => {
    const m: Record<string, string> = { planning: '기획', in_progress: '진행중', review: '검토', completed: '완료' }
    return m[status] || status
  }

  const getStatusColor = (status: ProjectStatus) => {
    const m: Record<string, string> = { planning: '#6b7280', in_progress: '#3b82f6', review: '#f59e0b', completed: '#10b981' }
    return m[status] || '#6b7280'
  }

  const getRiskGrade = (score: number) => {
    if (score <= 20) return { grade: 'A', color: '#10b981', bg: '#d1fae5' }
    if (score <= 40) return { grade: 'B', color: '#34d399', bg: '#d1fae5' }
    if (score <= 60) return { grade: 'C', color: '#d97706', bg: '#fef3c7' }
    if (score <= 80) return { grade: 'D', color: '#f97316', bg: '#ffedd5' }
    return { grade: 'F', color: '#ef4444', bg: '#fee2e2' }
  }

  const getDday = (endDate: string | null, status: string) => {
    if (!endDate || status === 'completed') return null
    const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
    if (daysLeft < 0) return { label: `D+${Math.abs(daysLeft)}`, type: 'overdue' as const }
    if (daysLeft === 0) return { label: 'D-Day', type: 'today' as const }
    if (daysLeft <= 7) return { label: `D-${daysLeft}`, type: 'soon' as const }
    return null
  }

  const formatDateKR = (dateStr: string | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const filteredProjects = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  if (loading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <div className={styles.skeletonLine} style={{ width: '120px', height: '28px' }} />
              <div className={styles.skeletonLine} style={{ width: '200px', height: '16px', marginTop: '8px' }} />
            </div>
          </div>
        </header>
        <main className={styles.main}>
          <section className={styles.statCards}>
            {[1,2,3,4].map(i => (
              <div key={i} className={styles.skeletonStat} />
            ))}
          </section>
          <section className={styles.projectList}>
            {[1,2,3].map(i => (
              <div key={i} className={styles.skeletonProject} />
            ))}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>현장 관리</h1>
            <p className={styles.subtitle}>진행 중인 모든 현장을 관리하세요</p>
          </div>
          <button type="button" className={styles.newProjectBtn} onClick={() => setShowModal(true)}>
            + 새 현장
          </button>
          <button type="button" className={styles.newProjectBtn} style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }} onClick={() => {
            const btn = document.querySelector('[aria-label="AI 비서 체키"]') as HTMLButtonElement
            if (btn) btn.click()
          }}>
            ⚡ AI 빠른 생성
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Stats */}
        <section className={styles.statCards}>
          {[
            { label: '전체', value: projects.length, color: '#7c3aed' },
            { label: '진행중', value: projects.filter(p => p.status === 'in_progress').length, color: '#3b82f6' },
            { label: '고위험', value: projects.filter(p => p.risk_score > 60).length, color: '#ef4444' },
            { label: '완료', value: projects.filter(p => p.status === 'completed').length, color: '#10b981' },
          ].map((s, i) => (
            <div key={i} className={styles.statCard}>
              <span className={styles.statValue} style={{ color: s.color }}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </section>

        {/* Filter */}
        <section className={styles.filterSection}>
          <div className={styles.filterButtons}>
            {[
              { key: 'all', label: '전체' },
              { key: 'planning', label: '기획' },
              { key: 'in_progress', label: '진행중' },
              { key: 'review', label: '검토' },
              { key: 'completed', label: '완료' },
            ].map(f => (
              <button
                key={f.key} type="button"
                className={`${styles.filterBtn} ${filter === f.key ? styles.active : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Project List */}
        <section className={styles.projectList}>
          {filteredProjects.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h3>첫 현장을 등록해보세요!</h3>
              <p>현장을 등록하면 진단부터 리포트까지<br/>모든 과정을 체계적으로 관리할 수 있습니다</p>
              <div className={styles.emptyActions}>
                <button type="button" className={styles.emptyBtn} onClick={() => setShowModal(true)}>
                  + 새 현장 등록
                </button>
                <button type="button" className={styles.emptyBtnAlt} onClick={() => setShowQuickStart(true)}>
                  ⚡ 퀵스타트로 시작
                </button>
              </div>
            </div>
          ) : (
            filteredProjects.map(project => {
              const risk = getRiskGrade(project.risk_score)
              const statusColor = getStatusColor(project.status)
              const industryIcon = INDUSTRY_ICONS[project.industry] || '🏗️'
              const progress = project.progress || 0
              const dday = getDday(project.end_date, project.status)
              const isHighRisk = project.risk_score >= 70
              // SVG circular progress
              const radius = 22
              const circumference = 2 * Math.PI * radius
              const strokeDashoffset = circumference - (progress / 100) * circumference
              const timeAgo = (() => {
                const diff = Date.now() - new Date(project.updated_at).getTime()
                const mins = Math.floor(diff / 60000)
                if (mins < 60) return `${mins}분 전`
                const hours = Math.floor(mins / 60)
                if (hours < 24) return `${hours}시간 전`
                return `${Math.floor(hours / 24)}일 전`
              })()
              return (
                <div key={project.id} className={styles.cardWrap} ref={openMenuId === project.id ? menuRef : null}>
                  {/* 케밥 메뉴 */}
                  <div className={styles.kebabWrap}>
                    <button
                      className={styles.kebabBtn}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(openMenuId === project.id ? null : project.id) }}
                      aria-label="현장 메뉴"
                    >⋯</button>
                    {openMenuId === project.id && (
                      <div className={styles.kebabMenu}>
                        <button
                          className={`${styles.kebabItem} ${styles.danger}`}
                          onClick={e => { e.stopPropagation(); handleDeleteProject(project.id, project.name) }}
                        >
                          🗑️ 현장 삭제
                        </button>
                      </div>
                    )}
                  </div>
                <Link
                  href={`/projects/${project.id}/diagnostic`}
                  className={`${styles.projectCard} ${isHighRisk ? styles.highRisk : ''}`}
                >
                  <div className={styles.cardColorBar} style={{ background: statusColor }} />
                  <div className={styles.cardBody}>
                    <div className={styles.cardTop}>
                      <span className={styles.industryIcon}>{industryIcon}</span>
                      <div className={styles.cardInfo}>
                        <h3 className={styles.projectName}>{project.name}</h3>
                        <span className={styles.projectClient}>{project.client_name}</span>
                      </div>
                      <div className={styles.cardBadges}>
                        {dday && (
                          <span className={`${styles.ddayBadge} ${styles[`dday_${dday.type}`]}`}>
                            {dday.label}
                          </span>
                        )}
                        <span className={styles.statusBadge} style={{ background: `${statusColor}18`, color: statusColor }}>
                          {getStatusText(project.status)}
                        </span>
                        <span className={styles.riskBadge} style={{ background: risk.bg, color: risk.color }}>
                          {risk.grade}
                        </span>
                        {(() => {
                          const sl = getSafetyLevelFromRate(progress)
                          const si = SAFETY_LEVELS[sl]
                          return (
                            <span style={{ background: si.bg, color: si.color, padding: '2px 8px', borderRadius: '1rem', fontSize: '11px', fontWeight: 600 }}>
                              {si.icon} {si.label}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                    <div className={styles.cardMiddle}>
                      <div className={styles.circularProgress}>
                        <svg width="56" height="56" viewBox="0 0 56 56">
                          <circle cx="28" cy="28" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="4" />
                          <circle
                            cx="28" cy="28" r={radius} fill="none"
                            stroke={progress >= 100 ? '#10b981' : '#7c3aed'}
                            strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 28 28)"
                            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                          />
                          <text x="28" y="32" textAnchor="middle" className={styles.circularText}>
                            {progress}%
                          </text>
                        </svg>
                      </div>
                      <div className={styles.cardProgress}>
                        <div className={styles.progressInfo}>
                          <span>진행률</span>
                          <span className={styles.progressPercent}>{progress}%</span>
                        </div>
                        <div className={styles.progressTrack}>
                          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className={styles.cardFooter}>
                      <span className={styles.cardDate}>
                        {formatDateKR(project.start_date)} ~ {formatDateKR(project.end_date)}
                      </span>
                      <span className={styles.smartBadge}>
                        {project.status === 'completed' ? '✅ 완료' :
                         risk.grade === 'A' ? '🛡️ 안전 관리중' :
                         risk.grade === 'B' ? '📋 스마트 관리중' :
                         '⚡ AI 모니터링중'}
                      </span>
                      <span className={styles.cardUpdated}>
                        {timeAgo} 수정
                      </span>
                    </div>
                  </div>
                </Link>
                </div>
              )
            })
          )}
        </section>
      </main>

      {/* Create Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>새 현장 등록</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateProject} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="name">현장명 <span className={styles.required}>*</span></label>
                <input id="name" type="text" value={formData.name}
                  onChange={e => { setFormData(prev => ({ ...prev, name: e.target.value })); setFieldErrors(prev => ({ ...prev, name: '' })) }}
                  placeholder="예: 강남 오피스텔 리모델링"
                  className={fieldErrors.name ? styles.inputError : ''} />
                {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="client_name">고객명 <span className={styles.required}>*</span></label>
                <input id="client_name" type="text" value={formData.client_name}
                  onChange={e => { setFormData(prev => ({ ...prev, client_name: e.target.value })); setFieldErrors(prev => ({ ...prev, client_name: '' })) }}
                  placeholder="예: 홍길동"
                  className={fieldErrors.client_name ? styles.inputError : ''} />
                {fieldErrors.client_name && <span className={styles.fieldError}>{fieldErrors.client_name}</span>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="status">상태</label>
                <select id="status" value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}>
                  <option value="planning">기획 중</option>
                  <option value="in_progress">진행 중</option>
                  <option value="review">검토 중</option>
                  <option value="completed">완료</option>
                </select>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="start_date">시작일</label>
                  <input id="start_date" type="date" value={formData.start_date}
                    onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))} required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="end_date">종료일</label>
                  <input id="end_date" type="date" value={formData.end_date}
                    onChange={e => { setFormData(prev => ({ ...prev, end_date: e.target.value })); setFieldErrors(prev => ({ ...prev, end_date: '' })) }}
                    className={fieldErrors.end_date ? styles.inputError : ''} />
                  {fieldErrors.end_date && <span className={styles.fieldError}>{fieldErrors.end_date}</span>}
                </div>
              </div>
              {error && <div className={styles.formError}>{error}</div>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>취소</button>
                <button type="submit" className={styles.submitBtn} disabled={creating}>
                  {creating ? '등록 중...' : '현장 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QuickStart Onboarding */}
      {showQuickStart && (
        <QuickStart
          onComplete={handleQuickStartComplete}
          onClose={() => setShowQuickStart(false)}
        />
      )}
    </div>
  )
}
