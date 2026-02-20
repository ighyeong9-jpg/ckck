'use client'

import { useState, useCallback } from 'react'
import { IssueClassifyResult } from '@/lib/ai/issue-types'
import styles from './IssueReporter.module.scss'

interface IssueReporterProps {
  projectId?: string
  onClassified?: (issueId: string | null, classification: IssueClassifyResult) => void
}

export default function IssueReporter({ projectId, onClassified }: IssueReporterProps) {
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [charCount, setCharCount] = useState(0)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    setCharCount(e.target.value.length)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (text.trim().length < 5) {
      setError('이슈 내용을 5자 이상 입력해주세요.')
      return
    }
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/classify-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          issueText: text,
          reporterNote: note || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '이슈 분류 실패')
      onClassified?.(data.issueId, data.classification)
      setText('')
      setNote('')
      setCharCount(0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [text, note, projectId, onClassified])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icon}>📡</span>
        <div>
          <h3 className={styles.title}>현장 이슈 보고</h3>
          <p className={styles.subtitle}>이슈를 입력하면 AI가 즉시 분류하고 조치를 안내해요</p>
        </div>
      </div>

      <textarea
        className={styles.textarea}
        placeholder={`현장에서 발생한 상황을 자세히 입력해주세요.\n\n예시:\n• 2층 화장실 방수 작업 후 누수 발견됨. 타일 시공 전이라 바로 재작업 가능한 상황.\n• 자재 납품이 3일 지연됨. 창호 설치가 밀려 전체 공정 지연 우려.`}
        value={text}
        onChange={handleChange}
        rows={6}
        maxLength={1000}
      />
      <div className={styles.charCount}>{charCount}/1000</div>

      <textarea
        className={`${styles.textarea} ${styles.noteArea}`}
        placeholder="추가 메모 (선택사항): 현장 책임자, 관련 업체, 목격 상황 등"
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={2}
        maxLength={300}
      />

      {error && <p className={styles.error}>{error}</p>}

      <button
        className={styles.submitBtn}
        onClick={handleSubmit}
        disabled={loading || text.trim().length < 5}
      >
        {loading ? (
          <>
            <span className={styles.spinner} />
            AI 분석 중...
          </>
        ) : (
          '이슈 보고 + AI 분류 →'
        )}
      </button>
    </div>
  )
}
