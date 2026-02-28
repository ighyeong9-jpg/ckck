'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { type UserRole, type FeatureSetId, ROLE_CONFIGS } from '@/types/roles'

interface NavItem {
  icon: string
  label: string
  href: string
  badge?: number | string
  section?: string
  requiredSet?: FeatureSetId
}

interface SubMenuItem {
  icon: string
  label: string
  path: string
  badge?: number
  requiredSet?: FeatureSetId
}

// 메인 메뉴 (항상 보임) - 핵심 8가지 기능
const coreMenuItems: NavItem[] = [
  { icon: '📁', label: '현장목록', href: '/projects' },
  { icon: '📋', label: '사전진단', href: '/dashboard' },
  { icon: '🤝', label: '분쟁예방', href: '/projects' },
  { icon: '💰', label: '비용절감', href: '/quotes' },
  { icon: '🔧', label: '공정현황', href: '/projects' },
  { icon: '⚠️', label: '하자보수', href: '/warranty' },
  { icon: '📄', label: '서류/PDF', href: '/reports' },
  { icon: '📊', label: '리스크현황', href: '/dashboard' },
]

// 더보기 메뉴 (기본 접혀있음)
const moreMenuItems: NavItem[] = [
  { icon: '🤖', label: 'AI 채팅', href: '/ai-chat' },
  { icon: '📒', label: 'AI 노트북', href: '/notebook' },
  { icon: '👥', label: '고객관리', href: '/clients' },
  { icon: '📡', label: '현장 이슈', href: '/issues' },
  { icon: '⚙️', label: '설정', href: '/settings' },
]

// 프로젝트 서브메뉴는 사용하지 않음 (핵심 메뉴로 통합)
const projectSubMenuItems: SubMenuItem[] = []

