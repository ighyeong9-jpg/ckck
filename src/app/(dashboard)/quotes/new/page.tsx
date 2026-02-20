'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  SpaceType,
  MaterialGradeOption,
  ScheduleOption,
  ChatStep,
  BudgetChatState,
  BudgetGuideResult,
  MATERIAL_GRADES,
  SCHEDULE_OPTIONS,
} from '@/lib/ai/quote-chat'
import QuoteSpaceSelector from '@/components/quotes/QuoteSpaceSelector'
import QuoteBudgetResult from '@/components/quotes/QuoteBudgetResult'
import QuoteEducation from '@/components/quotes/QuoteEducation'
import QuotePaymentTerms from '@/components/quotes/QuotePaymentTerms'
import styles from './page.module.scss'

const INITIAL_STATE: BudgetChatState = {
  step: 'select_space',
  spaceType: null,
  areaPyeong: null,
  grade: null,
  schedule: null,
}

const STEP_LABELS: Record<ChatStep, string> = {
  select_space: '공간 선택',
  input_area: '면적 입력',
  select_grade: '자재 등급',
  select_schedule: '공사 일정',
  generating: 'AI 계산 중',
  result: '결과',
}

const STEP_ORDER: ChatStep[] = ['select_space', 'input_area', 'select_grade', 'select_schedule', 'generating', 'result']

