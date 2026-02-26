'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import styles from './DrawingCanvas.module.scss'

export type MarkerType = 'defect' | 'check' | 'memo' | 'photo'

export interface Marker {
  id: string
  type: MarkerType
  x: number   // 0~1 비율
  y: number   // 0~1 비율
  label: string
  color: string
}

interface DrawingCanvasProps {
  imageUrl: string
  initialMarkers?: Marker[]
  onSave: (markers: Marker[]) => void
  onClose: () => void
}

const MARKER_CONFIG: Record<MarkerType, { emoji: string; color: string; label: string }> = {
  defect: { emoji: '🔴', color: '#ef4444', label: '하자' },
  check:  { emoji: '✅', color: '#10b981', label: '체크' },
  memo:   { emoji: '📝', color: '#f59e0b', label: '메모' },
  photo:  { emoji: '📍', color: '#3b82f6', label: '사진위치' },
}

export default function DrawingCanvas({ imageUrl, initialMarkers = [], onSave, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [markers, setMarkers] = useState<Marker[]>(initialMarkers)
  const [activeTool, setActiveTool] = useState<MarkerType>('defect')
  const [pendingMarker, setPendingMarker] = useState<Marker | null>(null)
  const [labelInput, setLabelInput] = useState('')
  const [labelPos, setLabelPos] = useState<{ x: number; y: number } | null>(null)

  // 이미지 로드 & 캔버스 그리기
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgRef.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height)

    // 마커 그리기
    for (const marker of markers) {
      const px = marker.x * canvas.width
      const py = marker.y * canvas.height
      const cfg = MARKER_CONFIG[marker.type]

      // 원 배경
      ctx.beginPath()
      ctx.arc(px, py, 14, 0, Math.PI * 2)
      ctx.fillStyle = `${cfg.color}cc`
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      // 이모지
      ctx.font = '14px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(cfg.emoji, px, py)

      // 라벨
      if (marker.label) {
        ctx.font = 'bold 11px sans-serif'
        ctx.fillStyle = '#fff'
        ctx.fillText(marker.label, px, py + 22)
      }
    }
  }, [markers])

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      const canvas = canvasRef.current
      if (canvas) {
        // 컨테이너 너비에 맞춰 캔버스 크기 조정
        const maxW = Math.min(800, window.innerWidth - 48)
        const scale = maxW / img.naturalWidth
        canvas.width = maxW
        canvas.height = img.naturalHeight * scale
      }
      drawCanvas()
    }
    img.src = imageUrl
  }, [imageUrl, drawCanvas])

  useEffect(() => { drawCanvas() }, [drawCanvas])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (pendingMarker) return // 라벨 입력 중이면 무시
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const rawX = (e.clientX - rect.left) * scaleX
    const rawY = (e.clientY - rect.top) * scaleY
    const xRatio = rawX / canvas.width
    const yRatio = rawY / canvas.height

    const newMarker: Marker = {
      id: `marker-${Date.now()}`,
      type: activeTool,
      x: xRatio,
      y: yRatio,
      label: '',
      color: MARKER_CONFIG[activeTool].color,
    }
    setPendingMarker(newMarker)
    setLabelInput('')
    // 라벨 입력 UI 위치 (화면 기준)
    setLabelPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const confirmMarker = () => {
    if (!pendingMarker) return
    const finalized: Marker = { ...pendingMarker, label: labelInput }
    setMarkers(prev => [...prev, finalized])
    setPendingMarker(null)
    setLabelInput('')
    setLabelPos(null)
  }

  const cancelPending = () => {
    setPendingMarker(null)
    setLabelInput('')
    setLabelPos(null)
  }

  const removeLastMarker = () => {
    setMarkers(prev => prev.slice(0, -1))
  }

  const handleSave = () => {
    onSave(markers)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* 툴바 */}
        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            {(Object.entries(MARKER_CONFIG) as [MarkerType, typeof MARKER_CONFIG[MarkerType]][]).map(([type, cfg]) => (
              <button
                key={type}
                type="button"
                className={`${styles.toolBtn} ${activeTool === type ? styles.activeToolBtn : ''}`}
                onClick={() => { setActiveTool(type); cancelPending() }}
                title={cfg.label}
              >
                {cfg.emoji} {cfg.label}
              </button>
            ))}
          </div>
          <div className={styles.toolActions}>
            <button type="button" className={styles.undoBtn} onClick={removeLastMarker} disabled={markers.length === 0}>
              ↩ 되돌리기
            </button>
            <span className={styles.markerCount}>{markers.length}개 마커</span>
          </div>
        </div>

        {/* 캔버스 영역 */}
        <div className={styles.canvasWrap}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onClick={handleCanvasClick}
            style={{ cursor: 'crosshair' }}
          />

          {/* 라벨 입력 팝업 */}
          {pendingMarker && labelPos && (
            <div
              className={styles.labelPopup}
              style={{ left: labelPos.x, top: labelPos.y - 60 }}
            >
              <input
                autoFocus
                type="text"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmMarker()
                  if (e.key === 'Escape') cancelPending()
                }}
                placeholder="라벨 입력 (Enter)"
                className={styles.labelInput}
                maxLength={20}
              />
              <div className={styles.labelBtns}>
                <button type="button" onClick={confirmMarker}>확인</button>
                <button type="button" onClick={cancelPending}>취소</button>
              </div>
            </div>
          )}
        </div>

        {/* 마커 목록 */}
        {markers.length > 0 && (
          <div className={styles.markerList}>
            {markers.map((m, i) => (
              <span key={m.id} className={styles.markerTag} style={{ borderColor: m.color }}>
                {MARKER_CONFIG[m.type].emoji} {m.label || `마커${i + 1}`}
                <button type="button" onClick={() => setMarkers(prev => prev.filter(x => x.id !== m.id))}>×</button>
              </span>
            ))}
          </div>
        )}

        {/* 하단 버튼 */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>취소</button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            💾 마킹 저장 ({markers.length}개)
          </button>
        </div>
      </div>
    </div>
  )
}
