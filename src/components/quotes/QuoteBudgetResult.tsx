'use client'

import { useCallback } from 'react'
import { BudgetGuideResult, BudgetGrade } from '@/lib/ai/quote-chat'
import { formatRange } from '@/lib/ai/quote-format'
import QuoteDisclaimer from './QuoteDisclaimer'
import PdfDownloadButton from '@/components/pdf/PdfDownloadButton'
import styles from './QuoteBudgetResult.module.scss'

interface QuoteBudgetResultProps {
  result: BudgetGuideResult
  onReset: () => void
}

const GRADE_CONFIG = {
  economy: { label: '경제형', color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7', badge: '💚' },
  standard: { label: '표준형', color: '#4f46e5', bg: '#f5f3ff', border: '#a5b4fc', badge: '⭐' },
  premium: { label: '고급형', color: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd', badge: '✨' },
}

function GradeCard({ grade, data, isHighlighted }: {
  grade: keyof typeof GRADE_CONFIG
  data: BudgetGrade
  isHighlighted?: boolean
}) {
  const config = GRADE_CONFIG[grade]
  return (
    <div
      className={`${styles.gradeCard} ${isHighlighted ? styles.highlighted : ''}`}
      style={{ borderColor: isHighlighted ? config.color : config.border, background: config.bg }}
    >
      {isHighlighted && <div className={styles.recommendBadge}>추천</div>}
      <div className={styles.gradeHeader}>
        <span className={styles.gradeBadge}>{config.badge}</span>
        <span className={styles.gradeLabel} style={{ color: config.color }}>{data.label}</span>
      </div>
      <div className={styles.gradeAmount}>
        {formatRange(data.min, data.max)}
      </div>
      <div className={styles.gradePerPyeong}>{data.per_pyeong}</div>
      <p className={styles.gradeGoodFor}>{data.good_for}</p>
      {data.risks.length > 0 && (
        <ul className={styles.gradeRisks}>
          {data.risks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function QuoteBudgetResult({ result, onReset }: QuoteBudgetResultProps) {
  const handleExportPdf = useCallback(async () => {
    const { exportBudgetGuidePdf } = await import('@/lib/pdf/budget-guide-pdf')
    await exportBudgetGuidePdf(result)
  }, [result])

  return (
    <div className={styles.container}>
      {/* 요약 */}
      <div className={styles.summary}>
        <div className={styles.summaryIcon}>🎯</div>
        <p className={styles.summaryText}>{result.summary}</p>
      </div>

      {/* 3등급 카드 */}
      <section className={styles.gradesSection}>
        <h3 className={styles.sectionTitle}>등급별 예산 범위</h3>
        <div className={styles.gradesGrid}>
          <GradeCard grade="economy" data={result.grades.economy} />
          <GradeCard grade="standard" data={result.grades.standard} isHighlighted />
          <GradeCard grade="premium" data={result.grades.premium} />
        </div>
      </section>

      {/* 숨겨진 비용 */}
      {result.hidden_costs.length > 0 && (
        <section className={styles.infoSection}>
          <h3 className={styles.sectionTitle}>⚠️ 놓치기 쉬운 추가 비용</h3>
          <ul className={styles.infoList}>
            {result.hidden_costs.map((cost, i) => (
              <li key={i} className={styles.warningItem}>{cost}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 왜 비싼지 */}
      {result.why_expensive.length > 0 && (
        <section className={styles.infoSection}>
          <h3 className={styles.sectionTitle}>💡 비용이 올라가는 이유</h3>
          <ul className={styles.infoList}>
            {result.why_expensive.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 싸면 위험한 이유 */}
      {result.why_cheap_risks.length > 0 && (
        <section className={styles.infoSection}>
          <h3 className={styles.sectionTitle}>🚨 너무 싸면 위험한 이유</h3>
          <ul className={styles.infoList}>
            {result.why_cheap_risks.map((r, i) => (
              <li key={i} className={styles.dangerItem}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 공사 전 체크리스트 */}
      {result.checklist.length > 0 && (
        <section className={styles.infoSection}>
          <h3 className={styles.sectionTitle}>✅ 공사 전 꼭 확인하세요</h3>
          <ul className={styles.checklist}>
            {result.checklist.map((item, i) => (
              <li key={i}>
                <span className={styles.checkIcon}>□</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 면책 고지 */}
      <QuoteDisclaimer />

      {/* 액션 버튼 */}
      <div className={styles.actions}>
        <PdfDownloadButton
          onExport={handleExportPdf}
          label="PDF 저장"
          variant="ghost"
        />
        <button className={styles.resetBtn} onClick={onReset}>
          다른 공간으로 다시 계산하기
        </button>
      </div>
    </div>
  )
}
