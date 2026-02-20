'use client'

import { SiteIssue } from './IssueCard'
import { SEVERITY_CONFIG, CATEGORY_CONFIG } from '@/lib/ai/issue-types'
import styles from './IssueTimeline.module.scss'

interface IssueTimelineProps {
  issues: SiteIssue[]
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function IssueTimeline({ issues }: IssueTimelineProps) {
  if (issues.length === 0) {
    return (
      <div className={styles.empty}>
        <p>이슈 이력이 없어요</p>
      </div>
    )
  }

  return (
    <div className={styles.timeline}>
      {issues.map((issue, i) => {
        const sev = SEVERITY_CONFIG[issue.severity]
        const cat = CATEGORY_CONFIG[issue.category]
        const isLast = i === issues.length - 1
        return (
          <div key={issue.id} className={`${styles.item} ${isLast ? styles.last : ''}`}>
            <div className={styles.dot} style={{ background: sev.color }} />
            <div className={styles.line} />
            <div className={styles.content}>
              <div className={styles.itemHeader}>
                <span className={styles.itemDate}>{formatDate(issue.created_at)}</span>
                <span className={styles.itemCat}>{cat.emoji} {cat.label}</span>
                <span className={styles.itemSev} style={{ color: sev.color }}>{sev.emoji} {sev.label}</span>
              </div>
              <p className={styles.itemTitle}>{issue.title}</p>
              <p className={styles.itemSummary}>{issue.summary}</p>
              {issue.resolved_at && (
                <p className={styles.resolved}>✅ {formatDate(issue.resolved_at)} 해결</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