export default function QuoteNewPage() {
  const router = useRouter()
  const [state, setState] = useState<BudgetChatState>(INITIAL_STATE)
  const [areaInput, setAreaInput] = useState('')
  const [result, setResult] = useState<BudgetGuideResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'guide' | 'education' | 'payment'>('guide')

  const currentStepIndex = STEP_ORDER.indexOf(state.step)

  const handleSelectSpace = useCallback((space: SpaceType) => {
    setState(prev => ({ ...prev, spaceType: space, step: 'input_area' }))
  }, [])

  const handleAreaSubmit = useCallback(() => {
    const n = parseFloat(areaInput)
    if (!n || n < 1 || n > 10000) {
      setError('1~10,000평 사이로 입력해주세요.')
      return
    }
    setError(null)
    setState(prev => ({ ...prev, areaPyeong: n, step: 'select_grade' }))
  }, [areaInput])

  const handleSelectGrade = useCallback((grade: MaterialGradeOption) => {
    setState(prev => ({ ...prev, grade, step: 'select_schedule' }))
  }, [])

  const handleSelectSchedule = useCallback(async (schedule: ScheduleOption) => {
    const nextState = { ...state, schedule, step: 'generating' as ChatStep }
    setState(nextState)
    setError(null)

    try {
      const res = await fetch('/api/ai/budget-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceTypeId: nextState.spaceType!.id,
          areaPyeong: nextState.areaPyeong,
          gradeId: nextState.grade!.id,
          scheduleId: schedule.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'AI 예산 가이드 생성 실패')
      }

      const data: BudgetGuideResult = await res.json()
      setResult(data)
      setState(prev => ({ ...prev, schedule, step: 'result' }))
    } catch (err: any) {
      setError(err.message)
      setState(prev => ({ ...prev, step: 'select_schedule' }))
    }
  }, [state])

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE)
    setResult(null)
    setAreaInput('')
    setError(null)
    setActiveTab('guide')
  }, [])

  const handleBack = useCallback(() => {
    if (currentStepIndex <= 0) {
      router.push('/quotes')
      return
    }
    setState(prev => ({ ...prev, step: STEP_ORDER[currentStepIndex - 1] }))
  }, [currentStepIndex, router])

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack}>← 뒤로</button>
        <div>
          <h1 className={styles.title}>AI 예산 가이드</h1>
          <p className={styles.subtitle}>30초 만에 인테리어 예산 감을 잡아보세요</p>
        </div>
      </div>

      {/* 진행 단계 */}
      {state.step !== 'result' && (
        <div className={styles.stepBar}>
          {STEP_ORDER.filter(s => s !== 'generating' && s !== 'result').map((step, i) => (
            <div
              key={step}
              className={`${styles.stepItem} ${i < currentStepIndex ? styles.stepDone : ''} ${state.step === step ? styles.stepActive : ''}`}
            >
              <div className={styles.stepDot}>{i + 1}</div>
              <span className={styles.stepLabel}>{STEP_LABELS[step]}</span>
            </div>
          ))}
        </div>
      )}

      {/* 본문 */}
      <div className={styles.content}>
        {/* 공간 선택 */}
        {state.step === 'select_space' && (
          <QuoteSpaceSelector onSelect={handleSelectSpace} />
        )}

        {/* 면적 입력 */}
        {state.step === 'input_area' && (
          <div className={styles.inputStep}>
            <div className={styles.selectedInfo}>
              <span>{state.spaceType?.emoji} {state.spaceType?.label}</span>
            </div>
            <p className={styles.stepQuestion}>몇 평인가요?</p>
            <p className={styles.stepHint}>공급면적 기준, 모르시면 대략적인 평수도 OK</p>
            <div className={styles.areaInputRow}>
              <input
                type="number"
                className={styles.areaInput}
                placeholder="예: 30"
                value={areaInput}
                onChange={e => setAreaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAreaSubmit()}
                autoFocus
                min={1}
                max={10000}
              />
              <span className={styles.areaUnit}>평</span>
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <button className={styles.nextBtn} onClick={handleAreaSubmit}>
              다음 →
            </button>
          </div>
        )}

        {/* 자재 등급 */}
        {state.step === 'select_grade' && (
          <div className={styles.gradeStep}>
            <p className={styles.stepQuestion}>자재 등급을 선택해주세요</p>
            <p className={styles.stepHint}>등급은 나중에도 비교할 수 있어요</p>
            <div className={styles.gradeGrid}>
              {MATERIAL_GRADES.map(grade => (
                <button
                  key={grade.id}
                  className={styles.gradeCard}
                  onClick={() => handleSelectGrade(grade)}
                >
                  <span className={styles.gradeEmoji}>{grade.emoji}</span>
                  <span className={styles.gradeLabel}>{grade.label}</span>
                  <span className={styles.gradeDesc}>{grade.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 일정 선택 */}
        {state.step === 'select_schedule' && (
          <div className={styles.scheduleStep}>
            <p className={styles.stepQuestion}>공사 일정이 어떻게 되나요?</p>
            <p className={styles.stepHint}>촉박할수록 비용이 올라갈 수 있어요</p>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <div className={styles.scheduleList}>
              {SCHEDULE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={styles.scheduleCard}
                  onClick={() => handleSelectSchedule(opt)}
                >
                  <span className={styles.scheduleEmoji}>{opt.emoji}</span>
                  <div className={styles.scheduleInfo}>
                    <span className={styles.scheduleLabel}>{opt.label}</span>
                    <span className={styles.scheduleDesc}>{opt.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI 계산 중 */}
        {state.step === 'generating' && (
          <div className={styles.generating}>
            <div className={styles.spinner} />
            <p className={styles.generatingText}>AI가 예산을 분석하고 있어요...</p>
            <p className={styles.generatingHint}>공간 유형, 자재 등급, 일정을 종합 분석 중</p>
          </div>
        )}

        {/* 결과 */}
        {state.step === 'result' && result && (
          <div className={styles.resultContainer}>
            {/* 탭 */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'guide' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('guide')}
              >
                예산 가이드
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'education' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('education')}
              >
                비용 알기
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'payment' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('payment')}
              >
                대금 조건
              </button>
            </div>

            {activeTab === 'guide' && (
              <QuoteBudgetResult result={result} onReset={handleReset} />
            )}
            {activeTab === 'education' && (
              <QuoteEducation />
            )}
            {activeTab === 'payment' && (
              <QuotePaymentTerms />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
