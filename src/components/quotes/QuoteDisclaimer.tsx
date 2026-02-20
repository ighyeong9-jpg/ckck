'use client'

/**
 * QuoteDisclaimer.tsx — 면책 고지 (삭제/숨김 절대 불가)
 *
 * 이 컴포넌트는 어떤 이유로도 제거하거나 숨길 수 없다.
 * AI 예산 가이드는 참고용이며 계약서 효력이 없다.
 */

import styles from './QuoteDisclaimer.module.scss'

interface QuoteDisclaimerProps {
  compact?: boolean
}

export default function QuoteDisclaimer({ compact = false }: QuoteDisclaimerProps) {
  if (compact) {
    return (
      <div className={styles.compact}>
        <span className={styles.icon}>⚠️</span>
        <span className={styles.compactText}>
          AI 예상 범위. 실측 없이 작성. 계약서 아님. 실제와 다를 수 있음.
        </span>
      </div>
    )
  }

  return (
    <div className={styles.disclaimer}>
      <div className={styles.header}>
        <span className={styles.icon}>📋</span>
        <strong className={styles.title}>AI 예상 견적 안내</strong>
      </div>
      <ul className={styles.list}>
        <li>본 견적은 AI가 자동 생성한 <strong>참고용 예산 범위</strong>입니다</li>
        <li>실측 전 작성으로 실제와 <strong>다를 수 있음</strong></li>
        <li>현장 상태에 따라 금액 변동 가능</li>
        <li>정확한 견적은 <strong>전문가 실측 후 확인</strong></li>
        <li>본 견적서는 <strong>계약서 효력 없음</strong></li>
      </ul>
    </div>
  )
}
