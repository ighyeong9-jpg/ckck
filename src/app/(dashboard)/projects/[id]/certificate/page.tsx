'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { VerificationCertificate, ScoreBreakdown } from '@/types/verification'
import { GRADE_LABELS, GRADE_COLORS } from '@/types/verification'
import styles from './page.module.scss'

export default function CertificatePage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [certificate, setCertificate] = useState<VerificationCertificate | null>(null)
  const [score, setScore] = useState<ScoreBreakdown | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 기존 인증서 확인
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single()

        if (projectError) throw projectError
        if (project) setProjectName(project.name)

        const { data: cert, error: certError } = await supabase
          .from('verification_certificates')
          .select('*')
          .eq('project_id', projectId)
          .eq('status', 'active')
          .order('issued_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (certError) throw certError
        if (cert) setCertificate(cert as VerificationCertificate)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // AI 검증 실행
  const handleIssue = async () => {
    setIssuing(true)
    setError(null)

    try {
      const res = await fetch('/api/certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || '검증 실패')
        return
      }

      setCertificate(data.certificate)
      setScore(data.score)
    } catch (err) {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setIssuing(false)
    }
  }

  const verifyUrl = certificate && typeof window !== 'undefined'
    ? `${window.location.origin}/verify/${certificate.code}`
    : ''

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <div className={styles.spinner} />
          <span>로딩 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        {/* 발급 전: AI 검증 카드 */}
        {!certificate && (
          <div className={styles.issueCard}>
            <div className={styles.issueIcon}>🤖</div>
            <h2>AI 프로젝트 검증</h2>
            <p className={styles.issueDesc}>
              Check-In AI가 프로젝트의 비용, 공정, 계약, 일정을
              종합 분석하여 검증 인증서를 발급합니다.
            </p>

            <div className={styles.scorePreview}>
              <div className={styles.previewItem}>
                <span className={styles.previewIcon}>💰</span>
                <span>비용 적정성</span>
                <span className={styles.previewPts}>25점</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewIcon}>🔧</span>
                <span>공정 완성도</span>
                <span className={styles.previewPts}>25점</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewIcon}>📋</span>
                <span>계약 안정성</span>
                <span className={styles.previewPts}>25점</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewIcon}>📅</span>
                <span>일정 유효성</span>
                <span className={styles.previewPts}>25점</span>
              </div>
            </div>

            {error && <div className={styles.errorMsg}>{error}</div>}

            <button
              className={styles.issueBtn}
              onClick={handleIssue}
              disabled={issuing}
            >
              {issuing ? (
                <>
                  <span className={styles.btnSpinner} />
                  AI 분석 중...
                </>
              ) : (
                'AI 검증 시작'
              )}
            </button>
          </div>
        )}

        {/* 발급 후: 인증서 표시 */}
        {certificate && (
          <>
            {/* 인증서 카드 */}
            <div className={styles.certCard}>
              <div className={styles.certHeader}>
                <div className={styles.certLogo}>Check-In</div>
                <div className={styles.certTitle}>AI 검증 인증서</div>
                <div className={styles.certSubtitle}>AI Verification Certificate</div>
              </div>

              <div className={styles.certBody}>
                <div className={styles.certGrade} style={{ color: GRADE_COLORS[certificate.grade] }}>
                  <span className={styles.gradeLabel}>종합 등급</span>
                  <span className={styles.gradeValue}>{certificate.grade}</span>
                  <span className={styles.gradeName}>{GRADE_LABELS[certificate.grade]}</span>
                </div>

                <div className={styles.certScore}>
                  <span className={styles.scoreValue}>{certificate.total_score}</span>
                  <span className={styles.scoreMax}>/ 100</span>
                </div>

                <div className={styles.certInfo}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>프로젝트</span>
                    <span className={styles.infoValue}>{certificate.project_name}</span>
                  </div>
                  {certificate.client_name && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>발주처</span>
                      <span className={styles.infoValue}>{certificate.client_name}</span>
                    </div>
                  )}
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>인증코드</span>
                    <span className={styles.infoValue + ' ' + styles.code}>{certificate.code}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>발급일</span>
                    <span className={styles.infoValue}>
                      {new Date(certificate.issued_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>만료일</span>
                    <span className={styles.infoValue}>
                      {new Date(certificate.expires_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>

                {certificate.badge_eligible && (
                  <div className={styles.badgeNotice}>
                    ✅ 이 프로젝트는 Check-In 인증 배지 자격을 충족합니다.
                  </div>
                )}
              </div>

              <div className={styles.certFooter}>
                <span>본 인증서는 Check-In AI 시스템에 의해 자동 발급되었습니다.</span>
              </div>
            </div>

            {/* 세부 점수 */}
            <div className={styles.scoresCard}>
              <h3 className={styles.cardTitle}>세부 점수</h3>
              <div className={styles.scoresGrid}>
                {renderScoreBar('💰', '비용 적정성', certificate.cost_score, 25)}
                {renderScoreBar('🔧', '공정 완성도', certificate.process_score, 25)}
                {renderScoreBar('📋', '계약 안정성', certificate.contract_score, 25)}
                {renderScoreBar('📅', '일정 유효성', certificate.schedule_score, 25)}
              </div>
            </div>

            {/* 세부 분석 (score가 있을 때만) */}
            {score && (
              <div className={styles.detailsCard}>
                <h3 className={styles.cardTitle}>AI 분석 결과</h3>
                <div className={styles.detailsGrid}>
                  <DetailSection
                    title="비용 적정성"
                    items={[
                      { label: '견적 항목', value: score.cost.details.quoteItemCount > 0 ? `${score.cost.details.quoteItemCount}개` : '미등록' },
                      { label: '비용분석', value: score.cost.details.hasCostAnalysis ? '완료' : '미수행' },
                      { label: '카테고리', value: `${score.cost.details.categoryCount}개` },
                      ...(score.cost.details.costVarianceRate !== null ? [{ label: '비용 차이율', value: `${score.cost.details.costVarianceRate.toFixed(1)}%` }] : []),
                    ]}
                  />
                  <DetailSection
                    title="공정 완성도"
                    items={[
                      { label: '등록 공정', value: `${score.process.details.totalProcesses}개` },
                      { label: '완료율', value: `${score.process.details.completionRate}%` },
                      { label: '지연 공정', value: `${score.process.details.delayedProcesses}개` },
                      { label: '일정 설정', value: score.process.details.hasAllDates ? '완료' : '미완료' },
                    ]}
                  />
                  <DetailSection
                    title="계약 안정성"
                    items={[
                      { label: '합의서', value: `${score.contract.details.agreementCount}건` },
                      { label: '증빙파일', value: `${score.contract.details.evidenceFileCount}건` },
                      { label: '변경관리', value: `${score.contract.details.changeOrderCount}건` },
                      { label: '해결 완료', value: `${score.contract.details.resolvedChangeCount}건` },
                    ]}
                  />
                  <DetailSection
                    title="일정 유효성"
                    items={[
                      { label: '기한 내', value: score.schedule.details.isWithinSchedule ? '예' : '초과' },
                      ...(score.schedule.details.daysRemaining !== null ? [{ label: '잔여일', value: `${score.schedule.details.daysRemaining}일` }] : []),
                      { label: '공정 일정', value: `${score.schedule.details.processesWithDates}/${score.schedule.details.totalProcesses}` },
                    ]}
                  />
                </div>
              </div>
            )}

            {/* 공유/액션 */}
            <div className={styles.actionsCard}>
              <h3 className={styles.cardTitle}>공유 및 검증</h3>
              <div className={styles.verifyUrlBox}>
                <input
                  type="text"
                  readOnly
                  value={verifyUrl}
                  className={styles.urlInput}
                />
                <button
                  className={styles.copyBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(verifyUrl)
                    alert('검증 URL이 복사되었습니다.')
                  }}
                >
                  복사
                </button>
              </div>
              <p className={styles.verifyHint}>
                위 URL을 발주처에 공유하면 인증서를 온라인으로 검증할 수 있습니다.
              </p>
              <div className={styles.actionBtns}>
                <button className={styles.reissueBtn} onClick={handleIssue} disabled={issuing}>
                  {issuing ? '재발급 중...' : '재검증 / 재발급'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function renderScoreBar(icon: string, label: string, score: number, max: number) {
  const pct = (score / max) * 100
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className={styles.scoreItem} key={label}>
      <div className={styles.scoreItemHeader}>
        <span>{icon} {label}</span>
        <span className={styles.scoreItemPts}>{score}/{max}</span>
      </div>
      <div className={styles.scoreBar}>
        <div
          className={styles.scoreBarFill}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function DetailSection({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className={styles.detailSection}>
      <h4>{title}</h4>
      {items.map(item => (
        <div key={item.label} className={styles.detailRow}>
          <span className={styles.detailLabel}>{item.label}</span>
          <span className={styles.detailValue}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
