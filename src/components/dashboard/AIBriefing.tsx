'use client'

/**
 * AIBriefing.tsx — 앱 진입 시 체키 AI 브리핑
 *
 * 사용자가 앱을 열면 체키가 먼저 오늘 상황을 브리핑한다.
 * 알림이 없으면 표시하지 않음.
 *
 * 체키 AI 비서 원칙:
 * 물어보지 않아도 알아서 감지한다. 먼저 말을 건다.
 */

import { useState, useEffect } from 'react'
import type { ProactiveNotification, ProactiveSeverity } from '@/lib/ai/proactive-engine'
import styles from './AIBriefing.module.scss'

interface ProactiveResult {
  notifications: ProactiveNotification[]
  totalCount: number
  criticalCount: number
  warningCount: number
  infoCount: number
  hasUrgent: boolean
  briefingText: string
  userName: string
}

const SEVERITY_ICON: Record<ProactiveSeverity, string> = {
  CRITICAL: '🚨',
  WARNING: '⚠️',
  INFO: '📋',
}

const SEVERITY_COLOR: Record<ProactiveSeverity, string> = {
  CRITICAL: '#FF3B5C',
  WARNING: '#FFB800',
  INFO: '#3b82f6',
}

const TRIGGER_LABEL: Record<string, string> = {
  WARRANTY_EXPIRING: '하자담보',
  AI_CHECK_PENDING: 'AI 판정',
  DISPUTE_UNRESOLVED: '분쟁 징후',
  PROCESS_NEXT_STEP: '다음 단계',
  DAILY_REPORT_MISSING: '일보 미작성',
}

export default function AIBriefing() {
  const [data, setData] = useState<ProactiveResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const res = await fetch('/api/ai/proactive')
        if (!res.ok) return
        const result = await res.json()
        setData(result)
        // 긴급 사항이 있으면 자동 확장
        if (result.hasUrgent) setExpanded(true)
      } catch {
        // 조용히 실패 — 브리핑은 선택적 기능
      } finally {
        setLoading(false)
      }
    }
    fetchBriefing()
  }, [])

  // 로딩 중이거나 알림 없거나 닫힌 경우 렌더링 안 함
  if (loading || !data || data.totalCount === 0 || dismissed) return null

  const topNotifications = data.notifications.slice(0, 5)
  const urgentFirst = data.notifications.find(
    n => n.severity === 'CRITICAL' || n.severity === 'WARNING'
  )

  return (
    <div className={`${styles.briefing} ${data.hasUrgent ? styles.urgent : styles.normal}`}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.botIcon}>🤖</span>
          <div className={styles.headerText}>
            <span className={styles.title}>체키 브리핑</span>
            <span className={styles.subtitle}>
              {data.criticalCount > 0 && (
                <span className={styles.badge} style={{ background: '#FF3B5C' }}>
                  🚨 긴급 {data.criticalCount}
                </span>
              )}
              {data.warningCount > 0 && (
                <span className={styles.badge} style={{ background: '#FFB800' }}>
                  ⚠️ 주의 {data.warningCount}
                </span>
              )}
              {data.infoCount > 0 && (
                <span className={styles.badge} style={{ background: '#3b82f6' }}>
                  📋 정보 {data.infoCount}
                </span>
              )}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.toggleBtn}
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? '접기' : '펼치기'}
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            className={styles.closeBtn}
            onClick={() => setDismissed(true)}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 브리핑 요약 (항상 표시) */}
      <p className={styles.summary}>
        {data.briefingText.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < data.briefingText.split('\n').length - 1 && <br />}
          </span>
        ))}
      </p>

      {/* 알림 목록 (확장 시) */}
      {expanded && (
        <div className={styles.notificationList}>
          {topNotifications.map((n) => (
            <div key={n.id} className={styles.notificationItem}>
              <span
                className={styles.notifIcon}
                style={{ color: SEVERITY_COLOR[n.severity] }}
              >
                {SEVERITY_ICON[n.severity]}
              </span>
              <div className={styles.notifContent}>
                <div className={styles.notifHeader}>
                  <span className={styles.notifProject}>{n.projectName}</span>
                  <span
                    className={styles.notifTag}
                    style={{ color: SEVERITY_COLOR[n.severity] }}
                  >
                    {TRIGGER_LABEL[n.triggerType] ?? n.triggerType}
                  </span>
                </div>
                <p className={styles.notifMessage}>{n.message}</p>
                {n.actionUrl && n.actionLabel && (
                  <a
                    href={n.actionUrl}
                    className={styles.actionBtn}
                    style={{ borderColor: SEVERITY_COLOR[n.severity], color: SEVERITY_COLOR[n.severity] }}
                  >
                    {n.actionLabel} →
                  </a>
                )}
              </div>
            </div>
          ))}

          {data.totalCount > 5 && (
            <p className={styles.moreCount}>외 {data.totalCount - 5}건 더 있어요</p>
          )}
        </div>
      )}

      {/* 빠른 이동 버튼 (긴급 사항이 있을 때) */}
      {urgentFirst?.actionUrl && (
        <div className={styles.quickAction}>
          <a href={urgentFirst.actionUrl} className={styles.urgentBtn}>
            {urgentFirst.severity === 'CRITICAL' ? '🚨' : '⚠️'} {urgentFirst.projectName} 지금 확인 →
          </a>
        </div>
      )}
    </div>
  )
}
