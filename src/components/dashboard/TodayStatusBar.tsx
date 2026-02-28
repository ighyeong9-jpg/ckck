'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './TodayStatusBar.module.scss'

interface Counts {
  activeProjects: number
  pendingChanges: number
  disputeSignals: number
  expiringWarranty: number
}

const STATS = [
  {
    key: 'activeProjects' as keyof Counts,
    label: '진행 중인 현장',
    unit: '개',
    urgentThreshold: -1, // 항상 non-urgent (정보용)
    sectionId: 'section-projects',
    urgentColor: '#4f46e5',
    normalColor: '#4f46e5',
  },
  {
    key: 'pendingChanges' as keyof Counts,
    label: '확인 필요',
    unit: '건',
    urgentThreshold: 0,
    sectionId: 'section-todo',
    urgentColor: '#FF6B2B',
    normalColor: '#9ca3af',
  },
  {
    key: 'disputeSignals' as keyof Counts,
    label: 'AI 감지 리스크',
    unit: '건',
    urgentThreshold: 0,
    sectionId: 'section-risks',
    urgentColor: '#FF3B5C',
    normalColor: '#9ca3af',
  },
  {
    key: 'expiringWarranty' as keyof Counts,
    label: '하자담보 만료 임박',
    unit: '건',
    urgentThreshold: 0,
    sectionId: 'section-warranty',
    urgentColor: '#FFB800',
    normalColor: '#9ca3af',
  },
]

export default function TodayStatusBar() {
  const [counts, setCounts] = useState<Counts>({
    activeProjects: 0,
    pendingChanges: 0,
    disputeSignals: 0,
    expiringWarranty: 0,
  })
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  const load = useCallback(async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString()
      const now = new Date().toISOString()

      const [
        { count: activeProjects },
        { count: pendingChanges },
        { count: disputeSignals },
        { count: expiringWarranty },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'in_progress'),
        supabase
          .from('change_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'requested'),
        supabase
          .from('dispute_signals')
          .select('*', { count: 'exact', head: true })
          .eq('resolved', false),
        supabase
          .from('warranty_tracking')
          .select('*', { count: 'exact', head: true })
          .lt('expires_date', thirtyDaysLater)
          .gt('expires_date', now),
      ])

      const newCounts = {
        activeProjects: activeProjects ?? 0,
        pendingChanges: pendingChanges ?? 0,
        disputeSignals: disputeSignals ?? 0,
        expiringWarranty: expiringWarranty ?? 0,
      }
      setCounts(newCounts)
      setHasData((activeProjects ?? 0) > 0)
    } catch (err) {
      console.error('[TodayStatusBar] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  // 탭 타이틀 뱃지 (미확인 건수)
  useEffect(() => {
    const urgent = counts.pendingChanges + counts.disputeSignals + counts.expiringWarranty
    document.title = urgent > 0 ? `(${urgent}) 체크인` : '체크인'
  }, [counts])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (loading) {
    return (
      <div className={styles.skeleton}>
        {[1, 2, 3, 4].map(i => <div key={i} className={styles.skeletonItem} />)}
      </div>
    )
  }

  // 현장 없을 때 빈 상태
  if (!hasData) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>✨</span>
        <p>아직 현장이 없어요. 첫 현장을 등록하면 AI가 자동으로 채워줘요</p>
      </div>
    )
  }

  return (
    <div className={styles.bar}>
      {STATS.map(stat => {
        const value = counts[stat.key]
        const isUrgent = stat.urgentThreshold >= 0 && value > stat.urgentThreshold
        const color = isUrgent ? stat.urgentColor : stat.normalColor

        return (
          <button
            key={stat.key}
            className={`${styles.stat} ${isUrgent ? styles.statUrgent : ''}`}
            style={{ '--stat-color': color } as React.CSSProperties}
            onClick={() => scrollTo(stat.sectionId)}
            aria-label={`${stat.label} ${value}${stat.unit}`}
          >
            {isUrgent && <span className={styles.urgentDot} />}
            <span className={styles.value}>
              {value}
              <span className={styles.unit}>{stat.unit}</span>
            </span>
            <span className={styles.label}>{stat.label}</span>
          </button>
        )
      })}
    </div>
  )
}
