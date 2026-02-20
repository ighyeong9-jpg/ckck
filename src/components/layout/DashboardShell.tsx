'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import AgentChat from '@/components/agent/AgentChat'
import NotificationCenter from '@/components/notification/NotificationCenter'
import DarkModeToggle from '@/components/DarkModeToggle'
import MobileTabBar from '@/components/MobileTabBar'
import styles from './DashboardShell.module.scss'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const handleCloseMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className={styles.shell}>
      {/* Mobile hamburger */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="메뉴 열기"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          {mobileOpen ? (
            <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
          ) : (
            <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`${styles.sidebarWrapper} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <Sidebar onNavigate={handleCloseMobile} />
      </div>

      {/* Right content area: header + main */}
      <div className={styles.contentArea}>
        {/* Top bar with notification + agent */}
        <header className={styles.topBar}>
          <DarkModeToggle />
          <NotificationCenter />
          <AgentChat />
        </header>

        {/* Page content */}
        <main className={styles.main}>
          {children}
        </main>
      </div>

      {/* 모바일 하단 탭바 (768px 이하) */}
      <MobileTabBar />
    </div>
  )
}
