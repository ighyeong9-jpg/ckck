'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PhotoGallery from '@/components/gallery/PhotoGallery'
import BeforeAfterSlider from '@/components/gallery/BeforeAfterSlider'
import type { GalleryPhoto } from '@/types/photoGallery'
import QuickActions from '@/components/ui/QuickActions'
import styles from './page.module.scss'

export default function GalleryPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState<'gallery' | 'compare'>('gallery')
  const [comparePhotos, setComparePhotos] = useState<{ before: string; after: string }>({ before: '', after: '' })

  useEffect(() => {
    loadPhotos()
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
      alert(`업로드 오류: ${err?.message}`)
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

        {/* Gallery View */}
        {viewMode === 'gallery' && (
          <PhotoGallery photos={photos} />
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
    </div>
  )
}
