'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity/logger'
import { DEFAULT_PROCESSES } from '@/types/process'
import { useToast } from '@/components/ui/Toast'
import styles from './page.module.scss'

const INDUSTRY_GROUPS = [
  {
    key: 'food',
    label: '카페/식당',
    icon: '🍽️',
    desc: '카페, 음식점, 바, 베이커리, 뷔페 등 F&B 공간',
    color: '#E8651A',
    industries: [
      { key: 'cafe', label: '카페' },
      { key: 'restaurant', label: '음식점' },
      { key: 'bar', label: '술집/바' },
      { key: 'bakery', label: '베이커리' },
      { key: 'buffet', label: '뷔페' },
    ],
  },
  {
    key: 'residential',
    label: '주거',
    icon: '🏠',
    desc: '아파트, 빌라, 단독주택, 오피스텔, 원룸',
    color: '#3b82f6',
    industries: [
      { key: 'apartment', label: '아파트' },
      { key: 'villa', label: '빌라' },
      { key: 'house', label: '단독주택' },
      { key: 'officetel', label: '오피스텔' },
      { key: 'townhouse', label: '타운하우스' },
      { key: 'oneroom', label: '원룸/투룸' },
    ],
  },
  {
    key: 'office_type',
    label: '사무실',
    icon: '🏢',
    desc: '일반 사무실, 스터디카페, 코워킹 스페이스',
    color: '#10b981',
    industries: [
      { key: 'office', label: '일반 사무실' },
      { key: 'studycafe', label: '스터디카페' },
      { key: 'coworking', label: '코워킹 스페이스' },
    ],
  },
  {
    key: 'commercial',
    label: '매장/상업',
    icon: '🛒',
    desc: '소매점, 미용실, 헬스장, 의원, 학원 등',
    color: '#8b5cf6',
    industries: [
      { key: 'retail', label: '소매점' },
      { key: 'beauty', label: '미용실' },
      { key: 'fitness', label: '헬스장' },
      { key: 'clinic', label: '의원/병원' },
      { key: 'pharmacy', label: '약국' },
      { key: 'nail', label: '네일샵' },
      { key: 'spa', label: '스파/마사지' },
      { key: 'academy', label: '학원' },
      { key: 'kidscafe', label: '키즈카페' },
      { key: 'pcroom', label: 'PC방' },
      { key: 'karaoke', label: '노래방' },
    ],
  },
  {
    key: 'factory_type',
    label: '공장/창고',
    icon: '🏭',
    desc: '공장, 물류창고, 산업 작업장',
    color: '#6b7280',
    industries: [
      { key: 'factory', label: '공장' },
      { key: 'warehouse', label: '창고/물류' },
    ],
  },
  {
    key: 'other',
    label: '기타',
    icon: '🏗️',
    desc: '호텔, 펜션, 갤러리, 종교시설 등',
    color: '#0F2744',
    industries: [
      { key: 'hotel', label: '호텔' },
      { key: 'pension', label: '펜션' },
      { key: 'gallery', label: '갤러리' },
      { key: 'library', label: '도서관' },
      { key: 'daycare', label: '어린이집' },
      { key: 'religious', label: '종교시설' },
    ],
  },
]

