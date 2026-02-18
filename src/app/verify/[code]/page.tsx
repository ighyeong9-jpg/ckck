'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { VerificationCertificate } from '@/types/verification'
import { GRADE_LABELS, GRADE_COLORS } from '@/types/verification'
import styles from './page.module.scss'

export default function VerifyPage() {
  const params = useParams()
  const code = params.code as string

  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [certificate, setCertificate] = useState<VerificationCertificate | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch(`/api/verify/${encodeURIComponent(code)}`)
        const data = await res.json()

        setValid(data.valid)
        if (data.certificate) setCertificate(data.certificate)
        if (data.error) setError(data.error)
      } catch (err) {
        setError('검증 서버에 연결할 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [code])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingScreen}>
            <div className={styles.spinner} />
            <span>인증서 검증 중...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div className={styles.logo}>Check-In</div>
          <div className={styles.headerTitle}>AI 검증 인증서 확인</div>
        </div>

        {/* 검증 결과 */}
        {valid && certificate ? (
          <div className={styles.resultValid}>
            <div className={styles.validBadge}>
              <span className={styles.validIcon}>✅</span>
              <span className={styles.validText}>유효한 인증서</span>
            </div>

            <div className={styles.certInfo}>
              <div className={styles.gradeBox} style={{ borderColor: GRADE_COLORS[certificate.grade] }}>
                <span className={styles.gradeValue} style={{ color: GRADE_COLORS[certificate.grade] }}>
                  {certificate.grade}
                </span>
                <span className={styles.gradeName}>{GRADE_LABELS[certificate.grade]}</span>
                <span className={styles.totalScore}>{certificate.total_score}점</span>
              </div>

              <div className={styles.infoGrid}>
                <InfoRow label="프로젝트" value={certificate.project_name} />
                {certificate.client_name && <InfoRow label="발주처" value={certificate.client_name} />}
                {certificate.industry && <InfoRow label="업종" value={certificate.industry} />}
                <InfoRow label="인증코드" value={certificate.code} mono />
                <InfoRow label="발급일" value={new Date(certificate.issued_at).toLocaleDateString('ko-KR')} />
                <InfoRow label="만료일" value={new Date(certificate.expires_at).toLocaleDateString('ko-KR')} />
              </div>

              {/* 세부 점수 */}
              <div className={styles.scoresSection}>
                <h4>세부 점수</h4>
                <div className={styles.scoresList}>
                  <ScoreRow label="비용 적정성" score={certificate.cost_score} max={25} />
                  <ScoreRow label="공정 완성도" score={certificate.process_score} max={25} />
                  <ScoreRow label="계약 안정성" score={certificate.contract_score} max={25} />
                  <ScoreRow label="일정 유효성" score={certificate.schedule_score} max={25} />
                </div>
              </div>

              {certificate.badge_eligible && (
                <div className={styles.badgeInfo}>
                  ✅ Check-In 인증 배지 자격 보유
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.resultInvalid}>
            <div className={styles.invalidBadge}>
              <span className={styles.invalidIcon}>❌</span>
              <span className={styles.invalidText}>
                {error || '유효하지 않은 인증서'}
              </span>
            </div>

            {certificate && (
              <div className={styles.expiredInfo}>
                <InfoRow label="프로젝트" value={certificate.project_name} />
                <InfoRow label="인증코드" value={certificate.code} mono />
                <InfoRow label="상태" value={
                  certificate.status === 'expired' ? '만료됨' :
                  certificate.status === 'revoked' ? '취소됨' : certificate.status
                } />
              </div>
            )}
          </div>
        )}

        <div className={styles.footer}>
          <p>본 검증 결과는 Check-In AI 시스템에 의해 제공됩니다.</p>
          <p className={styles.footerSub}>check-in.ai</p>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={`${styles.infoValue} ${mono ? styles.mono : ''}`}>{value}</span>
    </div>
  )
}

function ScoreRow({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = (score / max) * 100
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className={styles.scoreRow}>
      <div className={styles.scoreRowHeader}>
        <span>{label}</span>
        <span className={styles.scoreRowPts}>{score}/{max}</span>
      </div>
      <div className={styles.scoreRowBar}>
        <div className={styles.scoreRowFill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
