'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toKoreanRelativeTime, toKoreanDate } from '@/lib/utils/dateUtils'
import styles from './ProjectTimeline.module.scss'

// ─── 타입 ─────────────────────────────────────────────────

type EventType = 'evidence' | 'dispute' | 'change_order' | 'process' | 'diagnostic'

interface TimelineEvent {
  id: string
  type: EventType
  title: string
  description: string
  date: string
  icon: string
  color: string
  linkUrl?: string
  metadata?: Record<string, unknown>
}

interface ProjectTimelineProps {
  projectId: string
  projectName?: string
}

// ─── 이벤트 타입 설정 ──────────────────────────────────────

const EVENT_CONFIG: Record<EventType, { icon: string; color: string; label: string }> = {
  evidence:     { icon: '📁', color: '#3b82f6', label: '증빙 파일' },
  dispute:      { icon: '⚠️', color: '#FF6B2B', label: '기록 관리 징후' },
  change_order: { icon: '🔄', color: '#8b5cf6', label: '변경사항' },
  process:      { icon: '🔧', color: '#10b981', label: '공정 완료' },
  diagnostic:   { icon: '📋', color: '#f59e0b', label: '진단 체크' },
}

const SIGNAL_LABELS: Record<string, string> = {
  verbal_agreement:  '구두합의 감지',
  additional_cost:   '추가비용 요구',
  abandonment_risk:  '먹튀 위험',
  quality_issue:     '품질 불량',
  delay:             '공사 지연',
  subcontractor_wage:'임금 체불',
  no_contract:       '계약서 없음',
}

// ─── 컴포넌트 ─────────────────────────────────────────────

export default function ProjectTimeline({ projectId, projectName }: ProjectTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<EventType | 'all'>('all')

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const all: TimelineEvent[] = []

      // 1. 증빙 파일
      const { data: evidenceFiles } = await supabase
        .from('evidence_files')
        .select('id, file_name, description, uploaded_at, file_type')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })
        .limit(30)

      evidenceFiles?.forEach(f => {
        all.push({
          id: `ev-${f.id}`,
          type: 'evidence',
          title: f.file_name ?? '파일 업로드',
          description: f.description ?? `${f.file_type ?? '파일'} 업로드됨`,
          date: f.uploaded_at,
          icon: '📁',
          color: '#3b82f6',
          linkUrl: `/projects/${projectId}/evidence-package`,
        })
      })

      // 2. 기록 관리 징후
      const { data: disputes } = await supabase
        .from('dispute_signals')
        .select('id, signal_type, description, created_at, legal_basis, recommended_action')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20)

      disputes?.forEach(d => {
        all.push({
          id: `ds-${d.id}`,
          type: 'dispute',
          title: SIGNAL_LABELS[d.signal_type] ?? d.signal_type,
          description: d.recommended_action ?? d.description ?? '기록 관리 징후 감지됨',
          date: d.created_at,
          icon: '⚠️',
          color: '#FF6B2B',
        })
      })

      // 3. 변경사항
      const { data: changeOrders } = await supabase
        .from('change_orders')
        .select('id, title, description, status, created_at, amount')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20)

      changeOrders?.forEach(c => {
        const statusLabel = c.status === 'approved' ? '승인됨' : c.status === 'rejected' ? '거절됨' : '검토 중'
        all.push({
          id: `co-${c.id}`,
          type: 'change_order',
          title: c.title ?? '변경사항',
          description: `${statusLabel}${c.amount ? ` · ₩${c.amount.toLocaleString()}` : ''}`,
          date: c.created_at,
          icon: '🔄',
          color: '#8b5cf6',
          linkUrl: `/projects/${projectId}/changes`,
        })
      })

      // 4. 공정 완료
      const { data: processes } = await supabase
        .from('processes')
        .select('id, name, status, updated_at, progress')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(20)

      processes?.forEach(p => {
        all.push({
          id: `pr-${p.id}`,
          type: 'process',
          title: `${p.name} 완료`,
          description: `공정 진행률 ${p.progress ?? 100}%`,
          date: p.updated_at,
          icon: '✅',
          color: '#10b981',
          linkUrl: `/projects/${projectId}/process`,
        })
      })

      // 날짜순 정렬 (최신 먼저)
      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setEvents(all)
    } catch (err) {
      console.error('[ProjectTimeline] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  // PDF 내보내기 (기본 브라우저 인쇄)
  const exportPDF = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className={styles.skeleton}>
        {[1,2,3,4].map(i => <div key={i} className={styles.skeletonItem} />)}
      </div>
    )
  }

  return (
    <div className={styles.timeline}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>현장 타임라인</h2>
          <span className={styles.count}>기록 총 {events.length}개</span>
        </div>
        <button className={styles.exportBtn} onClick={exportPDF} title="PDF로 내보내기">
          📄 PDF
        </button>
      </div>

      {/* 필터 탭 */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          전체 {events.length}
        </button>
        {(Object.keys(EVENT_CONFIG) as EventType[]).map(type => {
          const cnt = events.filter(e => e.type === type).length
          if (cnt === 0) return null
          return (
            <button
              key={type}
              className={`${styles.filterBtn} ${filter === type ? styles.active : ''}`}
              onClick={() => setFilter(type)}
              style={{ '--filter-color': EVENT_CONFIG[type].color } as React.CSSProperties}
            >
              {EVENT_CONFIG[type].icon} {EVENT_CONFIG[type].label} {cnt}
            </button>
          )
        })}
      </div>

      {/* 빈 상태 */}
      {filtered.length === 0 && (
        <div className={styles.empty}>
          <span>📭</span>
          <p>아직 기록이 없어요. 현장 활동이 쌓이면 여기에 자동으로 나타나요!</p>
        </div>
      )}

      {/* 이벤트 목록 */}
      <ul className={styles.list}>
        {filtered.map((event, idx) => (
          <li key={event.id} className={styles.item}>
            {/* 타임라인 선 */}
            <div className={styles.lineCol}>
              <div
                className={styles.dot}
                style={{ background: event.color }}
              />
              {idx < filtered.length - 1 && <div className={styles.line} />}
            </div>

            {/* 내용 */}
            <div
              className={`${styles.content} ${event.linkUrl ? styles.clickable : ''}`}
              onClick={() => event.linkUrl && (window.location.href = event.linkUrl)}
            >
              <div className={styles.contentTop}>
                <span className={styles.typeLabel} style={{ color: event.color }}>
                  {event.icon} {EVENT_CONFIG[event.type].label}
                </span>
                <span className={styles.date} title={toKoreanDate(event.date)}>
                  {toKoreanRelativeTime(event.date)}
                </span>
              </div>
              <div className={styles.eventTitle}>{event.title}</div>
              <div className={styles.eventDesc}>{event.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
