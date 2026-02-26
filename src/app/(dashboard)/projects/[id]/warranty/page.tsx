'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import type { Project, WarrantyRecord } from '@/types/project'
import styles from './page.module.scss'

// 공종별 하자담보 기간 (건산법 시행령 별표4)
const WARRANTY_TRADES = [
  { key: 'waterproof', label: '방수공사', years: 3, categories: ['방수', '防水'] },
  { key: 'tile', label: '수장공사 (타일)', years: 1, categories: ['타일', '바닥'] },
  { key: 'wallpaper', label: '수장공사 (도배)', years: 1, categories: ['도배', '벽지'] },
  { key: 'painting', label: '도장공사', years: 1, categories: ['도장', '페인트'] },
  { key: 'stone', label: '석공사', years: 1, categories: ['석재', '대리석'] },
  { key: 'window', label: '창호공사', years: 1, categories: ['창호', '창문', '문'] },
  { key: 'electric', label: '전기/통신공사', years: 2, categories: ['전기', '통신', '조명'] },
  { key: 'plumbing', label: '설비공사', years: 2, categories: ['설비', '배관', '냉난방'] },
  { key: 'drainage', label: '옥외급배수/위생', years: 2, categories: ['급배수', '위생'] },
  { key: 'landscape', label: '조경공사', years: 2, categories: ['조경', '식재'] },
  { key: 'concrete', label: '철근콘크리트공사', years: 5, categories: ['콘크리트', 'RC'] },
  { key: 'steel', label: '철골공사', years: 5, categories: ['철골', '강구조'] },
  { key: 'earthwork', label: '대지조성공사', years: 2, categories: ['토공', '기초'] },
]

// 업종별 주요 공종 매핑
const INDUSTRY_TRADES: Record<string, string[]> = {
  cafe: ['waterproof', 'tile', 'wallpaper', 'painting', 'electric', 'plumbing'],
  restaurant: ['waterproof', 'tile', 'wallpaper', 'painting', 'electric', 'plumbing'],
  bar: ['waterproof', 'tile', 'wallpaper', 'painting', 'electric', 'plumbing'],
  bakery: ['waterproof', 'tile', 'electric', 'plumbing'],
  beauty: ['waterproof', 'tile', 'wallpaper', 'electric', 'plumbing'],
  clinic: ['waterproof', 'tile', 'wallpaper', 'painting', 'electric', 'plumbing'],
  fitness: ['waterproof', 'tile', 'painting', 'electric', 'plumbing'],
  retail: ['tile', 'wallpaper', 'painting', 'electric', 'window'],
  office: ['tile', 'wallpaper', 'painting', 'electric', 'window'],
  apartment: ['waterproof', 'tile', 'wallpaper', 'painting', 'window', 'electric', 'plumbing'],
  villa: ['waterproof', 'tile', 'wallpaper', 'painting', 'window', 'electric', 'plumbing'],
  house: ['waterproof', 'tile', 'wallpaper', 'painting', 'window', 'electric', 'plumbing', 'concrete'],
}

function getDaysLeft(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
}

function getWarrantyStatus(endDate: string): 'active' | 'expiring_soon' | 'expired' {
  const days = getDaysLeft(endDate)
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring_soon'
  return 'active'
}

