'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.scss'

interface Photo {
  id: string
  file_name: string
  storage_path: string
  created_at: string
  category: string | null
}

export default function ClientPhotosPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  useEffect(() => {
    loadPhotos()
  }, [projectId])

  const loadPhotos = async () => {
    try {
      const { data } = await supabase
        .from('evidence_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (data) setPhotos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from('evidence').getPublicUrl(path)
    return data?.publicUrl || ''
  }

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          ← 뒤로
        </button>
        <h1 className={styles.title}>현장 사진</h1>
      </header>

      <div className={styles.photoGrid}>
        {photos.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📷</div>
            <p>아직 업로드된 사진이 없습니다</p>
          </div>
        ) : (
          photos.map((photo) => (
            <div
              key={photo.id}
              className={styles.photoCard}
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={getPhotoUrl(photo.storage_path)}
                alt={photo.file_name}
                className={styles.photoImg}
              />
              <div className={styles.photoInfo}>
                <span className={styles.photoDate}>
                  {new Date(photo.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedPhoto && (
        <div className={styles.modal} onClick={() => setSelectedPhoto(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedPhoto(null)}>
              ✕
            </button>
            <img
              src={getPhotoUrl(selectedPhoto.storage_path)}
              alt={selectedPhoto.file_name}
              className={styles.modalImg}
            />
            <div className={styles.modalInfo}>
              <p className={styles.modalFileName}>{selectedPhoto.file_name}</p>
              <p className={styles.modalDate}>
                {new Date(selectedPhoto.created_at).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
