'use client'

import { useState } from 'react'
import type { GalleryPhoto, DateGroup } from '@/types/photoGallery'
import styles from './PhotoGallery.module.scss'

interface Props {
  photos: GalleryPhoto[]
  onAutoCheck?: (photo: GalleryPhoto) => void
  checkingPhotoId?: string | null
}

export default function PhotoGallery({ photos, onAutoCheck, checkingPhotoId }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Group by date
  const dateGroups: DateGroup[] = photos.reduce((groups: DateGroup[], photo) => {
    const date = new Date(photo.uploaded_at).toLocaleDateString('ko-KR')
    const existing = groups.find(g => g.date === date)
    if (existing) {
      existing.photos.push(photo)
    } else {
      groups.push({ date, photos: [photo] })
    }
    return groups
  }, [])

  const allPhotos = dateGroups.flatMap(g => g.photos)

  const handlePrev = () => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : allPhotos.length - 1)
  }

  const handleNext = () => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex < allPhotos.length - 1 ? selectedIndex + 1 : 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev()
    if (e.key === 'ArrowRight') handleNext()
    if (e.key === 'Escape') setSelectedIndex(null)
  }

  if (photos.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🖼️</span>
        <p>아직 사진이 없습니다</p>
      </div>
    )
  }

  return (
    <div className={styles.gallery}>
      {dateGroups.map(group => (
        <div key={group.date} className={styles.dateGroup}>
          <h3 className={styles.dateLabel}>{group.date}</h3>
          <div className={styles.photoGrid}>
            {group.photos.map(photo => {
              const globalIndex = allPhotos.indexOf(photo)
              return (
                <div
                  key={photo.id}
                  className={styles.photoItem}
                  onClick={() => setSelectedIndex(globalIndex)}
                >
                  <img src={photo.url} alt={photo.file_name} loading="lazy" />
                  {photo.category && (
                    <span className={styles.photoCategory}>{photo.category}</span>
                  )}
                  {onAutoCheck && (
                    <button
                      className={`${styles.aiCheckBtn} ${checkingPhotoId === photo.id ? styles.checking : ''}`}
                      onClick={e => { e.stopPropagation(); onAutoCheck(photo) }}
                      disabled={checkingPhotoId === photo.id}
                      title="AI 자동 체크"
                    >
                      {checkingPhotoId === photo.id ? '분석 중...' : '🤖 AI 체크'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Lightbox */}
      {selectedIndex !== null && allPhotos[selectedIndex] && (
        <div
          className={styles.lightbox}
          onClick={() => setSelectedIndex(null)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setSelectedIndex(null)}>✕</button>
            <button className={styles.lightboxPrev} onClick={handlePrev}>‹</button>
            <img
              src={allPhotos[selectedIndex].url}
              alt={allPhotos[selectedIndex].file_name}
              className={styles.lightboxImg}
            />
            <button className={styles.lightboxNext} onClick={handleNext}>›</button>
            <div className={styles.lightboxInfo}>
              <span>{allPhotos[selectedIndex].file_name}</span>
              <span>{selectedIndex + 1} / {allPhotos.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