export default function WarrantyPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()
  const toast = useToast()

  const [project, setProject] = useState<Project | null>(null)
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      setProject(proj as Project)

      const { data: wData } = await supabase
        .from('warranties')
        .select('*')
        .eq('project_id', projectId)
        .order('end_date', { ascending: true })

      setWarranties((wData || []) as WarrantyRecord[])
    } catch (err) {
      console.error('Warranty load error:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase])

  useEffect(() => { loadData() }, [loadData])

  const handleComplete = async () => {
    if (!project) return

    setCompleting(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // 1. 프로젝트 완료 처리
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'completed', actual_end_date: today })
        .eq('id', projectId)

      if (updateError) throw updateError

      // 2. 공종별 하자담보 자동 생성
      const industry = (project as Project).industry || 'cafe'
      const tradesToGenerate = INDUSTRY_TRADES[industry] || ['waterproof', 'tile', 'electric', 'plumbing']

      const warrantyRows = tradesToGenerate.map(tradeKey => {
        const trade = WARRANTY_TRADES.find(t => t.key === tradeKey)!
        const endDate = new Date(today)
        endDate.setFullYear(endDate.getFullYear() + trade.years)
        const endStr = endDate.toISOString().split('T')[0]
        return {
          project_id: projectId,
          trade_type: tradeKey,
          trade_label: trade.label,
          duration_years: trade.years,
          start_date: today,
          end_date: endStr,
          status: getWarrantyStatus(endStr),
        }
      })

      const { error: warrantyError } = await supabase
        .from('warranties')
        .insert(warrantyRows)

      if (warrantyError) throw warrantyError

      // 3. 법령 재점검
      try {
        await fetch(`/api/projects/${projectId}/law-checks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recheck: true }),
        })
      } catch { /* not critical */ }

      toast.success(`공사 완료 처리됐습니다. 하자담보 ${warrantyRows.length}개가 자동 등록됐어요!`)
      setProject(prev => prev ? { ...prev, status: 'completed', actual_end_date: today } : null)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '처리 중 오류가 발생했어요.'
      toast.error(msg)
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}><div className={styles.spinner} /><p>데이터 불러오는 중...</p></div>
  }

  const isCompleted = project?.status === 'completed'
  const activeCount = warranties.filter(w => w.status === 'active').length
  const soonCount = warranties.filter(w => w.status === 'expiring_soon').length
  const expiredCount = warranties.filter(w => w.status === 'expired').length

  return (
    <div className={styles.page}>
      {/* 안내 배너 */}
      {!isCompleted ? (
        <div className={styles.pendingBanner}>
          <div className={styles.bannerIcon}>🔒</div>
          <div className={styles.bannerContent}>
            <h3>공사 완료 후 하자담보가 자동 등록됩니다</h3>
            <p>공사 완료 처리를 하면 업종별 공종에 맞는 하자담보기간이 자동으로 등록됩니다.<br/>건설산업기본법 시행령 별표4 기준으로 생성됩니다.</p>
          </div>
          <button
            type="button"
            className={styles.completeBtn}
            onClick={handleComplete}
            disabled={completing}
          >
            {completing ? '처리 중...' : '🏁 공사 완료 처리'}
          </button>
        </div>
      ) : (
        <div className={styles.completedBanner}>
          <span>✅</span>
          <div>
            <strong>공사 완료</strong>
            <span> — {(project as Project & { actual_end_date?: string }).actual_end_date || project?.end_date} 완료 처리됨</span>
          </div>
        </div>
      )}

      {/* 요약 카드 */}
      {warranties.length > 0 && (
        <div className={styles.summaryCards}>
          <div className={styles.sumCard}>
            <span className={styles.sumNum}>{warranties.length}</span>
            <span className={styles.sumLabel}>전체 담보</span>
          </div>
          <div className={styles.sumCard} style={{ borderColor: '#10b981' }}>
            <span className={styles.sumNum} style={{ color: '#10b981' }}>{activeCount}</span>
            <span className={styles.sumLabel}>담보 기간 중</span>
          </div>
          <div className={styles.sumCard} style={{ borderColor: '#f59e0b' }}>
            <span className={styles.sumNum} style={{ color: '#f59e0b' }}>{soonCount}</span>
            <span className={styles.sumLabel}>만료 임박 (30일)</span>
          </div>
          <div className={styles.sumCard} style={{ borderColor: '#ef4444' }}>
            <span className={styles.sumNum} style={{ color: '#ef4444' }}>{expiredCount}</span>
            <span className={styles.sumLabel}>만료됨</span>
          </div>
        </div>
      )}

      {/* 하자담보 목록 */}
      {warranties.length === 0 ? (
        isCompleted ? (
          <div className={styles.emptyState}>
            <span>📋</span>
            <p>등록된 하자담보가 없습니다.<br/>공사 완료 처리를 다시 실행하면 자동 생성됩니다.</p>
          </div>
        ) : null
      ) : (
        <section className={styles.warrantyList}>
          <h2>공종별 하자담보 현황</h2>
          <div className={styles.cards}>
            {warranties.map(w => {
              const daysLeft = getDaysLeft(w.end_date)
              const statusConfig = {
                active: { color: '#10b981', bg: '#ecfdf5', label: '담보 기간 중', badge: '✅' },
                expiring_soon: { color: '#f59e0b', bg: '#fffbeb', label: `${daysLeft}일 후 만료`, badge: '⚠️' },
                expired: { color: '#ef4444', bg: '#fef2f2', label: '담보 기간 만료', badge: '❌' },
              }[w.status]

              // 타임라인 진행도
              const startMs = new Date(w.start_date).getTime()
              const endMs = new Date(w.end_date).getTime()
              const nowMs = Date.now()
              const elapsed = Math.max(0, Math.min(1, (nowMs - startMs) / (endMs - startMs))) * 100

              return (
                <div key={w.id} className={styles.warrantyCard} style={{ borderLeftColor: statusConfig.color }}>
                  <div className={styles.cardHeader}>
                    <div className={styles.tradeInfo}>
                      <span className={styles.tradeBadge}>{statusConfig.badge}</span>
                      <h3>{w.trade_label}</h3>
                    </div>
                    <span className={styles.statusBadge} style={{ background: statusConfig.bg, color: statusConfig.color }}>
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.metaRow}>
                      <span>담보기간</span>
                      <strong>{w.duration_years}년</strong>
                    </div>
                    <div className={styles.metaRow}>
                      <span>시작일</span>
                      <strong>{w.start_date}</strong>
                    </div>
                    <div className={styles.metaRow}>
                      <span>만료일</span>
                      <strong>{w.end_date}</strong>
                    </div>
                    {w.status !== 'expired' && (
                      <div className={styles.metaRow}>
                        <span>남은 기간</span>
                        <strong style={{ color: statusConfig.color }}>{daysLeft}일</strong>
                      </div>
                    )}
                  </div>

                  {/* 타임라인 바 */}
                  <div className={styles.timeline}>
                    <div className={styles.timelineBar}>
                      <div
                        className={styles.timelineFill}
                        style={{ width: `${elapsed}%`, background: statusConfig.color }}
                      />
                      <div className={styles.timelineNow} style={{ left: `${elapsed}%` }} />
                    </div>
                    <div className={styles.timelineLabels}>
                      <span>{w.start_date}</span>
                      <span>현재</span>
                      <span>{w.end_date}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 내보내기 */}
      {warranties.length > 0 && (
        <div className={styles.exportSection}>
          <button type="button" className={styles.exportBtn} onClick={() => toast.info('PDF 내보내기는 곧 지원 예정입니다.')}>
            📄 하자담보 현황 내보내기 (예정)
          </button>
        </div>
      )}
    </div>
  )
}
