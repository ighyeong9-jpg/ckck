'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './OnboardingWizard.module.scss'

interface OnboardingWizardProps {
  onComplete: () => void
}

// ─── 역할 정의 ────────────────────────────────────────────

const ROLES = [
  { key: 'customer',      icon: '🏠', label: '집주인 · 세입자',      desc: '내 공사, 기록 관리 없이 끝내기' },
  { key: 'designer',      icon: '✏️', label: '인테리어 디자이너',    desc: '시공사 귀책 시공 기록 자동 확보' },
  { key: 'contractor',    icon: '🔨', label: '시공사 · 작업자',      desc: '말 바꾸는 고객 대응 자동화' },
  { key: 'supervisor',    icon: '📋', label: '감리자 · 현장소장',    desc: '법령 근거 첨부 체크리스트' },
  { key: 'subcontractor', icon: '👷', label: '하도급 업체',          desc: '임금 체불 대응, 직불 청구' },
  { key: 'self',          icon: '🛠️', label: '셀프인테리어',         desc: '전문가 없이도 안전하게' },
]

// ─── 업종 목록 ────────────────────────────────────────────

const INDUSTRIES = [
  { key: 'apartment', label: '아파트 · 빌라', icon: '🏠' },
  { key: 'house',     label: '단독주택',     icon: '🏡' },
  { key: 'cafe',      label: '카페',         icon: '☕' },
  { key: 'restaurant',label: '음식점',       icon: '🍽️' },
  { key: 'office',    label: '사무실',       icon: '🏢' },
  { key: 'retail',    label: '소매점',       icon: '🛒' },
  { key: 'beauty',    label: '미용실',       icon: '💇' },
  { key: 'fitness',   label: '헬스장',       icon: '💪' },
  { key: 'clinic',    label: '병원 · 의원',  icon: '🏥' },
  { key: 'academy',   label: '학원',         icon: '📚' },
  { key: 'bakery',    label: '베이커리',     icon: '🥐' },
  { key: 'bar',       label: '술집 · 바',    icon: '🍺' },
]

// ─── AI 기능 미리보기 ─────────────────────────────────────

