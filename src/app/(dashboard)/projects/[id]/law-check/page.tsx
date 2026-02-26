'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.scss'

interface LawCheckRow {
  id: string
  law_id: string
  status: 'compliant' | 'violated' | 'not_applicable' | 'pending'
  details: Record<string, unknown>
  checked_at: string
  checked_by: string
  laws: {
    code: string
    name: string
    article: string
    title: string
    description: string
    violation_action: string
    category: string
    risk_weight: number
  }
}

interface LawSummary {
  compliant: number
  violated: number
  not_applicable: number
  pending: number
}

const STATUS_CONFIG = {
  compliant:       { icon: '✅', label: '충족',       color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.20)' },
  violated:        { icon: '⚠️', label: '미충족',     color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.20)' },
  not_applicable:  { icon: '➖', label: '해당없음',   color: '#6b7280', bg: 'rgba(107,114,128,0.06)',border: 'rgba(107,114,128,0.15)' },
  pending:         { icon: '🔍', label: '확인필요',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)' },
}

export default function LawCheckPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [checks, setChecks] = useState<LawCheckRow[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  const summary: LawSummary = checks.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    },
    { compliant: 0, violated: 0, not_applicable: 0, pending: 0 } as LawSummary
  )

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/law-checks`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setChecks(json.data ?? [])
          if (json.data?.length > 0) {
            setLastChecked(json.data[0].checked_at)
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function runCheck() {
    setRunning(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/law-check`, { method: 'POST' })
      if (res.ok) {
        await load()
      }
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>법령 준수 현황</h2>
          <p className={styles.subtitle}>
            건설·인테리어 관련 핵심 법령 {checks.length}개를 자동으로 점검합니다.
          </p>
        </div>
        <button
          className={styles.checkBtn}
          onClick={runCheck}
          disabled={running}
        >
          {running ? (
            <><span className={styles.spinner} /> 점검 중...</>
          ) : (
            '⚡ 법령 재점검'
          )}
        </button>
      </div>

      {/* 요약 카드 */}
      <div className={styles.summaryRow}>
        {[
          { key: 'compliant',      label: '충족',     count: summary.compliant,      color: '#10b981' },
          { key: 'violated',       label: '미충족',   count: summary.violated,       color: '#ef4444' },
          { key: 'not_applicable', label: '해당없음', count: summary.not_applicable, color: '#6b7280' },
          { key: 'pending',        label: '확인필요', count: summary.pending,        color: '#f59e0b' },
        ].map(item => (
          <div key={item.key} className={styles.summaryCard}>
            <div className={styles.summaryCount} style={{ color: item.color }}>{item.count}</div>
            <div className={styles.summaryLabel}>{item.label}</div>
          </div>
        ))}
      </div>

      {lastChecked && (
        <p className={styles.lastChecked}>
          마지막 점검: {new Date(lastChecked).toLocaleString('ko-KR')}
        </p>
      )}

      {/* 법령 목록 */}
      {checks.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>⚖️</div>
          <p className={styles.emptyText}>법령 점검 이력이 없습니다.</p>
          <p className={styles.emptyHint}>아래 버튼을 눌러 법령 점검을 시작하세요.</p>
          <button className={styles.checkBtn} onClick={runCheck} disabled={running}>
            {running ? '점검 중...' : '⚡ 법령 점검 시작'}
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {checks.map((check) => {
            const cfg = STATUS_CONFIG[check.status]
            const isExpanded = expandedId === check.id
            const isViolated = check.status === 'violated'

            return (
              <div
                key={check.id}
                className={`${styles.card} ${isViolated ? styles.cardViolated : ''}`}
                style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
                onClick={() => setExpandedId(isExpanded ? null : check.id)}
              >
                <div className={styles.cardRow}>
                  <span className={styles.statusIcon}>{cfg.icon}</span>
                  <div className={styles.cardMain}>
                    <div className={styles.cardTitle}>
                      <span className={styles.lawName}>{check.laws.name}</span>
                      <span className={styles.lawArticle}>{check.laws.article}</span>
                      <span className={styles.lawTitle}>{check.laws.title}</span>
                    </div>
                    {isViolated && !isExpanded && (
                      <p className={styles.violationHint}>{check.laws.violation_action}</p>
                    )}
                  </div>
                  <div className={styles.cardRight}>
                    <span className={styles.statusBadge} style={{ color: cfg.color, borderColor: cfg.border }}>
                      {cfg.label}
                    </span>
                    <span className={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* 펼쳐진 상세 */}
                {isExpanded && (
                  <div className={styles.detail} onClick={e => e.stopPropagation()}>
                    <p className={styles.detailDesc}>{check.laws.description}</p>

                    {isViolated && (
                      <div className={styles.actionBox}>
                        <div className={styles.actionTitle}>🔧 권장 조치</div>
                        <p className={styles.actionText}>{check.laws.violation_action}</p>
                      </div>
                    )}

                    <div className={styles.detailMeta}>
                      <span className={styles.metaItem}>카테고리: {check.laws.category}</span>
                      <span className={styles.metaItem}>가중치: {check.laws.risk_weight}</span>
                      <span className={styles.metaItem}>점검자: {check.checked_by}</span>
                    </div>

                    {check.details && Object.keys(check.details).length > 0 && (
                      <div className={styles.detailRaw}>
                        <div className={styles.detailRawTitle}>판정 근거</div>
                        <pre className={styles.detailRawPre}>{JSON.stringify(check.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
