'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PhotoGallery from '@/components/gallery/PhotoGallery'
import BeforeAfterSlider from '@/components/gallery/BeforeAfterSlider'
import DrawingCanvas, { type Marker } from '@/components/gallery/DrawingCanvas'
import AutoCaptureButton from '@/components/AutoCaptureButton'
import type { GalleryPhoto } from '@/types/photoGallery'
import QuickActions from '@/components/ui/QuickActions'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

export default function GalleryPage() {
  const toast = useToast()
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState<'gallery' | 'compare'>('gallery')
  const [comparePhotos, setComparePhotos] = useState<{ before: string; after: string }>({ before: '', after: '' })
  const [checkingPhotoId, setCheckingPhotoId] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<{ photoId: string; result: any } | null>(null)
  const [markingPhoto, setMarkingPhoto] = useState<GalleryPhoto | null>(null)

  useEffect(() => {
    loadPhotos()

    // Realtime: 새 파일 업로드 시 갤러리 즉시 반영
    const channel = supabase
      .channel(`gallery-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'files', filter: `project_id=eq.${projectId}` },
        (payload) => {
          const f = payload.new as { id: string; file_url: string; file_name: string; file_type: string; created_at: string }
          if (!f.file_type?.startsWith('image/') && !f.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return
          setPhotos(prev => {
            if (prev.some(p => p.id === f.id)) return prev
            return [{ id: f.id, url: f.file_url, file_name: f.file_name || 'photo', category: '', description: null, uploaded_at: f.created_at }, ...prev]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  const loadPhotos = async () => {
    try {
      // Load from files table
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const galleryPhotos: GalleryPhoto[] = data
          .filter(f => f.file_type?.startsWith('image/') || f.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
          .map(f => ({
            id: f.id,
            url: f.file_url,
            file_name: f.file_name || 'photo',
            category: '',
            description: null,
            uploaded_at: f.created_at,
          }))
        setPhotos(galleryPhotos)
      }
    } catch (err) {
      console.error('Error loading photos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAutoCheck = async (photo: GalleryPhoto) => {
    setCheckingPhotoId(photo.id)
    setCheckResult(null)
    try {
      // 이미지 URL → base64 변환
      const res = await fetch(photo.url)
      const blob = await res.blob()
      const mimeType = blob.type || 'image/jpeg'
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      const response = await fetch('/api/ai/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, imageBase64: base64, mimeType, photoUrl: photo.url }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI 분석 실패')
      setCheckResult({ photoId: photo.id, result: data })
      const gonogoEmoji = data.goNoGo === 'GO' ? '✅' : data.goNoGo === 'NO-GO' ? '❌' : '⚠️'
      toast.success(`${gonogoEmoji} ${data.detectedProcess || '공종'} — ${data.goNoGo} 판정`)
    } catch (err: any) {
      toast.error(`AI 체크 실패: ${err?.message}`)
    } finally {
      setCheckingPhotoId(null)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const fileName = `gallery/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage.from('evidence').upload(fileName, file)
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(fileName)

        const { data: newFile, error: insertError } = await supabase
          .from('files')
          .insert([{
            project_id: projectId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            timestamp: new Date().toISOString(),
            hash_sha256: '',
          }])
          .select()
          .single()

        if (insertError) throw insertError

        if (newFile) {
          setPhotos(prev => [{
            id: newFile.id,
            url: newFile.file_url,
            file_name: newFile.file_name,
            category: '',
            description: null,
            uploaded_at: newFile.created_at,
          }, ...prev])
        }
      }
    } catch (err: any) {
      toast.error(`업로드 오류: ${err?.message}`)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>사진을 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <QuickActions compact actions={[
          { icon: '📷', label: '사진 분석', description: '현장 사진 AI 분석', message: '현장 사진 분석해줘' },
          { icon: '🔄', label: '전후 비교', description: '시공 전후 비교', message: '시공 전후 비교해줘' },
        ]} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'gallery' ? styles.active : ''}`}
              onClick={() => setViewMode('gallery')}
            >
              현장사진
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'compare' ? styles.active : ''}`}
              onClick={() => setViewMode('compare')}
            >
              비교
            </button>
          </div>
          <AutoCaptureButton
            projectId={projectId}
            onResult={result => {
              toast[result.goNoGo === 'GO' ? 'success' : result.goNoGo === 'NO-GO' ? 'error' : 'warning'](
                `${result.goNoGo === 'GO' ? '✅' : result.goNoGo === 'NO-GO' ? '❌' : '⚠️'} ${result.detectedProcess} — ${result.goNoGo}`
              )
            }}
          />
          <label className={styles.uploadBtn}>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
            {uploading ? '업로드 중...' : '📷 사진 추가'}
          </label>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <span>전체 {photos.length}장</span>
        </div>

        {/* AI 체크 결과 */}
        {checkResult && (
          <div className={styles.checkResultBanner} style={{
            borderLeft: `4px solid ${checkResult.result.goNoGo === 'GO' ? 'var(--checkin-go)' : checkResult.result.goNoGo === 'NO-GO' ? 'var(--checkin-nogo)' : 'var(--checkin-warn)'}`,
          }}>
            <div className={styles.checkResultHeader}>
              <span className={styles.checkResultTitle}>
                🤖 AI 자동 체크 결과: {checkResult.result.detectedProcess || '공종'}
              </span>
              <span className={styles.checkResultBadge} style={{
                background: checkResult.result.goNoGo === 'GO' ? 'var(--checkin-go)' : checkResult.result.goNoGo === 'NO-GO' ? 'var(--checkin-nogo)' : 'var(--checkin-warn)',
              }}>
                {checkResult.result.goNoGo}
              </span>
              <button className={styles.checkResultClose} onClick={() => setCheckResult(null)}>✕</button>
            </div>
            {checkResult.result.issues?.length > 0 && (
              <ul className={styles.checkResultIssues}>
                {checkResult.result.issues.slice(0, 3).map((issue: string, i: number) => (
                  <li key={i}>⚠️ {issue}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Gallery View */}
        {viewMode === 'gallery' && (
          <>
            <PhotoGallery photos={photos} onAutoCheck={handleAutoCheck} checkingPhotoId={checkingPhotoId} />
            {/* 도면 마킹 버튼 — 사진 있을 때만 표시 */}
            {photos.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>도면 마킹:</span>
                {photos.slice(0, 6).map(photo => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setMarkingPhoto(photo)}
                    style={{
                      padding: '5px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      background: '#fff',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    🖊 {photo.file_name.length > 12 ? photo.file_name.slice(0, 12) + '…' : photo.file_name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Compare View */}
        {viewMode === 'compare' && (
          <div className={styles.compareSection}>
            <h3 className={styles.sectionTitle}>시공 전/후 비교</h3>
            {photos.length >= 2 ? (
              <>
                <div className={styles.compareSelectors}>
                  <div className={styles.compareGroup}>
                    <label>시공 전</label>
                    <select
                      value={comparePhotos.before}
                      onChange={e => setComparePhotos(prev => ({ ...prev, before: e.target.value }))}
                    >
                      <option value="">사진 선택</option>
                      {photos.map(p => (
                        <option key={p.id} value={p.url}>{p.file_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.compareGroup}>
                    <label>시공 후</label>
                    <select
                      value={comparePhotos.after}
                      onChange={e => setComparePhotos(prev => ({ ...prev, after: e.target.value }))}
                    >
                      <option value="">사진 선택</option>
                      {photos.map(p => (
                        <option key={p.id} value={p.url}>{p.file_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {comparePhotos.before && comparePhotos.after && (
                  <BeforeAfterSlider
                    beforeUrl={comparePhotos.before}
                    afterUrl={comparePhotos.after}
                  />
                )}
              </>
            ) : (
              <div className={styles.compareEmpty}>
                비교하려면 최소 2장의 사진이 필요합니다
              </div>
            )}
          </div>
        )}
      </main>

      {/* 도면 마킹 모달 */}
      {markingPhoto && (
        <DrawingCanvas
          imageUrl={markingPhoto.url}
          onSave={async (markers: Marker[]) => {
            try {
              await supabase
                .from('files')
                .update({ ai_check_result: { markers } })
                .eq('id', markingPhoto.id)
              toast.success(`마킹 ${markers.length}개 저장됐습니다.`)
            } catch {
              toast.error('마킹 저장 실패')
            }
            setMarkingPhoto(null)
          }}
          onClose={() => setMarkingPhoto(null)}
        />
      )}
    </div>
  )
}
