'use client'

import { useRef, useState } from 'react'
import styles from './SwipeCard.module.scss'

interface SwipeCardProps {
  label: string                         // 카드 중앙 텍스트
  sublabel?: string                     // 부제목
  onComplete: () => void | Promise<void> // 오른쪽 스와이프 → 완료
  onReject?: () => void | Promise<void>  // 왼쪽 스와이프 → 수정 필요
  completeLabel?: string                // 완료 방향 라벨
  rejectLabel?: string                  // 거절 방향 라벨
  disabled?: boolean
}

const THRESHOLD = 80  // 스와이프 인정 픽셀

export default function SwipeCard({
  label,
  sublabel,
  onComplete,
  onReject,
  completeLabel = '✓ 완료',
  rejectLabel = '✕ 수정 필요',
  disabled = false,
}: SwipeCardProps) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [done, setDone] = useState<'complete' | 'reject' | null>(null)
  const startX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const direction = offset > 0 ? 'right' : offset < 0 ? 'left' : null
  const progress = Math.min(Math.abs(offset) / THRESHOLD, 1)

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || done) return
    startX.current = e.clientX
    setDragging(true)
    cardRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const delta = e.clientX - startX.current
    setOffset(delta)
  }

  const onPointerUp = async () => {
    if (!dragging) return
    setDragging(false)

    if (offset >= THRESHOLD) {
      setDone('complete')
      setOffset(300)
      await onComplete?.()
    } else if (offset <= -THRESHOLD && onReject) {
      setDone('reject')
      setOffset(-300)
      await onReject?.()
    } else {
      // 스냅백
      setOffset(0)
    }
  }

  if (done) {
    return (
      <div className={`${styles.card} ${done === 'complete' ? styles.doneComplete : styles.doneReject}`}>
        <span className={styles.doneIcon}>
          {done === 'complete' ? '✅' : '✏️'}
        </span>
        <span className={styles.doneText}>
          {done === 'complete' ? '완료했어요!' : '수정 요청했어요'}
        </span>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      {/* 배경 레이어 — 방향 표시 */}
      <div
        className={styles.bg}
        style={{ opacity: progress * 0.6 }}
      >
        {direction === 'right' && (
          <span className={styles.bgLabel} style={{ left: '1rem', color: '#10b981' }}>
            {completeLabel}
          </span>
        )}
        {direction === 'left' && (
          <span className={styles.bgLabel} style={{ right: '1rem', color: '#FF6B2B' }}>
            {rejectLabel}
          </span>
        )}
      </div>

      {/* 스와이프 카드 */}
      <div
        ref={cardRef}
        className={`${styles.card} ${dragging ? styles.dragging : ''}`}
        style={{
          transform: `translateX(${offset}px) rotate(${offset * 0.04}deg)`,
          transition: dragging ? 'none' : 'transform 0.3s ease',
          borderColor: direction === 'right'
            ? `rgba(16,185,129,${progress * 0.8})`
            : direction === 'left'
              ? `rgba(255,107,43,${progress * 0.8})`
              : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <p className={styles.label}>{label}</p>
        {sublabel && <p className={styles.sublabel}>{sublabel}</p>}
        <div className={styles.hint}>← 수정 필요 &nbsp;|&nbsp; 완료 →</div>
      </div>
    </div>
  )
}
