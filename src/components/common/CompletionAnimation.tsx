'use client'

import { useEffect, useState } from 'react'
import styles from './CompletionAnimation.module.scss'

interface CompletionAnimationProps {
  message?: string          // 완료 메시지
  subMessage?: string       // 보조 메시지 (예: "현장 안전 지수 +5")
  onDone?: () => void       // 애니메이션 완료 후 콜백
  duration?: number         // 표시 시간(ms), 기본 2000
  type?: 'success' | 'warning' | 'info'
}

/**
 * 완료 피드백 애니메이션 — 도파민 설계
 * 체크 완료, 공정 완료, AI 분석 완료 시 사용
 */
export default function CompletionAnimation({
  message = '완료했어요!',
  subMessage,
  onDone,
  duration = 2000,
  type = 'success',
}: CompletionAnimationProps) {
  const [phase, setPhase] = useState<'in' | 'show' | 'out'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 50)
    const t2 = setTimeout(() => setPhase('out'), duration - 300)
    const t3 = setTimeout(() => onDone?.(), duration)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [duration, onDone])

  const icons = { success: '✅', warning: '⚠️', info: '💡' }
  const colors = { success: '#10b981', warning: '#FFB800', info: '#3b82f6' }

  return (
    <div className={`${styles.overlay} ${styles[phase]}`} role="status" aria-live="polite">
      <div className={styles.card} style={{ borderColor: colors[type] }}>
        {/* 체크 아이콘 + 파동 */}
        <div className={styles.iconWrap}>
          <div className={styles.ripple} style={{ background: colors[type] }} />
          <span className={styles.icon}>{icons[type]}</span>
        </div>

        <p className={styles.message}>{message}</p>
        {subMessage && (
          <p className={styles.sub} style={{ color: colors[type] }}>{subMessage}</p>
        )}
      </div>
    </div>
  )
}
