'use client'

import { useRef, useState, useEffect } from 'react'
import styles from './SignaturePad.module.scss'

interface SignaturePadProps {
  onSign: (dataUrl: string) => void
  onCancel: () => void
  existingSignature?: string | null
  partyName: string
}

export default function SignaturePad({ onSign, onCancel, existingSignature, partyName }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas resolution
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Signature line
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(20, rect.height - 30)
    ctx.lineTo(rect.width - 20, rect.height - 30)
    ctx.stroke()

    // Setup drawing style
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    setHasDrawn(true)
    const { x, y } = getCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width * 2, rect.height * 2)

    // Redraw line
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(20, rect.height - 30)
    ctx.lineTo(rect.width - 20, rect.height - 30)
    ctx.stroke()

    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    setHasDrawn(false)
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onSign(dataUrl)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>{partyName} 서명</h3>
        <button className={styles.closeBtn} onClick={onCancel}>✕</button>
      </div>

      {existingSignature ? (
        <div className={styles.existingSignature}>
          <img src={existingSignature} alt="서명" />
          <p>이미 서명되었습니다</p>
          <button className={styles.resignBtn} onClick={() => onSign('')}>
            서명 취소
          </button>
        </div>
      ) : (
        <>
          <div className={styles.canvasWrapper}>
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasDrawn && (
              <div className={styles.placeholder}>여기에 서명하세요</div>
            )}
          </div>

          <div className={styles.actions}>
            <button className={styles.clearBtn} onClick={clearCanvas}>
              지우기
            </button>
            <button
              className={styles.confirmBtn}
              onClick={handleConfirm}
              disabled={!hasDrawn}
            >
              서명 완료
            </button>
          </div>
        </>
      )}
    </div>
  )
}