const AI_FEATURES = [
  {
    icon: '📸',
    title: '사진 한 장 → 안전 현황',
    desc: '현장 사진을 올리면 AI가 9개 공종 기준으로 즉시 확인합니다. 확인 근거는 법령과 함께 자동 저장됩니다.',
    badge: '핵심 기능',
    badgeColor: '#FF6B2B',
  },
  {
    icon: '⚠️',
    title: '기록 관리 징후 자동 감지',
    desc: '"구두로 합의했어요"라고 입력하면 체크인가 민법 조항과 함께 즉각 경고합니다. 7대 기록 관리 유형 실시간 감지.',
    badge: '자동 실행',
    badgeColor: '#FFB800',
  },
  {
    icon: '🔔',
    title: '하자담보 만료 자동 알림',
    desc: '방수 3년, 타일 1년 — 공종별 담보기간을 자동으로 현황 확인하고 만료 30일 전 알림을 드립니다.',
    badge: '자동 현황 확인',
    badgeColor: '#00D084',
  },
]

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [selectedRole, setSelectedRole] = useState('')
  const [projectName, setProjectName] = useState('')
  const [industry, setIndustry] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  // 시공사 특화 온보딩 상태
  const [contractorSubStep, setContractorSubStep] = useState(0) // 0=숨김, 1~3=시공사 특화 단계
  const isContractorOnboarding = contractorSubStep > 0

  const TOTAL_STEPS = 4
  const progress = ((step + 1) / TOTAL_STEPS) * 100

  const canAdvanceStep1 = projectName.trim().length >= 2 && industry !== ''

  // ─── 역할 선택 → step 1 ─────────────────────────────────

  const handleSelectRole = (roleKey: string) => {
    setSelectedRole(roleKey)
    localStorage.setItem('user_role', roleKey)
    // 시공사 선택 시 특화 온보딩 먼저
    if (roleKey === 'contractor') {
      setContractorSubStep(1)
    } else {
      setStep(1)
    }
  }

  // ─── 현장 등록 → Supabase insert ─────────────────────────

  const handleCreateProject = async () => {
    if (!canAdvanceStep1) return
    setSaving(true)
    setSaveError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: projectName.trim(),
          industry,
          status: 'planning',
          risk_score: 0,
          progress: 0,
          user_id: user.id,
          end_date: endDate || null,
        })
        .select('id')
        .single()

      if (error) throw new Error(error.message)
      setCreatedProjectId(data.id)
      setStep(2)
    } catch (err: any) {
      setSaveError(err.message || '현장 등록 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ─── 완료 처리 ───────────────────────────────────────────

  const handleFinish = (destination?: string) => {
    localStorage.setItem('onboarding_done', 'true')
    onComplete()
    if (destination) router.push(destination)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.wizard}>

        {/* 나중에 (최소화된 건너뛰기) */}
        {step < 3 && (
          <button
            className={styles.laterBtn}
            onClick={() => handleFinish()}
          >
            나중에
          </button>
        )}

        {/* 진행 바 */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* 단계 표시 */}
        <div className={styles.stepIndicator}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`${styles.stepDot} ${i < step ? styles.stepDone : ''} ${i === step ? styles.stepCurrent : ''}`}
            >
              {i < step ? '✓' : i + 1}
            </div>
          ))}
          <div className={styles.stepLine} style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }} />
        </div>

        {/* ─── 시공사 특화 온보딩 (contractor 선택 시) ────── */}
        {isContractorOnboarding && (
          <div className={styles.step} key="contractor-onboarding">
            {contractorSubStep === 1 && (
              <>
                <div className={styles.logoMark}><span>🔨</span></div>
                <h1 className={styles.bigTitle}>
                  체크인는<br />
                  <span className={styles.accent}>시공사도</span> 보호해요
                </h1>
                <p className={styles.subtitle}>
                  억울한 하자 클레임, 미지급 기성금<br />구두합의 기록 관리에서 시공사의 권리를 지켜드려요.
                </p>
                <div className={styles.contractorBenefits}>
                  {[
                    { icon: '📸', text: '시공 완료 사진으로 시공 기록 자동 확보' },
                    { icon: '🛡️', text: '하자 클레임 대응 근거 자동 생성' },
                    { icon: '💰', text: '미지급 기성금 — 하도급법 근거 즉시 제시' },
                  ].map((b, i) => (
                    <div key={i} className={styles.benefitItem}>
                      <span>{b.icon}</span>
                      <span>{b.text}</span>
                    </div>
                  ))}
                </div>
                <button className={styles.nextBtn} onClick={() => setContractorSubStep(2)}>
                  다음 →
                </button>
              </>
            )}
            {contractorSubStep === 2 && (
              <>
                <div className={styles.logoMark}><span>✅</span></div>
                <h1 className={styles.bigTitle}>
                  이런 상황에서<br />
                  <span className={styles.accent}>체크인</span>를 쓰세요
                </h1>
                <div className={styles.contractorScenarios}>
                  {[
                    { title: '억울한 하자 클레임', desc: '시공 당시 사진이 없어서 억울하게 보수해준 적 있으세요? 체크인는 날짜·위치 정보를 포함한 시공 기록를 자동으로 쌓아줘요.' },
                    { title: '구두합의 기록 관리', desc: '고객이 나중에 말을 바꿨나요? AI가 대화를 분석해서 민법 근거와 함께 대응 방법을 알려줘요.' },
                    { title: '기성금 미지급', desc: '공사 완료 후 잔금을 안 주나요? 하도급법 제13조 기준과 지연이자 계산을 즉시 제공해요.' },
                  ].map((s, i) => (
                    <div key={i} className={styles.scenarioCard}>
                      <strong>{s.title}</strong>
                      <p>{s.desc}</p>
                    </div>
                  ))}
                </div>
                <button className={styles.nextBtn} onClick={() => setContractorSubStep(3)}>
                  다음 →
                </button>
              </>
            )}
            {contractorSubStep === 3 && (
              <>
                <div className={styles.logoMark}><span>🏆</span></div>
                <h1 className={styles.bigTitle}>
                  첫 현장을<br />
                  <span className={styles.accent}>등록</span>해볼까요?
                </h1>
                <p className={styles.subtitle}>
                  현장을 등록하면 AI가 바로 분석을 시작해요.<br />
                  사진 한 장으로도 충분해요.
                </p>
                <button
                  className={styles.nextBtn}
                  onClick={() => { setContractorSubStep(0); setStep(1) }}
                >
                  첫 현장 등록하기 →
                </button>
                <button className={styles.skipBtn} onClick={() => handleFinish()}>
                  나중에 할게요
                </button>
              </>
            )}
          </div>
        )}

        {/* ─── STEP 0: 안녕하세요. 체크인입니다. ─────────────── */}
        {step === 0 && (
          <div className={styles.step} key="step0">
            <div className={styles.logoMark}>
              <span>체크인</span>
            </div>
            <h1 className={styles.bigTitle}>
              안녕하세요.<br />
              <span className={styles.accent}>체크인</span>입니다.
            </h1>
            <p className={styles.subtitle}>
              어떤 역할로 사용하시나요?<br />
              <span>역할에 맞게 AI가 더 정확한 도움을 드립니다.</span>
            </p>

            <div className={styles.roleGrid}>
              {ROLES.map(role => (
                <button
                  key={role.key}
                  className={`${styles.roleCard} ${selectedRole === role.key ? styles.roleCardActive : ''}`}
                  onClick={() => handleSelectRole(role.key)}
                >
                  <span className={styles.roleIcon}>{role.icon}</span>
                  <strong className={styles.roleLabel}>{role.label}</strong>
                  <span className={styles.roleDesc}>{role.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 1: 첫 현장을 등록해볼까요? ────────────── */}
        {step === 1 && (
          <div className={styles.step} key="step1">
            <div className={styles.stepEye}>STEP 2 / 4</div>
            <h2 className={styles.stepTitle}>
              첫 현장을<br />등록해볼까요?
            </h2>
            <p className={styles.stepDesc}>
              5분이면 됩니다. 나중에 언제든 수정할 수 있어요.
            </p>

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  현장명 <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.formInput}
                  type="text"
                  placeholder="예: 마포구 아파트 인테리어"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  autoFocus
                  maxLength={50}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  업종 <span className={styles.required}>*</span>
                </label>
                <div className={styles.industryGrid}>
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind.key}
                      type="button"
                      className={`${styles.industryChip} ${industry === ind.key ? styles.industryChipActive : ''}`}
                      onClick={() => setIndustry(ind.key)}
                    >
                      <span>{ind.icon}</span>
                      <span>{ind.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  예상 완공일 <span className={styles.optional}>(선택)</span>
                </label>
                <input
                  className={styles.formInput}
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {saveError && (
                <p className={styles.errorMsg}>{saveError}</p>
              )}
            </div>

            <div className={styles.actions}>
              <button className={styles.backBtn} onClick={() => setStep(0)}>이전</button>
              <button
                className={styles.nextBtn}
                onClick={handleCreateProject}
                disabled={!canAdvanceStep1 || saving}
              >
                {saving ? '등록 중...' : '현장 등록하기 →'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: AI가 준비됐어요. ───────────────────── */}
        {step === 2 && (
          <div className={styles.step} key="step2">
            <div className={styles.stepEye}>STEP 3 / 4</div>
            <div className={styles.aiReadyBadge}>
              <span className={styles.aiDot} />
              AI 활성화됨
            </div>
            <h2 className={styles.stepTitle}>
              AI가<br />준비됐어요.
            </h2>
            <p className={styles.stepDesc}>
              체크인의 3가지 핵심 기능을 소개합니다.
            </p>

            <div className={styles.featureCards}>
              {AI_FEATURES.map((f, i) => (
                <div
                  key={i}
                  className={styles.featureCard}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className={styles.featureTop}>
                    <span className={styles.featureIcon}>{f.icon}</span>
                    <span
                      className={styles.featureBadge}
                      style={{ background: `${f.badgeColor}18`, color: f.badgeColor, borderColor: `${f.badgeColor}30` }}
                    >
                      {f.badge}
                    </span>
                  </div>
                  <strong className={styles.featureTitle}>{f.title}</strong>
                  <p className={styles.featureDesc}>{f.desc}</p>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              <button className={styles.backBtn} onClick={() => setStep(1)}>이전</button>
              <button className={styles.nextBtn} onClick={() => setStep(3)}>
                계속하기 →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: 시작하겠습니다. ─────────────────────── */}
        {step === 3 && (
          <div className={styles.step} key="step3">
            <div className={styles.successIcon}>
              <span>✓</span>
            </div>
            <h2 className={styles.bigTitle}>
              시작하겠습니다.
            </h2>
            <p className={styles.subtitle}>
              {projectName && (
                <>
                  <strong className={styles.accent}>{projectName}</strong> 현장이 등록됐어요.<br />
                </>
              )}
              <span>지금 바로 현장으로 이동하거나, 대시보드에서 시작하세요.</span>
            </p>

            <div className={styles.startChoices}>
              {createdProjectId && (
                <button
                  className={styles.startPrimary}
                  onClick={() => handleFinish(`/projects/${createdProjectId}/diagnostic`)}
                >
                  <span>📸</span>
                  <div>
                    <strong>현장 체크리스트 시작하기</strong>
                    <span>{projectName} → 체크리스트로 바로 이동</span>
                  </div>
                  <span className={styles.arrowIco}>→</span>
                </button>
              )}

              <button
                className={styles.startSecondary}
                onClick={() => handleFinish('/dashboard')}
              >
                <span>🏠</span>
                <div>
                  <strong>대시보드에서 시작하기</strong>
                  <span>전체 현황 확인 후 시작</span>
                </div>
                <span className={styles.arrowIco}>→</span>
              </button>

              <button
                className={styles.startSecondary}
                onClick={() => handleFinish('/projects')}
              >
                <span>📁</span>
                <div>
                  <strong>프로젝트 목록 보기</strong>
                  <span>모든 현장 관리</span>
                </div>
                <span className={styles.arrowIco}>→</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
