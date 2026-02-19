'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './OnboardingWizard.module.scss'

interface OnboardingWizardProps {
  onComplete: () => void
}

const ROLES = [
  { key: 'contractor', icon: '🔨', label: '시공업체', desc: '공사 견적·공정·증빙 관리' },
  { key: 'designer', icon: '🎨', label: '인테리어 디자이너', desc: '설계·견적·고객 소통 관리' },
  { key: 'supervisor', icon: '📋', label: '현장 소장', desc: '공정·인력·자재 현장 관리' },
  { key: 'owner', icon: '🏢', label: '건물주 / 임대인', desc: '공사 현황 모니터링' },
  { key: 'customer', icon: '🏠', label: '집주인 / 고객', desc: '공사 진행 확인 및 소통' },
]

const FEATURES = [
  { icon: '📋', title: '진단 체크리스트', desc: '13개 업종별 맞춤 체크리스트로\n리스크를 자동 계산해요' },
  { icon: '🤖', title: 'AI 체키', desc: '계약서·법규·비용을 AI가\n공감→설명→제안 톤으로 안내해요' },
  { icon: '📊', title: '자동 리포트', desc: '일일 현황을 AI가 자동으로\n리포트로 작성해드려요' },
  { icon: '📒', title: 'AI 노트북', desc: '계약서·도면·사진을 올리면\nAI가 핵심을 분석해드려요' },
]

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0: welcome, 1: role, 2: features, 3: start

  const totalSteps = 4
  const progress = ((step + 1) / totalSteps) * 100

  const handleComplete = () => {
    localStorage.setItem('onboarding_done', 'true')
    onComplete()
  }

  const handleCreateProject = () => {
    localStorage.setItem('onboarding_done', 'true')
    onComplete()
    router.push('/projects')
  }

  const handleAiChat = () => {
    localStorage.setItem('onboarding_done', 'true')
    onComplete()
    router.push('/ai-chat')
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.wizard}>
        {/* 닫기 버튼 */}
        <button className={styles.skipBtn} onClick={handleComplete}>건너뛰기</button>

        {/* 진행 바 */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* 단계 점 */}
        <div className={styles.stepDots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i <= step ? styles.dotActive : ''} ${i === step ? styles.dotCurrent : ''}`}
            />
          ))}
        </div>

        {/* Step 0: 웰컴 */}
        {step === 0 && (
          <div className={styles.stepContent}>
            <div className={styles.heroIcon}>✓</div>
            <h1 className={styles.heroTitle}>
              Check-In에<br />오신 것을 환영해요!
            </h1>
            <p className={styles.heroDesc}>
              인테리어·건설 현장 관리의 모든 것을<br />
              AI와 함께 5분 만에 시작할 수 있어요.
            </p>
            <div className={styles.featureGrid}>
              {FEATURES.map((f, i) => (
                <div key={i} className={styles.featureCard}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <div>
                    <strong>{f.title}</strong>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: 역할 선택 */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>어떤 역할로 사용하시나요?</h2>
            <p className={styles.stepDesc}>역할에 맞게 AI가 더 정확한 도움을 드릴 수 있어요</p>
            <div className={styles.roleGrid}>
              {ROLES.map(role => (
                <button
                  key={role.key}
                  type="button"
                  className={styles.roleCard}
                  onClick={() => {
                    localStorage.setItem('user_role', role.key)
                    setStep(2)
                  }}
                >
                  <span className={styles.roleIcon}>{role.icon}</span>
                  <strong className={styles.roleLabel}>{role.label}</strong>
                  <span className={styles.roleDesc}>{role.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: 핵심 기능 소개 */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>이런 기능을 제공해요</h2>
            <p className={styles.stepDesc}>Check-In의 핵심 기능을 간단히 소개해드릴게요</p>
            <div className={styles.featureList}>
              {[
                { step: '1', icon: '📁', title: '프로젝트 생성', detail: '업종 선택 → 기본 공정 10개 자동 생성 → 체크리스트 시작' },
                { step: '2', icon: '📊', title: '리스크 점수 계산', detail: '체크리스트 항목 체크 시 AI가 리스크 점수를 실시간 계산' },
                { step: '3', icon: '🤖', title: 'AI 채팅', detail: '현재 프로젝트 맥락을 AI가 기억하고 맞춤 답변 제공' },
                { step: '4', icon: '📒', title: 'AI 노트북', detail: '계약서·도면을 업로드하면 AI가 핵심 리스크 자동 분석' },
              ].map((item) => (
                <div key={item.step} className={styles.featureRow}>
                  <div className={styles.featureStepNum}>{item.step}</div>
                  <div className={styles.featureRowContent}>
                    <span className={styles.featureRowIcon}>{item.icon}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: 시작 */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <div className={styles.readyIcon}>🚀</div>
            <h2 className={styles.stepTitle}>준비 완료!</h2>
            <p className={styles.stepDesc}>
              첫 번째 프로젝트를 만들거나<br />
              AI 체키에게 먼저 질문해보세요
            </p>
            <div className={styles.startChoices}>
              <button className={styles.choiceBtn} onClick={handleCreateProject}>
                <span>📁</span>
                <div>
                  <strong>첫 프로젝트 만들기</strong>
                  <span>업종 선택 → 공정 자동 생성 → 체크리스트</span>
                </div>
              </button>
              <button className={`${styles.choiceBtn} ${styles.choiceBtnSecondary}`} onClick={handleAiChat}>
                <span>🤖</span>
                <div>
                  <strong>AI 체키에게 먼저 물어보기</strong>
                  <span>비용·법규·공정 등 무엇이든 질문하세요</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className={styles.actions}>
          {step > 0 && step < 3 && (
            <button type="button" className={styles.backBtn} onClick={() => setStep(s => s - 1)}>
              이전
            </button>
          )}
          {step < 3 && step !== 1 && (
            <button
              type="button"
              className={styles.nextBtn}
              onClick={() => setStep(s => s + 1)}
            >
              {step === 2 ? '시작하기 →' : '다음'}
            </button>
          )}
          {step === 3 && (
            <button type="button" className={styles.skipBtn} style={{ position: 'static', fontSize: '0.875rem' }} onClick={handleComplete}>
              대시보드로 돌아가기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