const extraNavItems: NavItem[] = []
const bottomNavItems: NavItem[] = []

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userName, setUserName] = useState('사용자')
  const [userRole, setUserRole] = useState<UserRole>('site_manager')
  const [subMenuOpen, setSubMenuOpen] = useState(true)
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})
  const [globalBadge, setGlobalBadge] = useState(0)

  // 역할 기반 메뉴 필터링
  const roleConfig = ROLE_CONFIGS.find(c => c.role === userRole)
  const allowedSets = roleConfig?.allowedSets ?? []

  const filterByRole = <T extends { requiredSet?: FeatureSetId }>(items: T[]): T[] =>
    items.filter(item => !item.requiredSet || allowedSets.includes(item.requiredSet))

  const filteredMainNav = filterByRole(coreMenuItems)
  const filteredSubMenu = filterByRole(projectSubMenuItems)
  const filteredMoreNav = filterByRole(moreMenuItems)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // 모바일에서 페이지 이동 시 사이드바 닫기
  useEffect(() => {
    if (onNavigate) onNavigate()
  }, [pathname])

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('display_name')
          .eq('user_id', user.id.toString())
          .maybeSingle()
        if (data) {
          setUserName(data.display_name || user.email?.split('@')[0] || '사용자')
        }
      }
    }
    loadUser()
  }, [])

  // 글로벌 미확인 뱃지
  useEffect(() => {
    const loadGlobalBadge = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString()
        const now = new Date().toISOString()
        const results = await Promise.all([
          supabase.from('dispute_signals').select('*, projects!inner(user_id)', { count: 'exact', head: true }).eq('projects.user_id', user.id.toString()).eq('resolved', false),
          supabase.from('change_orders').select('*, projects!inner(user_id)', { count: 'exact', head: true }).eq('projects.user_id', user.id.toString()).eq('status', 'requested'),
          supabase.from('warranty_tracking').select('*, projects!inner(user_id)', { count: 'exact', head: true }).eq('projects.user_id', user.id.toString()).lt('warranty_expires_date', thirtyDaysLater).gt('warranty_expires_date', now),
        ])
        const disputes = results[0]?.count ?? 0
        const changes = results[1]?.count ?? 0
        const warranty = results[2]?.count ?? 0
        setGlobalBadge((disputes ?? 0) + (changes ?? 0) + (warranty ?? 0))
      } catch { /* 조용히 실패 */ }
    }
    loadGlobalBadge()
    const interval = setInterval(loadGlobalBadge, 60000)
    return () => clearInterval(interval)
  }, [])

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/)
  const currentProjectId = projectMatch ? projectMatch[1] : null
  const isOnProjectPage = !!currentProjectId && currentProjectId !== 'new'

  useEffect(() => {
    if (!currentProjectId || currentProjectId === 'new') return
    const loadBadges = async () => {
      try {
        const { count: diagTotal } = await supabase
          .from('diagnostic_responses')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', currentProjectId)
          .eq('checked', false)
        const { count: pendingProcesses } = await supabase
          .from('processes')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', currentProjectId)
          .neq('status', 'completed')
        const { count: changeOrders } = await supabase
          .from('change_orders')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', currentProjectId)
          .eq('status', 'requested')
        const counts: Record<string, number> = {}
        if (diagTotal && diagTotal > 0) counts['diagnostic'] = diagTotal
        if (pendingProcesses && pendingProcesses > 0) counts['process'] = pendingProcesses
        if (changeOrders && changeOrders > 0) counts['changes'] = changeOrders
        setBadgeCounts(counts)
      } catch { /* 조용히 실패 */ }
    }
    loadBadges()
  }, [currentProjectId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/projects') return pathname.startsWith('/projects')
    if (href === '/issues') return pathname.startsWith('/issues')
    if (href === '/warranty') return pathname.startsWith('/warranty')
    if (href === '/quotes') return pathname.startsWith('/quotes')
    return pathname === href
  }

  const isSubMenuActive = (path: string) => {
    if (!currentProjectId) return false
    return pathname === `/projects/${currentProjectId}/${path}`
  }

  const navItemClass = (active: boolean) =>
    [
      'flex items-center gap-2.5 px-3 py-2.5 mx-2.5 rounded-lg',
      'text-[13px] font-medium cursor-pointer transition-all duration-150',
      active
        ? 'text-white bg-white/10 border-l-2 border-orange-500'
        : 'text-white/50 hover:text-white/85 hover:bg-white/[0.06]',
    ].join(' ')

  let lastSection = ''

  return (
    <aside className="w-60 flex-shrink-0 bg-navy-800 flex flex-col border-r border-white/[0.05] h-screen fixed left-0 top-0 z-50 overflow-y-auto">
      {/* 로고 */}
      <div className="px-5 py-[22px] text-[18px] font-black text-white border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <Link href="/" className="text-white no-underline">
          체크<span className="text-orange-500">인</span>
        </Link>
        <span className="text-[10px] font-normal text-white/25">v2.0</span>
      </div>

      {/* 현재 프로젝트 */}
      {isOnProjectPage && (
        <div className="mx-2.5 my-3 bg-white/[0.06] border border-white/[0.08] rounded-xl p-3 cursor-pointer hover:bg-white/10 transition-colors flex-shrink-0">
          <div className="text-xs font-bold text-white">🏗 현재 현장</div>
          <div className="text-[10px] text-white/35 mt-0.5">프로젝트 작업 중</div>
        </div>
      )}

      {/* 메인 내비게이션 */}
      <nav className="flex-1 py-2">
        {filteredMainNav.map((item, idx) => {
          const showSection = item.section && item.section !== lastSection
          if (showSection) lastSection = item.section!
          return (
            <div key={`main-${idx}-${item.href}`}>
              {showSection && (
                <div className="font-mono text-[9px] tracking-[0.12em] text-white/25 uppercase px-5 pt-3.5 pb-1.5">
                  {item.section}
                </div>
              )}
              <Link
                href={item.href}
                className={navItemClass(isActive(item.href))}
              >
                <span className="text-[18px] w-5 text-center flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.href === '/projects' && globalBadge > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                    {globalBadge > 99 ? '99+' : globalBadge}
                  </span>
                )}
              </Link>

              {/* 프로젝트 서브메뉴 */}
              {item.href === '/projects' && isOnProjectPage && (
                <>
                  <button
                    className="flex items-center justify-between w-full px-5 py-1.5 text-[11px] font-semibold text-white/30 hover:text-white/60 transition-colors"
                    onClick={() => setSubMenuOpen(!subMenuOpen)}
                  >
                    <span>현장 메뉴</span>
                    <span className={`transition-transform duration-200 ${subMenuOpen ? '' : '-rotate-90'}`}>▾</span>
                  </button>
                  {subMenuOpen && (
                    <ul className="list-none p-0 m-0 mb-1">
                      {filteredSubMenu.map((subItem) => (
                        <li key={subItem.path}>
                          <Link
                            href={`/projects/${currentProjectId}/${subItem.path}`}
                            className={[
                              'flex items-center gap-2 py-[7px] pl-11 pr-3 mx-2.5 rounded-lg',
                              'text-[12px] font-medium transition-all duration-150',
                              isSubMenuActive(subItem.path)
                                ? 'text-white bg-white/[0.08] border-l-2 border-orange-500'
                                : 'text-white/40 hover:text-white/75 hover:bg-white/[0.05]',
                            ].join(' ')}
                          >
                            <span className="text-sm w-4 text-center">{subItem.icon}</span>
                            <span className="flex-1">{subItem.label}</span>
                            {badgeCounts[subItem.path] > 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                                {badgeCounts[subItem.path] > 99 ? '99+' : badgeCounts[subItem.path]}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )
        })}

        {/* 더보기 메뉴 */}
        <div className="mt-2">
          <button
            className="flex items-center justify-between w-full px-5 py-2 text-[13px] font-semibold text-white/40 hover:text-white/70 transition-colors"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-[18px] w-5 text-center flex-shrink-0">⋮</span>
              <span>더보기</span>
            </div>
            <span className={`transition-transform duration-200 ${showMoreMenu ? '' : '-rotate-90'}`}>▾</span>
          </button>
          {showMoreMenu && (
            <div className="pb-2">
              {filteredMoreNav.map((item, idx) => (
                <Link key={`more-${idx}-${item.href}`} href={item.href} className={navItemClass(isActive(item.href))}>
                  <span className="text-[18px] w-5 text-center flex-shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* 유저 섹션 */}
      <div className="border-t border-white/[0.06] p-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/[0.06] transition-colors">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-orange">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-white truncate">{userName}</div>
            <div className="text-[10px] text-white/35">Free Plan</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-all"
            title="로그아웃"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
