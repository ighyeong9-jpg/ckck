'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './ContractorBadge.module.scss'

type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'none'

interface BadgeInfo {
  level: BadgeLevel
  usageMonths: number
  passRate: number
  disputeCount: number
  issuedAt?: string
}

interface ContractorBadgeProps {
  userId?: string          // 다른 업체 프로필 보기용 (없으면 현재 로그인 사용자)
  showDetail?: boolean     // 상세 조건 표시 여부
  size?: 'sm' | 'md' | 'lg'
}

const BADGE_CONFIG = {
  gold:   { icon: '🥇', label: '체크인 Gold 인증 업체',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   borderColor: 'rgba(245,158,11,0.4)' },
  silver: { icon: '🥈', label: '체크인 Silver 인증 업체', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', borderColor: 'rgba(107,114,128,0.4)' },
  bronze: { icon: '🥉', label: '체크인 Bronze 인증 업체', color: '#92400E', bg: 'rgba(146,64,14,0.08)',  borderColor: 'rgba(146,64,14,0.35)' },
  none:   { icon: '',   label: '',                       color: '#9CA3AF', bg: 'transparent',            borderColor: 'transparent' },
}

const BADGE_CONDITIONS = {
  gold:   { months: 6,  passRate: 90, disputes: 0, label: '6개월 이상 · 통과율 90% · 기록 관리 0건' },
  silver: { months: 3,  passRate: 85, disputes: 0, label: '3개월 이상 · 통과율 85% · 기록 관리 0건' },
  bronze: { months: 1,  passRate: 70, disputes: 1, label: '1개월 이상 · 통과율 70% · 기록 관리 1건 이하' },
}

export default function ContractorBadge({ userId, showDetail = false, size = 'md' }: ContractorBadgeProps) {
  const [badge, setBadge] = useState<BadgeInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const targetId = userId ?? (await supabase.auth.getUser()).data.user?.id
        if (!targetId) { setLoading(false); return }

        // contractor_badges 테이블에서 조회
        const { data: existing } = await supabase
          .from('contractor_badges')
          .select('*')
          .eq('user_id', targetId)
          .maybeSingle()

        if (existing) {
          setBadge({
            level: existing.badge_level as BadgeLevel,
            usageMonths: existing.usage_months,
            passRate: existing.pass_rate,
            disputeCount: existing.dispute_count,
            issuedAt: existing.issued_at,
          })
          setLoading(false)
          return
        }

        // 테이블 없으면 실시간 계산
        const { data: projects } = await supabase
          .from('projects')
          .select('created_at, status')
          .eq('user_id', targetId)

        const { count: disputes } = await supabase
          .from('dispute_signals')
          .select('*', { count: 'exact', head: true })
          .eq('resolved', false)

        if (!projects?.length) {
          setBadge({ level: 'none', usageMonths: 0, passRate: 0, disputeCount: 0 })
          setLoading(false)
          return
        }

        const firstProject = projects.sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0]
        const usageMonths = Math.floor(
          (Date.now() - new Date(firstProject.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        )

        const disputeCount = disputes ?? 0
        const passRate = Math.round(
          (projects.filter((p: any) => p.status !== 'cancelled').length / projects.length) * 100
        )

        let level: BadgeLevel = 'none'
        if (usageMonths >= 6 && passRate >= 90 && disputeCount === 0) level = 'gold'
        else if (usageMonths >= 3 && passRate >= 85 && disputeCount === 0) level = 'silver'
        else if (usageMonths >= 1 && passRate >= 70 && disputeCount <= 1) level = 'bronze'

        setBadge({ level, usageMonths, passRate, disputeCount })
      } catch (err) {
        console.error('[ContractorBadge] load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  if (loading) return <div className={`${styles.skeleton} ${styles[size]}`} />
  if (!badge || badge.level === 'none') {
    if (!showDetail) return null
    return (
      <div className={`${styles.progressBox} ${styles[size]}`}>
        <p className={styles.progressTitle}>체크인 인증 업체 조건</p>
        {(Object.keys(BADGE_CONDITIONS) as BadgeLevel[]).filter(k => k !== 'none').map(level => (
          <div key={level} className={styles.conditionRow}>
            <span>{BADGE_CONFIG[level].icon}</span>
            <span>{BADGE_CONDITIONS[level as keyof typeof BADGE_CONDITIONS].label}</span>
          </div>
        ))}
        <p className={styles.progressSub}>현재 {badge?.usageMonths ?? 0}개월 · 통과율 {badge?.passRate ?? 0}%</p>
      </div>
    )
  }

  const cfg = BADGE_CONFIG[badge.level]
  const cond = BADGE_CONDITIONS[badge.level as keyof typeof BADGE_CONDITIONS]

  return (
    <div
      className={`${styles.badge} ${styles[size]}`}
      style={{
        background: cfg.bg,
        borderColor: cfg.borderColor,
        color: cfg.color,
      }}
      title={`${cfg.label} — ${cond.label}`}
    >
      <span className={styles.icon}>{cfg.icon}</span>
      <div className={styles.text}>
        <span className={styles.label}>{cfg.label}</span>
        {showDetail && (
          <span className={styles.detail}>
            {badge.usageMonths}개월 사용 · 통과율 {badge.passRate}% · 기록 관리 {badge.disputeCount}건
          </span>
        )}
      </div>
    </div>
  )
}
