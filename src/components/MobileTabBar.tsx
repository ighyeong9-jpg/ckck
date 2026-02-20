'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './MobileTabBar.module.scss'

interface Tab {
  icon: string
  label: string
  href: string
  badgeKey?: 'changes' | 'disputes' | 'warranty'
}

const TABS: Tab[] = [
  { icon: '🏠', label: '홈',       href: '/dashboard' },
  { icon: '📋', label: '체크리스트', href: '/projects',  badgeKey: 'changes' },
  { icon: '💬', label: 'AI채팅',    href: '/ai-chat' },
  { icon: '📊', label: '일보',      href: '/reports',   badgeKey: 'disputes' },
  { icon: '⚙️', label: '설정',      href: '/settings' },
]

interface BadgeCounts {
  changes: number
  disputes: number
  warranty: number
}

export default function MobileTabBar() {
  const pathname = usePathname()
  const [badges, setBadges] = useState<BadgeCounts>({ changes: 0, disputes: 0, warranty: 0 })

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      try {
        const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString()
        const now = new Date().toISOString()
        const [
          { count: changes },
          { count: disputes },
          { count: warranty },
        ] = await Promise.all([
          supabase.from('change_orders').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
          supabase.from('dispute_signals').select('*', { count: 'exact', head: true }).eq('resolved', false),
          supabase.from('warranty_tracking').select('*', { count: 'exact', head: true }).lt('expires_date', thirtyDaysLater).gt('expires_date', now),
        ])
        setBadges({ changes: changes ?? 0, disputes: disputes ?? 0, warranty: warranty ?? 0 })
      } catch { /* 조용히 실패 */ }
    }

    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  const isActive = (href: string) => {
    if (href === '/projects') return pathname.startsWith('/projects')
    return pathname === href || pathname.startsWith(href + '/')
  }

  const getBadge = (badgeKey?: keyof BadgeCounts): number => {
    if (!badgeKey) return 0
    return badges[badgeKey]
  }

  return (
    <nav className={styles.tabBar} role="navigation" aria-label="하단 탭 메뉴">
      {TABS.map(tab => {
        const badge = getBadge(tab.badgeKey)
        const active = isActive(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.iconWrap}>
              <span className={styles.icon}>{tab.icon}</span>
              {badge > 0 && (
                <span className={styles.badge} aria-label={`${badge}건 미확인`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
            <span className={styles.label}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