const CREATING_STEPS = [
  { key: 'project', label: '현장 정보 저장', icon: '🏗️' },
  { key: 'process', label: '기본 공정 자동 생성', icon: '⚙️' },
  { key: 'law', label: '17개 법령 초기 점검', icon: '⚖️' },
  { key: 'done', label: '완료!', icon: '🚀' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    client_name: '',
    address: '',
    budget: '',
    start_date: '',
    end_date: '',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedGroupData = INDUSTRY_GROUPS.find(g => g.key === selectedGroup)
  const canSubmit = formData.name.trim() !== '' && formData.industry !== '' && formData.address.trim() !== ''

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.name.trim()) errs.name = '현장명을 입력해주세요.'
    if (!formData.industry) errs.industry = '업종을 선택해주세요.'
    if (!formData.address.trim()) errs.address = '현장 주소를 입력해주세요.'
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      errs.end_date = '완료일은 시작일 이후여야 합니다.'
    }
    return errs
  }

  const handleGroupSelect = (groupKey: string) => {
    setSelectedGroup(groupKey)
    const group = INDUSTRY_GROUPS.find(g => g.key === groupKey)
    if (group && group.industries.length === 1) {
      setFormData(p => ({ ...p, industry: group.industries[0].key }))
    } else {
      setFormData(p => ({ ...p, industry: '' }))
    }
    setErrors(p => ({ ...p, industry: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setCreating(true)
    setCurrentStep(0)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // Step 1: 프로젝트 생성 (known columns only)
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([{
          user_id: user.id,
          name: formData.name.trim(),
          industry: formData.industry,
          client_name: formData.client_name.trim() || formData.name.trim(),
          status: 'in_progress',
          progress: 0,
          risk_score: 0,
          ...(formData.start_date ? { start_date: formData.start_date } : {}),
          ...(formData.end_date ? { end_date: formData.end_date } : {}),
        }])
        .select()
        .single()

      if (projectError) throw projectError

      // 추가 필드 업데이트 (migration 실행 후 사용 가능, 실패 시 무시)
      const extraData: Record<string, unknown> = {}
      if (formData.address.trim()) extraData.address = formData.address.trim()
      if (formData.budget) extraData.budget = parseInt(formData.budget) * 10000
      if (formData.description.trim()) extraData.description = formData.description.trim()
      if (Object.keys(extraData).length > 0) {
        await supabase.from('projects').update(extraData).eq('id', project.id)
        // error silently ignored if columns don't exist
      }

      setCurrentStep(1)

      // Step 2: 기본 공정 자동 생성
      const today = new Date().toISOString().split('T')[0]
      const processRows = DEFAULT_PROCESSES.map((name, i) => ({
        project_id: project.id,
        name,
        status: 'pending',
        progress: 0,
        order_index: i,
        start_date: formData.start_date || today,
        end_date: formData.end_date || null,
      }))
      await supabase.from('processes').insert(processRows)

      setCurrentStep(2)

      // Step 3: 법령 초기 점검 (실패해도 계속 진행)
      try {
        await fetch(`/api/projects/${project.id}/law-check`, { method: 'POST' })
      } catch {
        // law check initialization is not critical
      }

      // 활동 로그
      logActivity(supabase, {
        userId: user.id,
        projectId: project.id,
        action: 'project_created',
        targetType: 'project',
        targetId: project.id,
        meta: { name: project.name, industry: project.industry },
      }).catch(() => {})

      setCurrentStep(3)
      toast.success(`"${project.name}" 현장이 등록됐어요! 체크리스트와 법령이 자동 준비됩니다.`)

      // 잠시 완료 상태 표시 후 이동
      await new Promise(r => setTimeout(r, 800))
      router.push(`/projects/${project.id}/overview`)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '등록 중 오류가 발생했어요.'
      toast.error(msg)
      setErrors({ submit: msg })
      setCreating(false)
      setCurrentStep(0)
    }
  }

  if (creating) {
    return (
      <div className={styles.creatingPage}>
        <div className={styles.creatingCard}>
          <div className={styles.creatingSpinner} />
          <h2 className={styles.creatingTitle}>현장 등록 중...</h2>
          <p className={styles.creatingSubtitle}>잠시만 기다려주세요</p>
          <div className={styles.creatingSteps}>
            {CREATING_STEPS.map((step, i) => (
              <div
                key={step.key}
                className={`${styles.creatingStep} ${
                  i < currentStep ? styles.stepDone :
                  i === currentStep ? styles.stepActive : ''
                }`}
              >
                <span className={styles.stepIcon}>{i < currentStep ? '✅' : step.icon}</span>
                <span className={styles.stepLabel}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/projects" className={styles.backLink}>← 현장 목록</Link>
        <h1 className={styles.title}>새 현장 등록</h1>
        <p className={styles.subtitle}>
          현장 정보를 입력하면 업종별 체크리스트·소방 법령·기본 공정이 자동으로 준비됩니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Section 1: 기본 정보 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📋 기본 정보</h2>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                현장명 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => { setFormData(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })) }}
                placeholder="예: 강남 카페 인테리어"
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
              />
              {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>고객명 / 발주처</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={e => setFormData(p => ({ ...p, client_name: e.target.value }))}
                placeholder="예: 홍길동 (미입력 시 현장명 사용)"
                className={styles.input}
              />
            </div>
          </div>
        </section>

        {/* Section 2: 업종 선택 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            🏗️ 업종 선택 <span className={styles.required}>*</span>
          </h2>
          <p className={styles.sectionDesc}>
            업종에 맞는 체크리스트와 소방 법령이 자동으로 준비됩니다.
          </p>

          <div className={styles.industryGroups}>
            {INDUSTRY_GROUPS.map(group => (
              <button
                key={group.key}
                type="button"
                className={`${styles.groupCard} ${selectedGroup === group.key ? styles.groupSelected : ''}`}
                style={{ '--group-color': group.color } as React.CSSProperties}
                onClick={() => handleGroupSelect(group.key)}
              >
                <span className={styles.groupIcon}>{group.icon}</span>
                <span className={styles.groupLabel}>{group.label}</span>
                <span className={styles.groupDesc}>{group.desc}</span>
              </button>
            ))}
          </div>

          {selectedGroup && selectedGroupData && selectedGroupData.industries.length > 1 && (
            <div className={styles.subIndustry}>
              <label className={styles.label}>세부 업종 <span className={styles.required}>*</span></label>
              <div className={styles.industryChips}>
                {selectedGroupData.industries.map(ind => (
                  <button
                    key={ind.key}
                    type="button"
                    className={`${styles.chip} ${formData.industry === ind.key ? styles.chipSelected : ''}`}
                    onClick={() => { setFormData(p => ({ ...p, industry: ind.key })); setErrors(p => ({ ...p, industry: '' })) }}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {errors.industry && <span className={styles.errorMsg}>{errors.industry}</span>}
        </section>

        {/* Section 3: 위치 & 예산 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📍 현장 위치 & 예산</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              현장 주소 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={e => { setFormData(p => ({ ...p, address: e.target.value })); setErrors(p => ({ ...p, address: '' })) }}
              placeholder="예: 서울시 강남구 테헤란로 123"
              className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
            />
            {errors.address && <span className={styles.errorMsg}>{errors.address}</span>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>예상 공사비 (만원)</label>
            <input
              type="number"
              value={formData.budget}
              onChange={e => setFormData(p => ({ ...p, budget: e.target.value }))}
              placeholder="예: 5000 (5천만원)"
              min="0"
              className={styles.input}
            />
          </div>
        </section>

        {/* Section 4: 공사 기간 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📅 공사 기간</h2>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>공사 시작일</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>공사 예정 완료일</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={e => { setFormData(p => ({ ...p, end_date: e.target.value })); setErrors(p => ({ ...p, end_date: '' })) }}
                className={`${styles.input} ${errors.end_date ? styles.inputError : ''}`}
              />
              {errors.end_date && <span className={styles.errorMsg}>{errors.end_date}</span>}
            </div>
          </div>
        </section>

        {/* Section 5: 추가 정보 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📝 추가 정보 (선택)</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>현장 설명</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="공사 범위, 특이사항, 고객 요구사항 등을 기록하세요."
              rows={3}
              className={styles.textarea}
            />
          </div>
        </section>

        {/* 자동 준비 미리보기 */}
        {formData.industry && (
          <div className={styles.preview}>
            <h3 className={styles.previewTitle}>등록 후 자동 준비되는 항목</h3>
            <div className={styles.previewItems}>
              <div className={styles.previewItem}>
                <span>📋</span>
                <span>업종별 체크리스트 ({formData.industry} 기준 자동 적용)</span>
              </div>
              <div className={styles.previewItem}>
                <span>🔥</span>
                <span>소방 안전 체크리스트 (NFSC 기준)</span>
              </div>
              <div className={styles.previewItem}>
                <span>⚖️</span>
                <span>17개 법령 초기 점검 자동 실행</span>
              </div>
              <div className={styles.previewItem}>
                <span>⚙️</span>
                <span>기본 공정 {DEFAULT_PROCESSES.length}개 자동 생성</span>
              </div>
            </div>
          </div>
        )}

        {errors.submit && (
          <div className={styles.submitError}>{errors.submit}</div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <Link href="/projects" className={styles.cancelBtn}>취소</Link>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!canSubmit || creating}
          >
            🚀 현장 등록하기
          </button>
        </div>
      </form>
    </div>
  )
}
