'use client'

import styles from './Badge.module.scss'

interface BadgeProps {
  count: number
  max?: number           // 기본 99
  dot?: boolean          // 숫자 없이 점만 표시
  color?: 'red' | 'orange' | 'yellow' | 'blue'
  size?: 'sm' | 'md'
  className?: string
}

/**
 * 카카오톡 스타일 미확인 뱃지
 * count가 0이면 렌더링 안 함
 */
export function Badge({ count, max = 99, dot = false, color = 'red', size = 'md', className }: BadgeProps) {
  if (!dot && count <= 0) return null

  const displayCount = count > max ? `${max}+` : count.toString()

  return (
    <span
      className={[
        styles.badge,
        styles[color],
        styles[size],
        dot ? styles.dot : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      aria-label={`${count}건 미확인`}
    >
      {!dot && displayCount}
    </span>
  )
}

/**
 * 아이콘 위에 오버레이되는 뱃지 래퍼
 */
interface BadgeWrapProps {
  count: number
  children: React.ReactNode
  dot?: boolean
}

export function BadgeWrap({ count, children, dot = false }: BadgeWrapProps) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      {(dot ? true : count > 0) && (
        <Badge count={count} dot={dot} size="sm" className={styles.overlay} />
      )}
    </span>
  )
}
