'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './Sidebar.module.scss'

interface NavItem {
  icon: string
  label: string
  href: string
  badge?: number
}

interface SubMenuItem {
  icon: string
  label: string
  path: string
  badge?: number
}

const mainNavItems: NavItem[] = [
  { icon: '🏠', label: '대시보드', href: '/dashboard' },
  { icon: '📁', label: '프로젝트', href: '/projects' },
  { icon: '📊', label: '리포트', href: '/reports' },
  { icon: '👥', label: '고객관리', href: '/clients' },
  { icon: '🏢', label: '프로필', href: '/profile' },
]

const projectSubMenuItems: SubMenuItem[] = [
  { icon: '📋', label: '진단', path: 'diagnostic' },
  { icon: '💰', label: '견적서', path: 'sow' },
  { icon: '📊', label: '비용분석', path: 'cost-analysis' },
  { icon: '🔄', label: '변경관리', path: 'changes' },
  { icon: '📁', label: '증빙', path: 'evidence-package' },
  { icon: '🤝', label: '합의', path: 'agreement' },
  { icon: '📄', label: '리포트', path: 'report' },
  { icon: '🔧', label: '공정관리', path: 'process' },
  { icon: '👷', label: '인력관리', path: 'workforce' },
  { icon: '📦', label: '자재관리', path: 'materials' },
  { icon: '🤖', label: '인증서', path: 'certificate' },
  { icon: '🔧', label: '하자요청', path: 'defects' },
  { icon: '🖼️', label: '현장사진', path: 'gallery' },
]

const bottomNavItems: NavItem[] = [
  { icon: '💎', label: '결제', href: '/payment' },
  { icon: '⚙️', label: '설정', href: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userName, setUserName] = useState('사용자')
  const [userPlan, setUserPlan] = useState('Free')
  const [subMenuOpen, setSubMenuOpen] = useState(true)
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})
  const [collapsed, setCollapsed] = useState(false)

  // Hydration-safe: read localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed') === 'true'
    setCollapsed(saved)
    document.documentElement.style.setProperty(
      '--sidebar-width',
      saved ? '56px' : '260px'
    )
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed))
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '56px' : '260px'
    )
  }, [collapsed])

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('display_name, subscription_plan')
          .eq('user_id', user.id)
          .single()
        if (data) {
          setUserName(data.display_name || user.email?.split('@')[0] || '사용자')
          setUserPlan(data.subscription_plan === 'pro' ? 'Pro' : data.subscription_plan === 'enterprise' ? 'Enterprise' : 'Free')
        }
      }
    }
    loadUser()
  }, [])

  // Load badge counts for current project
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/)
  const currentProjectId = projectMatch ? projectMatch[1] : null
  const isOnProjectPage = !!currentProjectId && currentProjectId !== 'new'

  useEffect(() => {
    if (!currentProjectId || currentProjectId === 'new') return

    const loadBadges = async () => {
      try {
        // Count incomplete diagnostic items
        const { count: diagTotal } = await supabase
          .from('diagnostic_responses')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', currentProjectId)
          .eq('checked', false)

        // Count pending processes
        const { count: pendingProcesses } = await supabase
          .from('processes')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', currentProjectId)
          .neq('status', 'completed')

        // Count change orders
        const { count: changeOrders } = await supabase
          .from('change_orders')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', currentProjectId)
          .eq('status', 'pending')

        const counts: Record<string, number> = {}
        if (diagTotal && diagTotal > 0) counts['diagnostic'] = diagTotal
        if (pendingProcesses && pendingProcesses > 0) counts['process'] = pendingProcesses
        if (changeOrders && changeOrders > 0) counts['changes'] = changeOrders

        setBadgeCounts(counts)
      } catch (err) {
        // Silently fail badge counts
      }
    }

    loadBadges()
  }, [currentProjectId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/projects' && pathname.startsWith('/projects')) return true
    return pathname === href
  }

  const isSubMenuActive = (path: string) => {
    if (!currentProjectId) return false
    return pathname === `/projects/${currentProjectId}/${path}`
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logoSection}>
        <div className={styles.logoRow}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>✓</span>
            {!collapsed && <span className={styles.logoText}>Check-In</span>}
          </Link>
          <button
            className={styles.toggleBtn}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </>
              )}
            </svg>
          </button>
        </div>
        {!collapsed && <span className={styles.tagline}>기록의 편</span>}
      </div>

      {/* Main Navigation */}
      <nav className={styles.mainNav}>
        <ul className={styles.navList}>
          {mainNavItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                {collapsed && <span className={styles.tooltip}>{item.label}</span>}
              </Link>

              {/* Project Submenu - Accordion */}
              {item.href === '/projects' && isOnProjectPage && !collapsed && (
                <>
                  <button
                    className={styles.accordionToggle}
                    onClick={() => setSubMenuOpen(!subMenuOpen)}
                  >
                    <span className={styles.accordionLabel}>프로젝트 메뉴</span>
                    <span className={`${styles.accordionArrow} ${subMenuOpen ? styles.open : ''}`}>▾</span>
                  </button>
                  <ul className={`${styles.subMenu} ${subMenuOpen ? styles.subMenuOpen : ''}`}>
                    {projectSubMenuItems.map((subItem) => (
                      <li key={subItem.path}>
                        <Link
                          href={`/projects/${currentProjectId}/${subItem.path}`}
                          className={`${styles.subMenuItem} ${
                            isSubMenuActive(subItem.path) ? styles.active : ''
                          }`}
                        >
                          <span className={styles.subMenuIcon}>{subItem.icon}</span>
                          <span className={styles.subMenuLabel}>{subItem.label}</span>
                          {badgeCounts[subItem.path] && badgeCounts[subItem.path] > 0 && (
                            <span className={styles.badge}>
                              {badgeCounts[subItem.path] > 99 ? '99+' : badgeCounts[subItem.path]}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav}>
        <ul className={styles.navList}>
          {bottomNavItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                {collapsed && <span className={styles.tooltip}>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>

        {/* User Section */}
        <div className={styles.userSection}>
          <div className={styles.userAvatar}>
            {userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{userName}</span>
                <span className={styles.userPlan}>{userPlan} Plan</span>
              </div>
              <button onClick={handleLogout} className={styles.logoutBtn} title="로그아웃">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </>
          )}
          {collapsed && <span className={styles.tooltip}>{userName}</span>}
        </div>
      </nav>
    </aside>
  )
}
