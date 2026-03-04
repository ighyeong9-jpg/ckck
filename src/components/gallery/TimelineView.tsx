/**
 * TimelineView - 공사 과정 타임라인 뷰
 * 공정별로 사진을 그룹화하여 시간 순서대로 표시
 */

'use client'

import { useState } from 'react'
import type { GalleryPhoto, StageGroup, ConstructionStage } from '@/types/photoGallery'
import { CONSTRUCTION_STAGES } from '@/types/photoGallery'
import styles from './TimelineView.module.scss'

interface Props {
  photos: GalleryPhoto[]
  onPhotoClick?: (photo: GalleryPhoto) => void
  onAutoCheck?: (photo: GalleryPhoto) => void
  checkingPhotoId?: string | null
}

export default function TimelineView({ photos, onPhotoClick, onAutoCheck, checkingPhotoId }: Props) {
  const [expandedStages, setExpandedStages] = useState<Set<ConstructionStage>>(new Set(['before', 'after']))

  // 공정별 그룹화
  const stageGroups: StageGroup[] = Object.entries(CONSTRUCTION_STAGES)
    .map(([stage, info]) => {
      const stagePhotos = photos.filter(p => p.stage === stage)
      return {
        stage: stage as ConstructionStage,
        label: info.label,
        icon: info.icon,
        order: info.order,
        photos: stagePhotos,
      }
    })
    .filter(g => g.photos.length > 0)
    .sort((a, b) => a.order - b.order)

  const toggleStage = (stage: ConstructionStage) => {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(stage)) {
        next.delete(stage)
      } else {
        next.add(stage)
      }
      return next
    })
  }

  if (photos.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📸</span>
        <p>아직 공사 사진이 없습니다</p>
        <p className={styles.emptyHint}>사진을 추가하고 공정을 선택해주세요</p>
      </div>
    )
  }

  return (
    <div className={styles.timeline}>
      {/* 진행 바 */}
      <div className={styles.progressBar}>
        {stageGroups.map((group, idx) => (
          <div
            key={group.stage}
            className={styles.progressStep}
            style={{ flex: 1 }}
          >
            <div className={styles.progressDot} />
            {idx < stageGroups.length - 1 && <div className={styles.progressLine} />}
          </div>
        ))}
      </div>

      {/* 공정별 카드 */}
      {stageGroups.map((group) => {
        const isExpanded = expandedStages.has(group.stage)
        const firstPhoto = group.photos[0]
        const uploadDate = new Date(firstPhoto.uploaded_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        return (
          <div key={group.stage} className={styles.stageCard}>
            {/* 헤더 */}
            <button
              className={styles.stageHeader}
              onClick={() => toggleStage(group.stage)}
            >
              <div className={styles.stageIcon}>{group.icon}</div>
              <div className={styles.stageInfo}>
                <h3 className={styles.stageTitle}>{group.label}</h3>
                <p className={styles.stageDate}>
                  {uploadDate} · {group.photos.length}장
                </p>
              </div>
              <span className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}>
                ▼
              </span>
            </button>

            {/* 사진 그리드 */}
            {isExpanded && (
              <div className={styles.stageContent}>
                <div className={styles.photoGrid}>
                  {group.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className={styles.photoItem}
                      onClick={() => onPhotoClick?.(photo)}
                    >
                      <img src={photo.url} alt={photo.file_name} loading="lazy" />
                      <div className={styles.photoOverlay}>
                        <span className={styles.photoTime}>
                          {new Date(photo.uploaded_at).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {onAutoCheck && (
                          <button
                            className={`${styles.aiCheckBtn} ${checkingPhotoId === photo.id ? styles.checking : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onAutoCheck(photo)
                            }}
                            disabled={checkingPhotoId === photo.id}
                          >
                            {checkingPhotoId === photo.id ? '확인중...' : '🤖'}
                          </button>
                        )}
                      </div>
                      {photo.hash_sha256 && (
                        <div className={styles.verifiedBadge} title="안전하게 보관됨">
                          🔒
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
