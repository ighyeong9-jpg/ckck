'use client'

import { useState } from 'react'
import styles from './QuickStart.module.scss'

interface QuickStartProps {
  onComplete: (data: {
    industry: string
    area: string
    budget: string
    projectName: string
    clientName: string
  }) => void
  onClose: () => void
}

const INDUSTRIES = [
  { key: 'cafe', icon: '☕', label: '카페' },
  { key: 'restaurant', icon: '🍽️', label: '음식점' },
  { key: 'bar', icon: '🍺', label: '술집/바' },
  { key: 'bakery', icon: '🥐', label: '베이커리' },
  { key: 'beauty', icon: '💇', label: '미용실' },
  { key: 'clinic', icon: '🏥', label: '병원/의원' },
  { key: 'fitness', icon: '💪', label: '헬스장' },
  { key: 'retail', icon: '🛒', label: '소매점' },
  { key: 'office', icon: '🏢', label: '사무실' },
  { key: 'academy', icon: '📚', label: '학원' },
  { key: 'apartment', icon: '🏠', label: '아파트' },
  { key: 'villa', icon: '🏡', label: '빌라' },
  { key: 'house', icon: '🏘️', label: '단독주택' },
]

export default function QuickStart({ onComplete, onClose }: QuickStartProps) {
  const [step, setStep] = useState(1)
  const [industry, setIndustry] = useState('')
  const [area, setArea] = useState('')
  const [budget, setBudget] = useState('')
  const [projectName, setProjectName] = useState('')
  const [clientName, setClientName] = useState('')

  const handleNext = () => {
    if (step === 1 && industry) setStep(2)
    else if (step === 2 && area) setStep(3)
    else if (step === 3 && projectName && clientName) {
      onComplete({ industry, area, budget, projectName, clientName })
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const selectedIndustry = INDUSTRIES.find(i => i.key === industry)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${(step / 3) * 100}%` }} />
        </div>
        <div className={styles.stepIndicator}>
          {[1, 2, 3].map(s => (
            <div key={s} className={`${styles.stepDot} ${s <= step ? styles.active : ''} ${s === step ? styles.current : ''}`}>
              {s < step ? '✓' : s}
            </div>
          ))}
        </div>

        {/* Step 1: Industry Selection */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <h2>어떤 공간을 시공하시나요?</h2>
              <p>업종을 선택하면 맞춤 체크리스트와 견적이 자동 생성됩니다</p>
            </div>
            <div className={styles.industryGrid}>
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.key}
                  type="button"
                  className={`${styles.industryCard} ${industry === ind.key ? styles.selected : ''}`}
                  onClick={() => setIndustry(ind.key)}
                >
                  <span className={styles.industryIcon}>{ind.icon}</span>
                  <span className={styles.industryLabel}>{ind.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Area & Budget */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <h2>기본 정보를 입력해주세요</h2>
              <p>{selectedIndustry?.icon} {selectedIndustry?.label} 프로젝트의 규모를 알려주세요</p>
            </div>
            <div className={styles.formFields}>
              <div className={styles.formGroup}>
                <label>시공 면적 (평)</label>
                <input
                  type="number"
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  placeholder="예: 30"
                  min="1"
                />
                <span className={styles.fieldHint}>평 단위로 입력해주세요</span>
              </div>
              <div className={styles.formGroup}>
                <label>예상 예산 (만원)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  placeholder="예: 5000"
                  min="0"
                />
                <span className={styles.fieldHint}>대략적인 예산이면 충분합니다</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Project & Client Name */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <h2>마지막 단계입니다!</h2>
              <p>프로젝트 이름과 고객 정보를 입력해주세요</p>
            </div>
            <div className={styles.formFields}>
              <div className={styles.formGroup}>
                <label>프로젝트명</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder={`예: ${selectedIndustry?.label || ''} ${area ? area + '평' : ''} 인테리어`}
                />
              </div>
              <div className={styles.formGroup}>
                <label>고객명</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="예: 홍길동"
                />
              </div>
            </div>

            {/* Summary Preview */}
            <div className={styles.summary}>
              <h4>프로젝트 요약</h4>
              <div className={styles.summaryGrid}>
                <span>업종</span><strong>{selectedIndustry?.icon} {selectedIndustry?.label}</strong>
                <span>면적</span><strong>{area}평</strong>
                {budget && <><span>예산</span><strong>{Number(budget).toLocaleString()}만원</strong></>}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {step > 1 && (
            <button type="button" className={styles.backBtn} onClick={handleBack}>
              이전
            </button>
          )}
          <button
            type="button"
            className={styles.nextBtn}
            onClick={handleNext}
            disabled={
              (step === 1 && !industry) ||
              (step === 2 && !area) ||
              (step === 3 && (!projectName || !clientName))
            }
          >
            {step === 3 ? 'AI로 프로젝트 생성' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
