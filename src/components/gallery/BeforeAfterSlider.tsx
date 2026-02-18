'use client'

import { useState, useRef } from 'react'
import styles from './BeforeAfterSlider.module.scss'

interface Props {
  beforeUrl: string
  afterUrl: string
  beforeLabel?: string
  afterLabel?: string
}

export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = '시공 전',
  afterLabel = '시공 후',
}: Props) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setPosition(pct)
  }

  const handleMouseDown = () => { isDragging.current = true }
  const handleMouseUp = () => { isDragging.current = false }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) handleMove(e.clientX)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }

  return (
    <div
      ref={containerRef}
      className={styles.slider}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
    >
      {/* After (background) */}
      <img src={afterUrl} alt={afterLabel} className={styles.afterImg} />

      {/* Before (clipped) */}
      <div className={styles.beforeWrapper} style={{ width: `${position}%` }}>
        <img src={beforeUrl} alt={beforeLabel} className={styles.beforeImg} />
      </div>

      {/* Divider */}
      <div
        className={styles.divider}
        style={{ left: `${position}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className={styles.handle}>
          <span>◀▶</span>
        </div>
      </div>

      {/* Labels */}
      <span className={styles.labelBefore}>{beforeLabel}</span>
      <span className={styles.labelAfter}>{afterLabel}</span>
    </div>
  )
}
