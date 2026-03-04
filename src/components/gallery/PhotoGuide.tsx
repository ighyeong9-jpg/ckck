/**
 * PhotoGuide - 공정별 필수 촬영 가이드
 * 현장 담당자가 어떤 사진을 찍어야 하는지 안내
 */

'use client'

import { useState } from 'react'
import type { ConstructionStage } from '@/types/photoGallery'
import { CONSTRUCTION_STAGES } from '@/types/photoGallery'
import styles from './PhotoGuide.module.scss'

interface GuideItem {
  title: string
  required: boolean
  description: string
}

const PHOTO_GUIDES: Record<ConstructionStage, GuideItem[]> = {
  before: [
    { title: '현장 전경', required: true, description: '건물 외부 전체 모습' },
    { title: '내부 전체', required: true, description: '각 방향에서 찍은 실내 전경' },
    { title: '기존 시설 상태', required: true, description: '철거 전 시설 상태' },
    { title: '측정 사진', required: false, description: '줄자로 치수 확인' },
  ],
  demolition: [
    { title: '철거 전 상태', required: true, description: '철거할 부분 상세 촬영' },
    { title: '철거 중', required: false, description: '진행 과정' },
    { title: '철거 완료', required: true, description: '정리 완료 상태' },
    { title: '폐기물 처리', required: true, description: '폐기물 분리 및 처리 상태' },
  ],
  framework: [
    { title: '골조 설치 전', required: true, description: '벽체/천장 바탕' },
    { title: '골조 시공 중', required: false, description: '골조 작업 과정' },
    { title: '골조 완료', required: true, description: '수평/수직 확인' },
  ],
  electric: [
    { title: '배선 작업 전', required: true, description: '기존 배선 상태' },
    { title: '배선 작업', required: true, description: '새 배선 설치 과정' },
    { title: '스위치/콘센트 위치', required: true, description: '높이 및 위치 확인' },
    { title: '배선 완료', required: true, description: '정리 및 마감 전' },
  ],
  plumbing: [
    { title: '배관 작업 전', required: true, description: '기존 배관 상태' },
    { title: '배관 설치', required: true, description: '새 배관 시공' },
    { title: '수압 테스트', required: true, description: '누수 확인' },
  ],
  tile: [
    { title: '타일 시공 전', required: true, description: '바탕 처리 상태' },
    { title: '타일 본딩', required: false, description: '줄눈 작업 전' },
    { title: '타일 완료', required: true, description: '줄눈 마감 후' },
  ],
  wallpaper: [
    { title: '도배 전', required: true, description: '벽면 상태' },
    { title: '초배지', required: false, description: '초배지 작업' },
    { title: '도배 완료', required: true, description: '정배지 마감' },
  ],
  painting: [
    { title: '도장 전', required: true, description: '표면 처리 완료 상태' },
    { title: '1차 도장', required: false, description: '초벌 도장' },
    { title: '도장 완료', required: true, description: '재벌 마감' },
  ],
  flooring: [
    { title: '바닥 작업 전', required: true, description: '바탕 상태' },
    { title: '바닥재 설치', required: false, description: '시공 과정' },
    { title: '바닥 완료', required: true, description: '마감 상태' },
  ],
  fixture: [
    { title: '설치 전', required: true, description: '가구/기구 반입 전' },
    { title: '설치 완료', required: true, description: '각 항목별 설치 완료' },
  ],
  cleanup: [
    { title: '청소 전', required: true, description: '청소 전 상태' },
    { title: '청소 완료', required: true, description: '인도 준비 완료' },
  ],
  after: [
    { title: '완공 전경', required: true, description: '외부 전체' },
    { title: '완공 내부', required: true, description: '각 공간 전경' },
    { title: '세부 마감', required: false, description: '디테일 샷' },
  ],
  etc: [
    { title: '기타 사진', required: false, description: '필요한 사진' },
  ],
}

interface Props {
  selectedStage: ConstructionStage
  onStageChange: (stage: ConstructionStage) => void
  onClose: () => void
}

export default function PhotoGuide({ selectedStage, onStageChange, onClose }: Props) {
  const guide = PHOTO_GUIDES[selectedStage]
  const stageInfo = CONSTRUCTION_STAGES[selectedStage]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>📸 촬영 가이드</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {/* 공정 선택 */}
          <div className={styles.stageSelector}>
            <label className={styles.label}>공정 선택</label>
            <select
              className={styles.select}
              value={selectedStage}
              onChange={(e) => onStageChange(e.target.value as ConstructionStage)}
            >
              {Object.entries(CONSTRUCTION_STAGES)
                .sort((a, b) => a[1].order - b[1].order)
                .map(([stage, info]) => (
                  <option key={stage} value={stage}>
                    {info.icon} {info.label}
                  </option>
                ))}
            </select>
          </div>

          {/* 가이드 항목 */}
          <div className={styles.guideList}>
            <h3 className={styles.guideTitle}>
              {stageInfo.icon} {stageInfo.label} 단계
            </h3>
            {guide.map((item, idx) => (
              <div key={idx} className={styles.guideItem}>
                <div className={styles.guideHeader}>
                  <span className={styles.guideName}>
                    {item.required && <span className={styles.required}>필수</span>}
                    {item.title}
                  </span>
                </div>
                <p className={styles.guideDesc}>{item.description}</p>
              </div>
            ))}
          </div>

          {/* 팁 */}
          <div className={styles.tip}>
            <span className={styles.tipIcon}>💡</span>
            <div>
              <strong>촬영 팁</strong>
              <ul>
                <li>밝은 곳에서 흔들리지 않게 촬영하세요</li>
                <li>전체와 세부를 모두 찍어주세요</li>
                <li>날짜와 시간이 자동으로 기록됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
