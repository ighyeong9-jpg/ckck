'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import styles from './PdfDownloadButton.module.scss'

interface PdfDownloadButtonProps {
  onExport: () => Promise<void>
  label?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
}

export default function PdfDownloadButton({
  onExport,
  label = 'PDF 저장',
  variant = 'secondary',
  size = 'md',
}: PdfDownloadButtonProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleClick = async () => {
    if (loading) return
    setLoading(true)
    setDone(false)
    try {
      await onExport()
      setDone(true)
      setTimeout(() => setDone(false), 2500)
    } catch (err) {
      console.error('[PDF] 내보내기 실패:', err)
      toast.error('PDF 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${styles[size]}`}
      onClick={handleClick}
      disabled={loading}
      title="PDF로 저장"
    >
      {loading ? (
        <>
          <span className={styles.spinner} />
          생성 중...
        </>
      ) : done ? (
        <>✅ 저장 완료</>
      ) : (
        <>
          <span className={styles.icon}>⬇</span>
          {label}
        </>
      )}
    </button>
  )
}
