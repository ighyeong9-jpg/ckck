'use client'

import { useRef } from 'react'
import type { AutoCheckResult } from '@/lib/ai/auto-checker'
import styles from './AutoCaptureButton.module.scss'

interface AutoCaptureButtonProps {
  projectId: string
  onResult?: (result: AutoCheckResult) => void
  className?: string
}

export default function AutoCaptureButton({ projectId, onResult, className }: AutoCaptureButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const loadingRef = useRef(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || loadingRef.current) return
    loadingRef.current = true

    try {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      const mimeType = file.type || 'image/jpeg'

      const res = await fetch('/api/ai/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, imageBase64: base64, mimeType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI 분석 실패')
      onResult?.(data as AutoCheckResult)
    } catch (err) {
      console.error('[AutoCaptureButton]', err)
    } finally {
      loadingRef.current = false
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <label className={`${styles.btn} ${className ?? ''}`} title="원터치 AI 체크">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className={styles.hiddenInput}
      />
      📸 원터치 AI 체크
    </label>
  )
}
