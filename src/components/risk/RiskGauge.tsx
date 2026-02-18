'use client'

import styles from './RiskGauge.module.scss'

interface RiskGaugeProps {
  score: number
  grade: string
  size?: 'small' | 'medium' | 'large'
}

export default function RiskGauge({ score, grade, size = 'medium' }: RiskGaugeProps) {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#10b981'
      case 'B': return '#22c55e'
      case 'C': return '#f59e0b'
      case 'D': return '#f97316'
      case 'F': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusText = (score: number) => {
    if (score <= 30) return 'PASS'
    if (score <= 60) return 'WARN'
    return 'FAIL'
  }

  const getStatusColor = (score: number) => {
    if (score <= 30) return '#10b981'
    if (score <= 60) return '#f59e0b'
    return '#ef4444'
  }

  const normalizedScore = Math.min(100, Math.max(0, score))
  const rotation = (normalizedScore / 100) * 180 - 90

  return (
    <div className={`${styles.gaugeContainer} ${styles[size]}`}>
      <div className={styles.gaugeWrapper}>
        <svg viewBox="0 0 200 120" className={styles.gauge}>
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Colored segments */}
          <path
            d="M 20 100 A 80 80 0 0 1 73 30"
            fill="none"
            stroke="#10b981"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 73 30 A 80 80 0 0 1 127 30"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 127 30 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Needle */}
          <g transform={`rotate(${rotation}, 100, 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="35"
              stroke={getStatusColor(normalizedScore)}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx="100"
              cy="100"
              r="8"
              fill={getStatusColor(normalizedScore)}
            />
          </g>
        </svg>

        <div className={styles.scoreDisplay}>
          <span className={styles.score} style={{ color: getGradeColor(grade) }}>
            {score.toFixed(1)}
          </span>
          <span className={styles.grade} style={{ backgroundColor: getGradeColor(grade) }}>
            {grade}
          </span>
        </div>

        <div className={styles.status} style={{ color: getStatusColor(normalizedScore) }}>
          {getStatusText(normalizedScore)}
        </div>
      </div>
    </div>
  )
}
