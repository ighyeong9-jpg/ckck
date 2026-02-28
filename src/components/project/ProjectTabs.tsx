'use client'

import { usePathname, useRouter } from 'next/navigation'
import styles from './ProjectTabs.module.scss'

export type TabStatus = 'completed' | 'in_progress' | 'not_started'

interface Tab {
  key: string
  label: string
  icon: string
  path: string
}

interface ProjectTabsProps {
  projectId: string
  tabStatuses?: Record<string, TabStatus>
  tabBadges?: Record<string, number>
}

const tabs: Tab[] = [
  { key: 'overview', label: '개요', icon: '🏠', path: 'overview' },
  { key: 'diagnostic', label: '진단', icon: '📋', path: 'diagnostic' },
  { key: 'sow', label: '견적서', icon: '💰', path: 'sow' },
  { key: 'cost-analysis', label: '비용분석', icon: '📊', path: 'cost-analysis' },
  { key: 'changes', label: '변경관리', icon: '🔄', path: 'changes' },
  { key: 'evidence-package', label: '증빙', icon: '📁', path: 'evidence-package' },
  { key: 'agreement', label: '합의', icon: '🤝', path: 'agreement' },
  { key: 'report', label: '리포트', icon: '📄', path: 'report' },
  { key: 'process', label: '공정관리', icon: '🔧', path: 'process' },
  { key: 'workforce', label: '인력관리', icon: '👷', path: 'workforce' },
  { key: 'materials', label: '자재관리', icon: '📦', path: 'materials' },
  { key: 'law-check', label: '법령', icon: '⚖️', path: 'law-check' },
  { key: 'fire-safety', label: '소방안전', icon: '🔥', path: 'fire-safety' },
  { key: 'warranty', label: '하자담보', icon: '🛡️', path: 'warranty' },
  { key: 'certificate', label: '인증서', icon: '🤖', path: 'certificate' },
]

const statusIcons: Record<TabStatus, string> = {
  completed: '✅',
  in_progress: '🔶',
  not_started: '⭕',
}

export default function ProjectTabs({ projectId, tabStatuses = {}, tabBadges = {} }: ProjectTabsProps) {
  const pathname = usePathname()
  const router = useRouter()

  const currentTabIndex = tabs.findIndex(
    (tab) => pathname === `/projects/${projectId}/${tab.path}`
  )

  const handleNext = () => {
    if (currentTabIndex < tabs.length - 1) {
      const nextTab = tabs[currentTabIndex + 1]
      router.push(`/projects/${projectId}/${nextTab.path}`)
    }
  }

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabList}>
        {tabs.map((tab, index) => {
          const isActive = pathname === `/projects/${projectId}/${tab.path}`
          const status = tabStatuses[tab.key] || 'not_started'

          const badge = tabBadges[tab.key] ?? 0

          return (
            <button
              key={tab.key}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => router.push(`/projects/${projectId}/${tab.path}`)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
              {badge > 0 && (
                <span className={styles.tabBadge}>{badge}</span>
              )}
              <span className={styles.statusIcon}>{statusIcons[status]}</span>
            </button>
          )
        })}
      </div>

      {currentTabIndex >= 0 && currentTabIndex < tabs.length - 1 && (
        <button className={styles.nextBtn} onClick={handleNext}>
          다음 단계 →
        </button>
      )}
    </div>
  )
}
