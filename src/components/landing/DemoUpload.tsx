'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import styles from './DemoUpload.module.scss'

/**
 * DemoUpload — 로그인 없이 체험 가능한 사진 1장 데모
 * 랜딩페이지 히어로 섹션에 사용
 * 1회 한정 (sessionStorage 기반)
 */
export default function DemoUpload() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [used, setUsed] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem('demo_used') === '1'
  )

  const analyze = useCallback(async (file: File) => {
    if (used) return
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 올려주세요 (JPG, PNG, WEBP)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('10MB 이하 이미지를 올려주세요')
      return
    }

    setAnalyzing(true)
    setError(null)

    try {
      // base64 변환
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '이 현장 사진을 분석해주세요. 안전 현황 확인과 주요 체크포인트, 법적 근거를 알려주세요.',
          imageData: { base64, mimeType: file.type },
          isDemo: true,
        }),
      })

      if (res.status === 401) {
        // 미로그인 → 결과 미리보기 후 가입 유도
        setResult('DEMO_AUTH_NEEDED')
        sessionStorage.setItem('demo_image', base64)
        sessionStorage.setItem('demo_mime', file.type)
        sessionStorage.setItem('demo_used', '1')
        setUsed(true)
        return
      }

      if (!res.ok) throw new Error('분석 중 오류가 발생했어요')

      const data = await res.json()
      setResult(data.message ?? '분석 완료')
      sessionStorage.setItem('demo_used', '1')
      setUsed(true)
    } catch (err: any) {
      setError(err.message ?? '다시 시도해주세요')
    } finally {
      setAnalyzing(false)
    }
  }, [used])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) analyze(file)
  }, [analyze])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) analyze(file)
  }

  // 가입 후 데모 결과 사용 → /login으로
  const goSignup = () => {
    router.push('/login?from=demo')
  }

  if (used && result === 'DEMO_AUTH_NEEDED') {
    return (
      <div className={styles.resultBox}>
        <div className={styles.resultPreview}>
          <span>📊</span>
          <div>
            <strong>분석이 완료됐어요!</strong>
            <p>결과를 보려면 무료로 가입하세요.<br />가입 후 바로 확인할 수 있어요.</p>
          </div>
        </div>
        <button className={styles.signupBtn} onClick={goSignup}>
          무료로 결과 확인하기 →
        </button>
        <p className={styles.loginLink}>
          이미 계정이 있어요?{' '}
          <button onClick={() => router.push('/login')}>로그인</button>
        </p>
      </div>
    )
  }

  if (result && result !== 'DEMO_AUTH_NEEDED') {
    return (
      <div className={styles.resultBox}>
        <div className={styles.resultText}>
          <span className={styles.resultIcon}>✅</span>
          <pre className={styles.resultContent}>{result}</pre>
        </div>
        <button className={styles.signupBtn} onClick={goSignup}>
          더 많은 기능 무료로 시작하기 →
        </button>
      </div>
    )
  }

  return (
    <div
      className={`${styles.dropZone} ${dragging ? styles.dragging : ''} ${used ? styles.disabled : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !used && !analyzing && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="현장 사진 업로드"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={onFileChange}
        disabled={used || analyzing}
      />

      {analyzing ? (
        <div className={styles.analyzing}>
          <div className={styles.spinner} />
          <p>AI가 분석 중이에요...</p>
          <span>법령 기준과 비교하고 있어요</span>
        </div>
      ) : (
        <div className={styles.idle}>
          <span className={styles.cameraIcon}>📸</span>
          <p className={styles.mainText}>현장 사진 한 장만 올려보세요</p>
          <span className={styles.subText}>AI가 즉시 분석해드려요 · 로그인 불필요</span>
          <div className={styles.dropHint}>드래그하거나 클릭하세요</div>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
