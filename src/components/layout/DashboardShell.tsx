'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import AgentChat from '@/components/agent/AgentChat'
import NotificationCenter from '@/components/notification/NotificationCenter'
import styles from './DashboardShell.module.scss'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close sidebar on route change (resize)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar on navigation (click link)
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {mobileOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar wrapper */}
      <div className={`${styles.sidebarWrapper} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <Sidebar />
      </div>

      {/* Main content */}
      <main className={styles.main}>
        {children}
      </main>

      <NotificationCenter />
      <AgentChat />
    </div>
  )
}
