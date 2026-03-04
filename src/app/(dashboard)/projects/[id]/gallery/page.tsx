'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PhotoGallery from '@/components/gallery/PhotoGallery'
import TimelineView from '@/components/gallery/TimelineView'
import BeforeAfterSlider from '@/components/gallery/BeforeAfterSlider'
import PhotoGuide from '@/components/gallery/PhotoGuide'
import type { GalleryPhoto, ConstructionStage } from '@/types/photoGallery'
import { CONSTRUCTION_STAGES } from '@/types/photoGallery'
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
  const [viewMode, setViewMode] = useState<'timeline' | 'gallery' | 'compare'>('timeline')
  const [comparePhotos, setComparePhotos] = useState<{ before: string; after: string }>({ before: '', after: '' })
  const [checkingPhotoId, setCheckingPhotoId] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<{ photoId: string; result: any } | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [selectedStage, setSelectedStage] = useState<ConstructionStage>('before')
  const [showStageModal, setShowStageModal] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  useEffect(() => {
    loadPhotos()
  }, [projectId])

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('evidence_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const galleryPhotos: GalleryPhoto[] = data
          .filter(f => f.file_type?.startsWith('image/'))
          .map(f => {
            // storage_path에서 public URL 생성
            const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(f.storage_path)
            return {
              id: f.id,
              url: urlData.publicUrl,
              file_name: f.file_name || 'photo',
              stage: (f.category as ConstructionStage) || 'etc',
              description: f.description || null,
              uploaded_at: f.created_at,
              hash_sha256: f.sha256_hash || undefined,
            }
          })
        setPhotos(galleryPhotos)
      }
    } catch (err) {
      console.error('Error loading photos:', err)
    } finally {
      setLoading(false)
    }
  }

  // SHA-256 해시 생성
  const generateSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
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
      const gonogoEmoji = data.goNoGo === 'GO' ? '✅' : data.goNoGo === '위험 확인' ? '❌' : '⚠️'
      toast.success(`${gonogoEmoji} ${data.detectedProcess || '공종'} — ${data.goNoGo} 현황`)
    } catch (err: any) {
      toast.error(`AI 확인 실패: ${err?.message}`)
    } finally {
      setCheckingPhotoId(null)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setPendingFiles(Array.from(files))
    setShowStageModal(true)
  }

  const handleStageSelect = async (stage: ConstructionStage) => {
    setShowStageModal(false)
    if (pendingFiles.length === 0) return

    setUploading(true)
    try {
      for (const file of pendingFiles) {
        // SHA-256 해시 생성
        const hash = await generateSHA256(file)

        // 파일명 생성 (중복 방지)
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const storagePath = `${projectId}/${timestamp}_${safeName}`

        // Supabase Storage에 업로드
        const { error: uploadError } = await supabase.storage.from('evidence').upload(storagePath, file)
        if (uploadError) throw uploadError

        // DB에 메타데이터 저장
        const { data: newFile, error: insertError } = await supabase
          .from('evidence_files')
          .insert([{
            project_id: projectId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: storagePath,
            sha256_hash: hash,
            category: stage,
          }])
          .select()
          .single()

        if (insertError) throw insertError

        // URL 생성하여 상태 업데이트
        if (newFile) {
          const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(storagePath)
          setPhotos(prev => [{
            id: newFile.id,
            url: urlData.publicUrl,
            file_name: newFile.file_name,
            stage: stage,
            description: null,
            uploaded_at: newFile.created_at,
            hash_sha256: hash,
          }, ...prev])
        }
      }
      toast.success(`${CONSTRUCTION_STAGES[stage].icon} ${CONSTRUCTION_STAGES[stage].label} 사진 ${pendingFiles.length}장이 저장되었습니다`)
    } catch (err: any) {
      toast.error(`업로드 오류: ${err?.message}`)
    } finally {
      setUploading(false)
      setPendingFiles([])
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
              className={`${styles.viewBtn} ${viewMode === 'timeline' ? styles.active : ''}`}
              onClick={() => setViewMode('timeline')}
            >
              📅 공정별
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'gallery' ? styles.active : ''}`}
              onClick={() => setViewMode('gallery')}
            >
              🖼️ 모아보기
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'compare' ? styles.active : ''}`}
              onClick={() => setViewMode('compare')}
            >
              🔄 전후비교
            </button>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.guideBtn}
              onClick={() => setShowGuide(true)}
            >
              📖 촬영 가이드
            </button>
            <label className={styles.uploadBtn}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              {uploading ? '업로드 중...' : '📷 사진 추가'}
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <span>전체 {photos.length}장</span>
          {photos.filter(p => p.hash_sha256).length > 0 && (
            <span className={styles.verifiedCount}>
              🔒 안전 보관 {photos.filter(p => p.hash_sha256).length}장
            </span>
          )}
        </div>

        {/* AI 체크 결과 */}
        {checkResult && (
          <div className={styles.checkResultBanner} style={{
            borderLeft: `4px solid ${checkResult.result.goNoGo === 'GO' ? 'var(--checkin-go)' : checkResult.result.goNoGo === '위험 확인' ? 'var(--checkin-nogo)' : 'var(--checkin-warn)'}`,
          }}>
            <div className={styles.checkResultHeader}>
              <span className={styles.checkResultTitle}>
                🤖 AI 자동 확인: {checkResult.result.detectedProcess || '공종'}
              </span>
              <span className={styles.checkResultBadge} style={{
                background: checkResult.result.goNoGo === 'GO' ? 'var(--checkin-go)' : checkResult.result.goNoGo === '위험 확인' ? 'var(--checkin-nogo)' : 'var(--checkin-warn)',
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

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <TimelineView
            photos={photos}
            onPhotoClick={() => {}}
            onAutoCheck={handleAutoCheck}
            checkingPhotoId={checkingPhotoId}
          />
        )}

        {/* Gallery View */}
        {viewMode === 'gallery' && (
          <PhotoGallery photos={photos} onAutoCheck={handleAutoCheck} checkingPhotoId={checkingPhotoId} />
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

      {/* 촬영 가이드 모달 */}
      {showGuide && (
        <PhotoGuide
          selectedStage={selectedStage}
          onStageChange={setSelectedStage}
          onClose={() => setShowGuide(false)}
        />
      )}

      {/* 공정 선택 모달 */}
      {showStageModal && (
        <div className={styles.overlay} onClick={() => setShowStageModal(false)}>
          <div className={styles.stageModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>어느 공정 사진인가요?</h3>
            <p className={styles.modalDesc}>{pendingFiles.length}장의 사진을 추가합니다</p>
            <div className={styles.stageGrid}>
              {Object.entries(CONSTRUCTION_STAGES)
                .sort((a, b) => a[1].order - b[1].order)
                .map(([stage, info]) => (
                  <button
                    key={stage}
                    className={styles.stageOption}
                    onClick={() => handleStageSelect(stage as ConstructionStage)}
                  >
                    <span className={styles.stageIcon}>{info.icon}</span>
                    <span className={styles.stageLabel}>{info.label}</span>
                  </button>
                ))}
            </div>
            <button className={styles.cancelBtn} onClick={() => {
              setShowStageModal(false)
              setPendingFiles([])
            }}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
