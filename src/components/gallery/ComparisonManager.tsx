/**
 * ComparisonManager - 전후 비교 관리
 * 자동 자동 매칭, 변경 사항 메모, 승인 시스템
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GalleryPhoto, ComparisonPair, ConstructionStage } from '@/types/photoGallery'
import { CONSTRUCTION_STAGES } from '@/types/photoGallery'
import BeforeAfterSlider from './BeforeAfterSlider'
import { useToast } from '@/components/ui/Toast'
import styles from './ComparisonManager.module.scss'

interface Props {
  projectId: string
  photos: GalleryPhoto[]
  onClose: () => void
}

// 자동 매칭 로직
function autoMatchPairs(photos: GalleryPhoto[]): Array<{ before: GalleryPhoto; after: GalleryPhoto; stage: ConstructionStage }> {
  const pairs: Array<{ before: GalleryPhoto; after: GalleryPhoto; stage: ConstructionStage }> = []

  // 1. 시작 전 vs 완료
  const beforePhotos = photos.filter(p => p.stage === 'before')
  const afterPhotos = photos.filter(p => p.stage === 'after')

  beforePhotos.forEach((before, idx) => {
    if (afterPhotos[idx]) {
      pairs.push({ before, after: afterPhotos[idx], stage: 'before' })
    }
  })

  // 2. 각 공정별 매칭 (철거 제외)
  const stages: ConstructionStage[] = ['framework', 'electric', 'plumbing', 'tile', 'wallpaper', 'painting', 'flooring', 'fixture']

  stages.forEach(stage => {
    const stagePhotos = photos.filter(p => p.stage === stage)
    if (stagePhotos.length >= 2) {
      // 첫 번째 사진을 before, 마지막 사진을 after로
      pairs.push({
        before: stagePhotos[0],
        after: stagePhotos[stagePhotos.length - 1],
        stage
      })
    }
  })

  return pairs
}

export default function ComparisonManager({ projectId, photos, onClose }: Props) {
  const toast = useToast()
  const supabase = createClient()

  const [pairs, setPairs] = useState<ComparisonPair[]>([])
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 자동 매칭된 쌍
  const [suggestedPairs, setSuggestedPairs] = useState<Array<{ before: GalleryPhoto; after: GalleryPhoto; stage: ConstructionStage }>>([])

  useEffect(() => {
    loadPairs()
    // 자동 매칭
    const matched = autoMatchPairs(photos)
    setSuggestedPairs(matched)
  }, [projectId, photos])

  const loadPairs = async () => {
    try {
      const { data, error } = await supabase
        .from('comparison_pairs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // 사진 정보 추가
      if (data) {
        const pairsWithPhotos = data.map(pair => ({
          ...pair,
          before_photo: photos.find(p => p.id === pair.before_photo_id),
          after_photo: photos.find(p => p.id === pair.after_photo_id),
        }))
        setPairs(pairsWithPhotos)
      }
    } catch (err) {
      console.error('Error loading pairs:', err)
    } finally {
      setLoading(false)
    }
  }

  const createPairFromSuggestion = async (suggestion: typeof suggestedPairs[0]) => {
    setSaving(true)
    try {
      const stageInfo = CONSTRUCTION_STAGES[suggestion.stage]
      const title = `${stageInfo.label} 작업`

      const { data, error } = await supabase
        .from('comparison_pairs')
        .insert([{
          project_id: projectId,
          before_photo_id: suggestion.before.id,
          after_photo_id: suggestion.after.id,
          title,
        }])
        .select()
        .single()

      if (error) throw error

      setPairs(prev => [{
        ...data,
        before_photo: suggestion.before,
        after_photo: suggestion.after,
      }, ...prev])

      // 추천 목록에서 제거
      setSuggestedPairs(prev => prev.filter(s => s !== suggestion))

      toast.success(`${title} 공사 전후가 등록되었습니다`)
    } catch (err: any) {
      toast.error(`생성 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const updatePairNote = async (pairId: string, note: string) => {
    try {
      const { error } = await supabase
        .from('comparison_pairs')
        .update({ change_note: note, updated_at: new Date().toISOString() })
        .eq('id', pairId)

      if (error) throw error

      setPairs(prev => prev.map(p => p.id === pairId ? { ...p, change_note: note } : p))
      toast.success('변경 사항이 저장되었습니다')
    } catch (err: any) {
      toast.error(`저장 실패: ${err.message}`)
    }
  }

  const approvePair = async (pairId: string, role: 'client' | 'contractor' | 'supervisor') => {
    try {
      const now = new Date().toISOString()
      const updates: any = {}

      if (role === 'client') {
        updates.client_approved = true
        updates.client_approved_at = now
      } else if (role === 'contractor') {
        updates.contractor_approved = true
        updates.contractor_approved_at = now
      } else {
        updates.supervisor_approved = true
        updates.supervisor_approved_at = now
      }

      const { error } = await supabase
        .from('comparison_pairs')
        .update({ ...updates, updated_at: now })
        .eq('id', pairId)

      if (error) throw error

      setPairs(prev => prev.map(p => p.id === pairId ? { ...p, ...updates } : p))

      const roleLabel = { client: '고객', contractor: '업체', supervisor: '책임자' }[role]
      toast.success(`${roleLabel} 승인이 완료되었습니다`)
    } catch (err: any) {
      toast.error(`승인 실패: ${err.message}`)
    }
  }

  const selectedPair = pairs.find(p => p.id === selectedPairId)

  if (loading) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.loading}>로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>🔄 공사 전후 비교 관리</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {/* 추천 비교 항목 */}
          {suggestedPairs.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>✨ 추천 비교 (자동 매칭)</h3>
              <div className={styles.suggestions}>
                {suggestedPairs.map((suggestion, idx) => {
                  const stageInfo = CONSTRUCTION_STAGES[suggestion.stage]
                  return (
                    <div key={idx} className={styles.suggestionCard}>
                      <div className={styles.suggestionPhotos}>
                        <div className={styles.miniPhoto}>
                          <img src={suggestion.before.url} alt="공사 전" />
                          <span className={styles.miniLabel}>공사 전</span>
                        </div>
                        <span className={styles.arrow}>→</span>
                        <div className={styles.miniPhoto}>
                          <img src={suggestion.after.url} alt="공사 후" />
                          <span className={styles.miniLabel}>공사 후</span>
                        </div>
                      </div>
                      <div className={styles.suggestionInfo}>
                        <span className={styles.suggestionTitle}>
                          {stageInfo.icon} {stageInfo.label} 작업
                        </span>
                        <button
                          className={styles.addBtn}
                          onClick={() => createPairFromSuggestion(suggestion)}
                          disabled={saving}
                        >
                          + 공사 전후 등록
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 생성된 비교 항목 목록 */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📋 등록된 비교 ({pairs.length}개)</h3>
            {pairs.length === 0 ? (
              <div className={styles.empty}>
                아직 등록된 비교가 없습니다.<br />
                위의 추천 비교를 생성해보세요.
              </div>
            ) : (
              <div className={styles.pairsList}>
                {pairs.map(pair => (
                  <div
                    key={pair.id}
                    className={`${styles.pairCard} ${selectedPairId === pair.id ? styles.selected : ''}`}
                    onClick={() => setSelectedPairId(pair.id)}
                  >
                    <div className={styles.pairHeader}>
                      <h4>{pair.title}</h4>
                      <div className={styles.approvals}>
                        {pair.client_approved && <span className={styles.approved}>✅ 고객</span>}
                        {pair.contractor_approved && <span className={styles.approved}>✅ 업체</span>}
                        {pair.supervisor_approved && <span className={styles.approved}>✅ 책임자</span>}
                      </div>
                    </div>
                    {pair.change_note && (
                      <p className={styles.pairNote}>📝 {pair.change_note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 선택된 쌍 상세 */}
          {selectedPair && selectedPair.before_photo && selectedPair.after_photo && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>🔍 상세 비교</h3>

              {/* 슬라이더 */}
              <BeforeAfterSlider
                beforeUrl={selectedPair.before_photo.url}
                afterUrl={selectedPair.after_photo.url}
              />

              {/* 변경 사항 메모 */}
              <div className={styles.noteSection}>
                <label className={styles.noteLabel}>📝 변경 사항 메모</label>
                <textarea
                  className={styles.noteInput}
                  placeholder="예: 고객 요청으로 벽지 → 페인트 변경 합의 (2024.03.04)&#10;추가 비용: 50만원"
                  defaultValue={selectedPair.change_note || ''}
                  onBlur={(e) => updatePairNote(selectedPair.id, e.target.value)}
                  rows={3}
                />
              </div>

              {/* 승인 버튼 */}
              <div className={styles.approvalSection}>
                <h4 className={styles.approvalTitle}>✅ 승인 확인</h4>
                <div className={styles.approvalButtons}>
                  <button
                    className={`${styles.approvalBtn} ${selectedPair.client_approved ? styles.approved : ''}`}
                    onClick={() => !selectedPair.client_approved && approvePair(selectedPair.id, 'client')}
                    disabled={selectedPair.client_approved}
                  >
                    {selectedPair.client_approved ? '✅ 고객 승인 완료' : '고객 승인'}
                  </button>
                  <button
                    className={`${styles.approvalBtn} ${selectedPair.contractor_approved ? styles.approved : ''}`}
                    onClick={() => !selectedPair.contractor_approved && approvePair(selectedPair.id, 'contractor')}
                    disabled={selectedPair.contractor_approved}
                  >
                    {selectedPair.contractor_approved ? '✅ 업체 승인 완료' : '업체 승인'}
                  </button>
                  <button
                    className={`${styles.approvalBtn} ${selectedPair.supervisor_approved ? styles.approved : ''}`}
                    onClick={() => !selectedPair.supervisor_approved && approvePair(selectedPair.id, 'supervisor')}
                    disabled={selectedPair.supervisor_approved}
                  >
                    {selectedPair.supervisor_approved ? '✅ 책임자 승인 완료' : '책임자 승인'}
                  </button>
                </div>
                {selectedPair.client_approved_at && (
                  <p className={styles.approvalTime}>
                    고객 승인: {new Date(selectedPair.client_approved_at).toLocaleString('ko-KR')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
