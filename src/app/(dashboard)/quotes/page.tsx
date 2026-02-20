'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.scss'

interface QuoteAnalysis {
  id: string
  space_type: string
  space_detail: string
  area_pyeong: number
  grade_standard: any
  is_budget_guide: boolean
  ai_comment: string
  created_at: string
}

const SPACE_EMOJI: Record<string, string> = {
  apartment: '🏠', villa: '🏡', house: '🏘️', officetel: '🏢', studio: '🛏️',
  cafe: '☕', office: '💼', retail: '🛍️', clinic: '🏥', fitness: '💪', other_commercial: '🏪',
}

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<QuoteAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('quote_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (!error && data) setQuotes(data)
      setLoading(false)
    }
    load()
  }, [])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const formatRange = (grade: any) => {
    if (!grade) return '-'
    const min = grade.min ?? 0
    const max = grade.max ?? 0
    if (min >= 10000) {
      return `${Math.floor(min / 10000)}억~${Math.floor(max / 10000)}억원`
    }
    return `${min.toLocaleString()}~${max.toLocaleString()}만원`
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>AI 예산 가이드</h1>
          <p className={styles.subtitle}>인테리어 공사 예산을 AI로 빠르게 파악하세요</p>
        </div>
        <button
          className={styles.newBtn}
          onClick={() => router.push('/quotes/new')}
        >
          + 새 예산 계산
        </button>
      </div>

      {/* 안내 배너 */}
      <div className={styles.banner}>
        <div className={styles.bannerIcon}>🤖</div>
        <div>
          <p className={styles.bannerTitle}>AI 예산 가이드란?</p>
          <p className={styles.bannerDesc}>
            공간 유형, 면적, 자재 등급을 선택하면 AI가 예산 범위를 자동 산출합니다.
            정확한 견적이 아닌 예산 감잡기 도구입니다.
          </p>
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className={styles.loading}>불러오는 중...</div>
      ) : quotes.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p className={styles.emptyTitle}>아직 예산 가이드가 없어요</p>
          <p className={styles.emptyDesc}>새 예산 계산을 시작해보세요</p>
          <button
            className={styles.emptyBtn}
            onClick={() => router.push('/quotes/new')}
          >
            지금 시작하기 →
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {quotes.map(q => (
            <div key={q.id} className={styles.card}>
              <div className={styles.cardLeft}>
                <span className={styles.cardEmoji}>
                  {SPACE_EMOJI[q.space_type] ?? '🏗️'}
                </span>
                <div>
                  <p className={styles.cardTitle}>
                    {q.space_detail} · {q.area_pyeong}평
                  </p>
                  <p className={styles.cardRange}>
                    표준 {formatRange(q.grade_standard)}
                  </p>
                  {q.ai_comment && (
                    <p className={styles.cardComment}>{q.ai_comment}</p>
                  )}
                </div>
              </div>
              <div className={styles.cardRight}>
                <span className={styles.cardDate}>{formatDate(q.created_at)}</span>
                {q.is_budget_guide && (
                  <span className={styles.cardBadge}>예산가이드</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
