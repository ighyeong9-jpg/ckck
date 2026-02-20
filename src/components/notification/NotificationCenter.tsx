'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Notification, NotificationType } from '@/types/notification'
import { NOTIFICATION_ICONS } from '@/types/notification'
import styles from './NotificationCenter.module.scss'

// proactive_notifications 행을 공통 표시용 타입으로 매핑
interface DisplayNotification {
  id: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
  icon: string
  source: 'notifications' | 'proactive'
}

function toDisplay(n: Notification): DisplayNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message ?? null,
    link: n.link ?? null,
    is_read: n.is_read,
    created_at: n.created_at,
    icon: NOTIFICATION_ICONS[n.notification_type as NotificationType] || '📢',
    source: 'notifications',
  }
}

function proactiveToDisplay(p: any): DisplayNotification {
  const severityIcon =
    p.severity === 'CRITICAL' ? '🚨' : p.severity === 'WARNING' ? '⚠️' : '🤖'
  return {
    id: `proactive-${p.id}`,
    title: p.title,
    message: p.message ?? null,
    link: p.action_url ?? null,
    is_read: p.read ?? false,
    created_at: p.created_at,
    icon: severityIcon,
    source: 'proactive',
  }
}

export default function NotificationCenter() {
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<DisplayNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load unread count (both tables)
  const loadUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.toISOString()

      const [notifRes, proactiveRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
        supabase
          .from('proactive_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false)
          .gte('created_at', todayStart),
      ])

      setUnreadCount((notifRes.count || 0) + (proactiveRes.count || 0))
    } catch {
      // Silent
    }
  }

  // Load notifications (both tables)
  const loadNotifications = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.toISOString()

      const [notifRes, proactiveRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('proactive_notifications')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', todayStart)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const notifItems = (notifRes.data ?? []).map(toDisplay)
      const proactiveItems = (proactiveRes.data ?? []).map(proactiveToDisplay)

      // proactive를 앞에, 이후 일반 알림
      const merged = [...proactiveItems, ...notifItems]
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setItems(merged)
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }

  // Polling every 30s
  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleOpen = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      loadNotifications()
    }
  }

  const handleClick = async (item: DisplayNotification) => {
    if (!item.is_read) {
      if (item.source === 'notifications') {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', item.id)
      } else {
        // proactive — id에서 proactive- prefix 제거
        const realId = item.id.replace(/^proactive-/, '')
        await supabase
          .from('proactive_notifications')
          .update({ read: true })
          .eq('id', realId)
      }

      setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    if (item.link) {
      router.push(item.link)
      setIsOpen(false)
    }
  }

  const markAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.toISOString()

      await Promise.all([
        supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
        supabase
          .from('proactive_notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false)
          .gte('created_at', todayStart),
      ])

      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // Silent
    }
  }

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  // Group by date
  const grouped = items.reduce((acc, n) => {
    const date = new Date(n.created_at).toLocaleDateString('ko-KR')
    if (!acc[date]) acc[date] = []
    acc[date].push(n)
    return acc
  }, {} as Record<string, DisplayNotification[]>)

  return (
    <div className={styles.container} ref={ref}>
      <button className={styles.bellBtn} onClick={handleOpen} aria-label="알림 센터">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3>알림</h3>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={markAllRead}>
                모두 읽음
              </button>
            )}
          </div>

          <div className={styles.dropdownBody}>
            {loading ? (
              <div className={styles.loadingText}>로딩 중...</div>
            ) : items.length === 0 ? (
              <div className={styles.emptyText}>알림이 없습니다</div>
            ) : (
              Object.entries(grouped).map(([date, dateItems]) => (
                <div key={date} className={styles.dateGroup}>
                  <div className={styles.dateLabel}>{date}</div>
                  {dateItems.map(n => (
                    <div
                      key={n.id}
                      className={`${styles.notifItem} ${!n.is_read ? styles.unread : ''}`}
                      onClick={() => handleClick(n)}
                    >
                      <span className={styles.notifIcon}>{n.icon}</span>
                      <div className={styles.notifContent}>
                        <span className={styles.notifTitle}>{n.title}</span>
                        {n.message && <span className={styles.notifMessage}>{n.message}</span>}
                        <span className={styles.notifTime}>{getTimeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
