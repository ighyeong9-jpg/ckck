'use client'

import styles from './Skeleton.module.scss'

// ─── 기본 블록 ─────────────────────────────────────────
interface SkeletonProps {
  width?: string
  height?: string
  borderRadius?: string
  className?: string
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = '6px', className }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  )
}

// ─── 카드 스켈레톤 (대시보드 프로젝트 카드) ───────────
export function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.cardTop}>
        <Skeleton width="32px" height="32px" borderRadius="50%" />
        <Skeleton width="60%" height="14px" />
      </div>
      <Skeleton width="80%" height="18px" />
      <Skeleton width="50%" height="13px" />
      <Skeleton width="100%" height="8px" borderRadius="4px" />
    </div>
  )
}

// ─── 리스트 아이템 스켈레톤 ────────────────────────────
export function SkeletonListItem() {
  return (
    <div className={styles.listItem} aria-hidden="true">
      <Skeleton width="36px" height="36px" borderRadius="10px" />
      <div className={styles.listBody}>
        <Skeleton width="55%" height="14px" />
        <Skeleton width="80%" height="12px" />
      </div>
      <Skeleton width="40px" height="22px" borderRadius="6px" />
    </div>
  )
}

// ─── 텍스트 블록 스켈레톤 ──────────────────────────────
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ['100%', '85%', '65%', '90%', '75%']
  return (
    <div className={styles.textBlock} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={widths[i % widths.length]}
          height="13px"
        />
      ))}
    </div>
  )
}

// ─── AI 채팅 말풍선 스켈레톤 ──────────────────────────
export function SkeletonChatBubble() {
  return (
    <div className={styles.chatBubble} aria-hidden="true">
      <Skeleton width="28px" height="28px" borderRadius="50%" />
      <div className={styles.bubbleBody}>
        <Skeleton width="200px" height="14px" />
        <Skeleton width="160px" height="14px" />
        <Skeleton width="120px" height="14px" />
      </div>
    </div>
  )
}

// ─── KPI 카드 스켈레톤 ─────────────────────────────────
export function SkeletonKpi() {
  return (
    <div className={styles.kpi} aria-hidden="true">
      <Skeleton width="32px" height="32px" borderRadius="8px" />
      <div className={styles.kpiBody}>
        <Skeleton width="48px" height="28px" borderRadius="6px" />
        <Skeleton width="64px" height="12px" borderRadius="4px" />
      </div>
    </div>
  )
}
