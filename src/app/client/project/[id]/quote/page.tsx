'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.scss'

interface QuoteItem {
  id: string
  category: string
  item_name: string
  specification: string | null
  unit: string
  quantity: number
  unit_price: number
}

export default function ClientQuotePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [items, setItems] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuote()
  }, [projectId])

  const loadQuote = async () => {
    try {
      const { data } = await supabase
        .from('quote_line_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      if (data) setItems(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    )
    const vat = Math.round(subtotal * 0.1)
    return {
      subtotal,
      vat,
      total: subtotal + vat,
    }
  }, [items])

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString()}원`
  }

  const getCategoryName = (category: string) => {
    const map: Record<string, string> = {
      demolition: '철거',
      electrical: '전기',
      plumbing: '설비',
      carpentry: '목공',
      tile: '타일',
      paint: '도장',
      wallpaper: '도배',
      flooring: '바닥재',
      furniture: '가구',
      other: '기타',
    }
    return map[category] || category
  }

  const groupedItems = useMemo(() => {
    const groups: Record<string, QuoteItem[]> = {}
    items.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = []
      }
      groups[item.category].push(item)
    })
    return groups
  }, [items])

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          ← 뒤로
        </button>
        <h1 className={styles.title}>견적서</h1>
      </header>

      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>공사비 합계</span>
          <span className={styles.summaryValue}>{formatAmount(summary.subtotal)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>부가세 (10%)</span>
          <span className={styles.summaryValue}>{formatAmount(summary.vat)}</span>
        </div>
        <div className={styles.summaryRow + ' ' + styles.total}>
          <span className={styles.summaryLabel}>총 금액</span>
          <span className={styles.summaryValue}>{formatAmount(summary.total)}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>💰</div>
          <p>아직 견적서가 등록되지 않았습니다</p>
        </div>
      ) : (
        <div className={styles.itemsSection}>
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className={styles.categoryGroup}>
              <h2 className={styles.categoryTitle}>{getCategoryName(category)}</h2>

              <div className={styles.itemsList}>
                {categoryItems.map((item) => {
                  const amount = item.quantity * item.unit_price
                  return (
                    <div key={item.id} className={styles.itemRow}>
                      <div className={styles.itemInfo}>
                        <p className={styles.itemName}>{item.item_name}</p>
                        {item.specification && (
                          <p className={styles.itemSpec}>{item.specification}</p>
                        )}
                        <p className={styles.itemCalc}>
                          {item.quantity.toLocaleString()}{item.unit} × {formatAmount(item.unit_price)}
                        </p>
                      </div>
                      <div className={styles.itemAmount}>
                        {formatAmount(amount)}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className={styles.categoryTotal}>
                <span>소계</span>
                <span>
                  {formatAmount(
                    categoryItems.reduce(
                      (sum, item) => sum + item.quantity * item.unit_price,
                      0
                    )
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
