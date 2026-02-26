'use client'

import { SEVERITY_CONFIG, CATEGORY_CONFIG, IssueSeverity, IssueCategory, IssueStatus } from '@/lib/ai/issue-types'
import styles from './IssueCard.module.scss'

export interface SiteIssue {
  id: string
  project_id: string | null
  title: string
  summary: string
  category: IssueCategory
  severity: IssueSeverity
  status: IssueStatus
  recommended_actions: string[]
  legal_basis: string | null
  cost_impact: string | null
  schedule_impact: string | null
  requires_approval: boolean
  urgency_hours: number
  issue_text: string
  reporter_note: string | null
  created_at: string
  resolved_at: string | null
}

interface IssueCardProps {
  issue: SiteIssue
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onNegotiate?: (id: string) => void
  onResolve?: (id: string) => void
  expanded?: boolean
  onToggle?: () => void
}

const STATUS_LABELS: Record<IssueStatus, { label: string; color: string }> = {
  open:      { label: '신규', color: '#6b7280' },
  reviewing: { label: '협의 중', color: '#d97706' },
  approved:  { label: '승인', color: '#059669' },
  rejected:  { label: '반려', color: '#dc2626' },
  resolved:  { label: '해결', color: '#0F2744' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return '방금 전'
  if (diffH < 24) return `${diffH}시간 전`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}일 전`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function IssueCard({ issue, onApprove, onReject, onNegotiate, onResolve, expanded, onToggle }: IssueCardProps) {
  const sev = SEVERITY_CONFIG[issue.severity]
  const cat = CATEGORY_CONFIG[issue.category]
  const status = STATUS_LABELS[issue.status]

  return (
    <div
      className={`${styles.card} ${styles[`sev_${issue.severity}`]}`}
      style={{ borderLeftColor: sev.color }}
    >
      {/* 카드 헤더 */}
      <div className={styles.cardHeader} onClick={onToggle}>
        <div className={styles.badges}>
          <span className={styles.sevBadge} style={{ background: sev.bg, color: sev.color, borderColor: sev.border }}>
            {sev.emoji} {sev.label}
          </span>
          <span className={styles.catBadge}>
            {cat.emoji} {cat.label}
          </span>
          {issue.requires_approval && issue.status === 'open' && (
            <span className={styles.approvalBadge}>승인 필요</span>
          )}
        </div>
        <span className={styles.date}>{formatDate(issue.created_at)}</span>
      </div>

      <div className={styles.titleRow} onClick={onToggle}>
        <h4 className={styles.title}>{issue.title}</h4>
        <span className={styles.statusLabel} style={{ color: status.color }}>{status.label}</span>
        <span className={styles.expandIcon}>{expanded ? '▲' : '▼'}</span>
      </div>
      <p className={styles.summary}>{issue.summary}</p>

      {/* 확장 내용 */}
      {expanded && (
        <div className={styles.detail}>
          {/* 원문 */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>📝 보고 내용</p>
            <p className={styles.sectionText}>{issue.issue_text}</p>
            {issue.reporter_note && (
              <p className={styles.noteText}>메모: {issue.reporter_note}</p>
            )}
          </div>

          {/* 권고 조치 */}
          {issue.recommended_actions.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>✅ AI 권고 조치</p>
              <ol className={styles.actionList}>
                {issue.recommended_actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </div>
          )}

          {/* 영향도 */}
          {(issue.cost_impact || issue.schedule_impact) && (
            <div className={styles.impacts}>
              {issue.cost_impact && (
                <span className={styles.impactTag}>💰 {issue.cost_impact}</span>
              )}
              {issue.schedule_impact && (
                <span className={styles.impactTag}>📅 {issue.schedule_impact}</span>
              )}
            </div>
          )}

          {/* 법적 근거 */}
          {issue.legal_basis && (
            <p className={styles.legalBasis}>⚖️ {issue.legal_basis}</p>
          )}

          {/* 액션 버튼 — [승인][거절][협의] 3버튼 */}
          {issue.status !== 'resolved' && (
            <div className={styles.actions}>
              {/* 신규 이슈: 3버튼 모두 표시 */}
              {issue.status === 'open' && (
                <>
                  {onApprove && (
                    <button
                      className={`${styles.actionBtn} ${styles.approveBtn}`}
                      onClick={() => onApprove(issue.id)}
                    >
                      ✅ 승인
                    </button>
                  )}
                  {onReject && (
                    <button
                      className={`${styles.actionBtn} ${styles.rejectBtn}`}
                      onClick={() => onReject(issue.id)}
                    >
                      ❌ 거절
                    </button>
                  )}
                  {onNegotiate && (
                    <button
                      className={`${styles.actionBtn} ${styles.negotiateBtn}`}
                      onClick={() => onNegotiate(issue.id)}
                    >
                      🤝 협의
                    </button>
                  )}
                </>
              )}
              {/* 협의 중: 승인 또는 거절로 종결 */}
              {issue.status === 'reviewing' && (
                <>
                  {onApprove && (
                    <button
                      className={`${styles.actionBtn} ${styles.approveBtn}`}
                      onClick={() => onApprove(issue.id)}
                    >
                      ✅ 승인 확정
                    </button>
                  )}
                  {onReject && (
                    <button
                      className={`${styles.actionBtn} ${styles.rejectBtn}`}
                      onClick={() => onReject(issue.id)}
                    >
                      ❌ 거절 확정
                    </button>
                  )}
                </>
              )}
              {/* 승인된 이슈: 해결 완료 */}
              {issue.status === 'approved' && onResolve && (
                <button
                  className={`${styles.actionBtn} ${styles.resolveBtn}`}
                  onClick={() => onResolve(issue.id)}
                >
                  🏁 해결 완료
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
