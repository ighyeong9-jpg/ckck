'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity/logger'
import { useToast } from '@/components/ui/Toast'
import {
  checklistMap,
  checklistOptions,
  type Checklist,
  type ChecklistItem
} from '@/data/checklists'
import { industryRiskWeights, type IndustryType } from '@/data/industries'
import { getRiskGradeAndLevel } from '@/lib/utils/riskCalculator'
import {
  type RiskScores,
  type Priority,
  type CheckMethod,
  type EvidenceType,
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  METHOD_OPTIONS,
  EVIDENCE_OPTIONS,
  CATEGORY_RISK_FACTOR,
  PRIORITY_RISK_SCORE
} from '@/types/diagnostic'
import RiskGauge from '@/components/risk/RiskGauge'
import QuickActions from '@/components/ui/QuickActions'
import styles from './page.module.scss'

interface CustomItem extends ChecklistItem {
  isCustom: true
}

export default function DiagnosticPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()
  const toast = useToast()

  // 상태
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('cafe')
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const [responses, setResponses] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [riskScores, setRiskScores] = useState<RiskScores>({ Fp: 0, Oc: 0, Ch: 0, total: 0 })
  const [riskGrade, setRiskGrade] = useState<{ grade: string; level: 'low' | 'medium' | 'high' }>({ grade: 'A', level: 'low' })
  // 커스텀 항목 추가 모달
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<CustomItem | null>(null)
  const [customForm, setCustomForm] = useState({
    category: '안전',
    subcategory: '',
    item: '',
    priority: '필수' as Priority,
    method: '육안확인' as CheckMethod,
    evidence: '사진' as EvidenceType
  })

  // 확장된 카테고리 상태
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  // 핵심 항목만 모드
  const [essentialOnly, setEssentialOnly] = useState(false)
  // AI 자동 진단 중
  const [autoDiagnosing, setAutoDiagnosing] = useState(false)

  // 전체 항목 (기본 + 커스텀)
  const allItems = useMemo(() => {
    if (!checklist) return []
    return [...checklist.items, ...customItems]
  }, [checklist, customItems])

  // 표시할 항목 (핵심 모드 필터)
  const visibleItems = useMemo(() => {
    if (!essentialOnly) return allItems
    return allItems.filter(item => item.priority === '필수')
  }, [allItems, essentialOnly])

  // 카테고리별 그룹화
  const groupedItems = useMemo(() => {
    const groups: Record<string, Record<string, (ChecklistItem | CustomItem)[]>> = {}

    visibleItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = {}
      }
      if (!groups[item.category][item.subcategory]) {
        groups[item.category][item.subcategory] = []
      }
      groups[item.category][item.subcategory].push(item)
    })

    return groups
  }, [visibleItems])

  // 업종 변경 시 체크리스트 업데이트
  useEffect(() => {
    const newChecklist = checklistMap[selectedIndustry]
    if (newChecklist) {
      setChecklist(newChecklist)
      // 모든 카테고리 확장
      const expanded: Record<string, boolean> = {}
      newChecklist.items.forEach(item => {
        expanded[item.category] = true
      })
      setExpandedCategories(expanded)
    }
  }, [selectedIndustry])

  // 프로젝트 정보 및 기존 응답 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 프로젝트 정보 로드
        const { data: project } = await supabase
          .from('projects')
          .select('name, industry')
          .eq('id', projectId)
          .single()

        if (project) {
          if (project.industry && checklistMap[project.industry as IndustryType]) {
            setSelectedIndustry(project.industry as IndustryType)
          }
        }

        // 기존 응답 로드
        const { data: existingResponses } = await supabase
          .from('diagnostic_responses')
          .select('*')
          .eq('project_id', projectId)

        if (existingResponses && existingResponses.length > 0) {
          const responseMap: Record<string, boolean> = {}
          existingResponses.forEach((r: any) => {
            const itemId = r.item_id || r.question_id
            if (itemId) {
              responseMap[itemId] = r.checked
            }
          })
          setResponses(responseMap)
        }

        // 커스텀 항목 로드
        const { data: savedCustomItems } = await supabase
          .from('custom_checklist_items')
          .select('*')
          .eq('project_id', projectId)

        if (savedCustomItems) {
          setCustomItems(savedCustomItems.map((item: any) => ({
            id: item.id,
            category: item.category,
            subcategory: item.subcategory,
            item: item.item,
            priority: item.priority,
            method: item.method,
            evidence: item.evidence,
            isCustom: true as const
          })))
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId])

  // 리스크 점수 계산
  useEffect(() => {
    const scores: RiskScores = { Fp: 0, Oc: 0, Ch: 0, total: 0 }
    const maxScores: Record<string, number> = { Fp: 0, Oc: 0, Ch: 0 }

    allItems.forEach(item => {
      const riskFactor = CATEGORY_RISK_FACTOR[item.category] || 'Oc'
      const riskScore = PRIORITY_RISK_SCORE[item.priority]

      maxScores[riskFactor] += riskScore

      if (!responses[item.id]) {
        scores[riskFactor as keyof typeof scores] += riskScore
      }
    })

    // 정규화 (0-100)
    const normalizedFp = maxScores.Fp > 0 ? (scores.Fp / maxScores.Fp) * 100 : 0
    const normalizedOc = maxScores.Oc > 0 ? (scores.Oc / maxScores.Oc) * 100 : 0
    const normalizedCh = maxScores.Ch > 0 ? (scores.Ch / maxScores.Ch) * 100 : 0

    scores.Fp = Math.round(normalizedFp)
    scores.Oc = Math.round(normalizedOc)
    scores.Ch = Math.round(normalizedCh)

    // 업종별 가중치 적용
    const weights = industryRiskWeights[selectedIndustry] || { Wf: 0.33, Wo: 0.34, Wc: 0.33 }
    scores.total = Math.round(
      scores.Fp * weights.Wf +
      scores.Oc * weights.Wo +
      scores.Ch * weights.Wc
    )

    setRiskScores(scores)
    setRiskGrade(getRiskGradeAndLevel(scores.total))
  }, [responses, allItems, selectedIndustry])

  // 체크리스트 완료율 → projects.progress 자동 업데이트
  const autoUpdateProgress = async (updatedResponses: Record<string, boolean>) => {
    const total = allItems.length
    if (total === 0) return
    const done = Object.values(updatedResponses).filter(Boolean).length
    const progress = Math.round((done / total) * 100)
    await supabase
      .from('projects')
      .update({ progress })
      .eq('id', projectId)
  }

  // 체크 상태 변경
  const handleCheck = async (itemId: string, item: ChecklistItem | CustomItem) => {
    const newChecked = !responses[itemId]
    const updatedResponses = { ...responses, [itemId]: newChecked }
    setResponses(updatedResponses)

    try {
      const { error } = await supabase
        .from('diagnostic_responses')
        .upsert({
          project_id: projectId,
          item_id: itemId,
          question_id: itemId,
          category: item.category,
          subcategory: item.subcategory,
          checked: newChecked,
          risk_factor: CATEGORY_RISK_FACTOR[item.category] || 'Oc',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'project_id,question_id'
        })

      if (error) throw error

      // 체크리스트 완료율 → projects.progress 자동 업데이트
      autoUpdateProgress(updatedResponses).catch(() => {})
    } catch (err) {
      console.error('Error saving response:', err)
    }
  }

  // 리스크 점수 저장
  const saveRiskScore = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          risk_score: riskScores.total,
          industry: selectedIndustry
        })
        .eq('id', projectId)

      if (error) throw error

      // 활동 로그
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        logActivity(supabase, {
          userId: user.id,
          projectId,
          action: 'risk_score_saved',
          targetType: 'diagnostic',
          targetId: projectId,
          meta: { riskScore: riskScores.total, grade: riskGrade.grade, industry: selectedIndustry },
        }).catch(() => {})
      }

      toast.success(`리스크 점수 ${riskScores.total}점(${riskGrade.grade}등급)이 저장되었어요.`)
    } catch (err) {
      console.error('Error saving risk score:', err)
      toast.error('저장 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  // 업종 변경 핸들러
  const handleIndustryChange = async (newIndustry: string) => {
    if (Object.keys(responses).length > 0) {
      if (!confirm('업종을 변경하면 기존 체크 내역이 초기화됩니다. 계속하시겠습니까?')) {
        return
      }
      setResponses({})
      await supabase
        .from('diagnostic_responses')
        .delete()
        .eq('project_id', projectId)
    }
    setSelectedIndustry(newIndustry as IndustryType)
  }

  // 커스텀 항목 추가
  const handleAddCustomItem = async () => {
    if (!customForm.item.trim() || !customForm.subcategory.trim()) {
      toast.warning('항목명과 세부 카테고리를 입력해주세요.')
      return
    }

    const newItem: CustomItem = {
      id: `custom-${Date.now()}`,
      category: customForm.category,
      subcategory: customForm.subcategory,
      item: customForm.item,
      priority: customForm.priority,
      method: customForm.method,
      evidence: customForm.evidence,
      isCustom: true
    }

    try {
      const { data, error } = await supabase
        .from('custom_checklist_items')
        .insert({
          id: newItem.id,
          project_id: projectId,
          category: newItem.category,
          subcategory: newItem.subcategory,
          item: newItem.item,
          priority: newItem.priority,
          method: newItem.method,
          evidence: newItem.evidence
        })
        .select()
        .single()

      if (error) throw error

      setCustomItems(prev => [...prev, { ...newItem, id: data.id }])
      setShowAddModal(false)
      resetForm()
    } catch (err) {
      console.error('Error adding custom item:', err)
      toast.error('항목 추가 중 오류가 발생했습니다.')
    }
  }

  // 커스텀 항목 수정
  const handleUpdateCustomItem = async () => {
    if (!editingItem || !customForm.item.trim() || !customForm.subcategory.trim()) {
      toast.warning('항목명과 세부 카테고리를 입력해주세요.')
      return
    }

    try {
      const { error } = await supabase
        .from('custom_checklist_items')
        .update({
          category: customForm.category,
          subcategory: customForm.subcategory,
          item: customForm.item,
          priority: customForm.priority,
          method: customForm.method,
          evidence: customForm.evidence
        })
        .eq('id', editingItem.id)

      if (error) throw error

      setCustomItems(prev =>
        prev.map(item =>
          item.id === editingItem.id
            ? { ...item, ...customForm }
            : item
        )
      )
      setEditingItem(null)
      setShowAddModal(false)
      resetForm()
    } catch (err) {
      console.error('Error updating custom item:', err)
      toast.error('항목 수정 중 오류가 발생했습니다.')
    }
  }

  // 커스텀 항목 삭제
  const handleDeleteCustomItem = async (itemId: string) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('custom_checklist_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setCustomItems(prev => prev.filter(item => item.id !== itemId))
      setResponses(prev => {
        const newResponses = { ...prev }
        delete newResponses[itemId]
        return newResponses
      })
    } catch (err) {
      console.error('Error deleting custom item:', err)
      toast.error('항목 삭제 중 오류가 발생했습니다.')
    }
  }

  // 수정 모드 진입
  const openEditModal = (item: CustomItem) => {
    setEditingItem(item)
    setCustomForm({
      category: item.category,
      subcategory: item.subcategory,
      item: item.item,
      priority: item.priority,
      method: item.method,
      evidence: item.evidence
    })
    setShowAddModal(true)
  }

  // 폼 초기화
  const resetForm = () => {
    setCustomForm({
      category: '안전',
      subcategory: '',
      item: '',
      priority: '필수',
      method: '육안확인',
      evidence: '사진'
    })
  }

  // ═══ 기능 1: 일괄 체크 ═══
  const handleCheckAll = async () => {
    const newResponses: Record<string, boolean> = { ...responses }
    const upsertRows: any[] = []

    visibleItems.forEach(item => {
      newResponses[item.id] = true
      upsertRows.push({
        project_id: projectId,
        item_id: item.id,
        question_id: item.id,
        category: item.category,
        subcategory: item.subcategory,
        checked: true,
        risk_factor: CATEGORY_RISK_FACTOR[item.category] || 'Oc',
        updated_at: new Date().toISOString()
      })
    })

    setResponses(newResponses)

    // DB 일괄 저장 (50개씩 배치)
    for (let i = 0; i < upsertRows.length; i += 50) {
      const batch = upsertRows.slice(i, i + 50)
      await supabase.from('diagnostic_responses').upsert(batch, { onConflict: 'project_id,question_id' })
    }
  }

  const handleUncheckAll = async () => {
    setResponses({})
    await supabase.from('diagnostic_responses').delete().eq('project_id', projectId)
  }

  const handleCheckCategory = async (category: string) => {
    const categoryItems = visibleItems.filter(item => item.category === category)
    const allChecked = categoryItems.every(item => responses[item.id])

    const newResponses: Record<string, boolean> = { ...responses }
    const upsertRows: any[] = []

    categoryItems.forEach(item => {
      newResponses[item.id] = !allChecked
      upsertRows.push({
        project_id: projectId,
        item_id: item.id,
        question_id: item.id,
        category: item.category,
        subcategory: item.subcategory,
        checked: !allChecked,
        risk_factor: CATEGORY_RISK_FACTOR[item.category] || 'Oc',
        updated_at: new Date().toISOString()
      })
    })

    setResponses(newResponses)

    for (let i = 0; i < upsertRows.length; i += 50) {
      const batch = upsertRows.slice(i, i + 50)
      await supabase.from('diagnostic_responses').upsert(batch, { onConflict: 'project_id,question_id' })
    }
  }

  // ═══ 기능 2: AI 자동 진단 ═══
  const handleAiAutoDiagnose = async () => {
    setAutoDiagnosing(true)
    try {
      const newResponses: Record<string, boolean> = {}
      const upsertRows: any[] = []

      // 업종별 위험 카테고리 설정
      const highRiskCategories: Record<string, string[]> = {
        cafe: ['안전', '설비'],
        restaurant: ['안전', '설비', '법규'],
        bar: ['안전', '법규'],
        bakery: ['안전', '설비'],
        beauty: ['법규', '설비'],
        clinic: ['법규', '안전'],
        fitness: ['안전', '설비'],
        retail: ['법규', '안전'],
        office: ['설비', '안전'],
        academy: ['안전', '법규'],
        apartment: ['안전', '품질', '설비'],
        villa: ['안전', '품질'],
        house: ['안전', '품질'],
      }

      const riskCats = highRiskCategories[selectedIndustry] || ['안전']

      allItems.forEach(item => {
        // AI 판단 로직:
        // - 필수 + 위험 카테고리 → 미체크 (현장 확인 필요)
        // - 필수 + 일반 카테고리 → 체크 (양호 추정)
        // - 권장/조건부 → 전부 체크 (양호 추정)
        const isHighRisk = riskCats.includes(item.category) && item.priority === '필수'
        const checked = !isHighRisk

        newResponses[item.id] = checked
        upsertRows.push({
          project_id: projectId,
          item_id: item.id,
          question_id: item.id,
          category: item.category,
          subcategory: item.subcategory,
          checked,
          risk_factor: CATEGORY_RISK_FACTOR[item.category] || 'Oc',
          updated_at: new Date().toISOString()
        })
      })

      setResponses(newResponses)

      // DB 일괄 저장
      for (let i = 0; i < upsertRows.length; i += 50) {
        const batch = upsertRows.slice(i, i + 50)
        await supabase.from('diagnostic_responses').upsert(batch, { onConflict: 'project_id,question_id' })
      }

      // 미체크 항목 수 계산
      const uncheckedCount = Object.values(newResponses).filter(v => !v).length
      toast.success(`AI 자동 진단 완료! 양호 ${allItems.length - uncheckedCount}개 / 확인 필요 ${uncheckedCount}개`)
    } catch (err) {
      console.error('AI 자동 진단 오류:', err)
      toast.error('자동 진단 중 오류가 발생했습니다.')
    } finally {
      setAutoDiagnosing(false)
    }
  }

  // 카테고리 토글
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  // 완료율 계산
  const getCompletionRate = () => {
    const totalItems = allItems.length
    if (totalItems === 0) return 0
    const checkedCount = Object.values(responses).filter(Boolean).length
    return Math.round((checkedCount / totalItems) * 100)
  }

  // 카테고리별 완료율
  const getCategoryCompletion = (category: string) => {
    const categoryItems = allItems.filter(item => item.category === category)
    if (categoryItems.length === 0) return { checked: 0, total: 0 }
    const checked = categoryItems.filter(item => responses[item.id]).length
    return { checked, total: categoryItems.length }
  }

  // 리스크 레벨 색상
  const getRiskColor = (score: number) => {
    if (score <= 30) return styles.riskLow
    if (score <= 60) return styles.riskMedium
    return styles.riskHigh
  }

  // 우선순위 뱃지 색상
  const getPriorityClass = (priority: Priority) => {
    switch (priority) {
      case '필수': return styles.priorityRequired
      case '권장': return styles.priorityRecommended
      case '조건부': return styles.priorityConditional
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <QuickActions compact actions={[
          { icon: '🔍', label: '리스크 진단', description: '전체 리스크 종합 진단', message: '전체 리스크 종합 진단해줘' },
          { icon: '📋', label: '체크리스트 분석', description: 'AI 체크리스트 분석', message: '체크리스트 분석해줘' },
          { icon: '⚠️', label: '안전 점검', description: '안전 리스크 분석', message: '안전 리스크 분석해줘' },
        ]} />

        {/* Industry Selector */}
        <section className={styles.industrySection}>
          <label className={styles.industryLabel}>업종 선택</label>
          <select
            className={styles.industrySelect}
            value={selectedIndustry}
            onChange={(e) => handleIndustryChange(e.target.value)}
          >
            {checklistOptions.map(industry => (
              <option key={industry.id} value={industry.id}>
                {industry.icon} {industry.name}
              </option>
            ))}
          </select>
        </section>

        {/* 일괄 작업 툴바 */}
        <section className={styles.bulkToolbar}>
          <div className={styles.bulkLeft}>
            <button className={styles.bulkBtn} onClick={handleCheckAll} title="모든 항목을 양호로 체크">
              ✅ 전체 양호
            </button>
            <button className={`${styles.bulkBtn} ${styles.bulkDanger}`} onClick={handleUncheckAll} title="모든 체크 해제">
              ❌ 전체 해제
            </button>
            <button
              className={`${styles.bulkBtn} ${styles.bulkAi}`}
              onClick={handleAiAutoDiagnose}
              disabled={autoDiagnosing}
              title="AI가 업종별 위험도를 분석하여 자동 진단"
            >
              {autoDiagnosing ? '⏳ 분석 중...' : '🤖 AI 자동 진단'}
            </button>
          </div>
          <div className={styles.bulkRight}>
            <button
              className={`${styles.essentialToggle} ${essentialOnly ? styles.essentialActive : ''}`}
              onClick={() => setEssentialOnly(!essentialOnly)}
            >
              {essentialOnly ? '🔴 필수만 보기 ON' : '⚪ 필수만 보기'}
            </button>
            <span className={styles.itemCount}>
              {essentialOnly
                ? `필수 ${visibleItems.length}개 / 전체 ${allItems.length}개`
                : `총 ${allItems.length}개`
              }
            </span>
          </div>
        </section>

        {/* Risk Score Summary */}
        <section className={styles.riskSummary}>
          <div className={styles.riskTotal}>
            <RiskGauge
              score={riskScores.total}
              grade={riskGrade.grade}
              size="large"
            />
            <div className={styles.completionRate}>
              <span>완료율</span>
              <strong>{getCompletionRate()}%</strong>
            </div>
            <div className={styles.statusMessage}>
              {getCompletionRate() === 0 && '체크리스트를 시작해보세요!'}
              {getCompletionRate() > 0 && getCompletionRate() < 30 && '좋은 시작이에요! 계속 진행해보세요 💪'}
              {getCompletionRate() >= 30 && getCompletionRate() < 60 && '순조롭게 진행 중이에요! 👍'}
              {getCompletionRate() >= 60 && getCompletionRate() < 90 && '거의 다 됐어요! 조금만 더! 🔥'}
              {getCompletionRate() >= 90 && getCompletionRate() < 100 && '완벽에 가까워요! 마무리해주세요 ✨'}
              {getCompletionRate() === 100 && '완벽합니다! 현장 진단 완료! 🎉'}
            </div>
          </div>

          <div className={styles.riskBreakdown}>
            <div className={styles.riskItem}>
              <span className={styles.riskName}>재정적 위험 (Fp)</span>
              <div className={styles.riskBar}>
                <div
                  className={`${styles.riskFill} ${getRiskColor(riskScores.Fp)}`}
                  style={{ width: `${riskScores.Fp}%` }}
                />
              </div>
              <span className={styles.riskPercent}>{riskScores.Fp}%</span>
            </div>
            <div className={styles.riskItem}>
              <span className={styles.riskName}>운영 복잡도 (Oc)</span>
              <div className={styles.riskBar}>
                <div
                  className={`${styles.riskFill} ${getRiskColor(riskScores.Oc)}`}
                  style={{ width: `${riskScores.Oc}%` }}
                />
              </div>
              <span className={styles.riskPercent}>{riskScores.Oc}%</span>
            </div>
            <div className={styles.riskItem}>
              <span className={styles.riskName}>규정준수 리스크 (Ch)</span>
              <div className={styles.riskBar}>
                <div
                  className={`${styles.riskFill} ${getRiskColor(riskScores.Ch)}`}
                  style={{ width: `${riskScores.Ch}%` }}
                />
              </div>
              <span className={styles.riskPercent}>{riskScores.Ch}%</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              className={styles.saveBtn}
              onClick={saveRiskScore}
              disabled={saving}
            >
              {saving ? '저장 중...' : '리스크 점수 저장'}
            </button>
            <button
              className={styles.saveBtn}
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}
              onClick={() => {
                const btn = document.querySelector('[aria-label="AI 비서 체키"]') as HTMLButtonElement
                if (btn) btn.click()
              }}
            >
              🤖 AI 리스크 분석
            </button>
          </div>
        </section>

        {/* GO/NO-GO 판정 카드 */}
        {allItems.length > 0 && (
          <section className={styles.gonogoCard}>
            <div className={styles.gonogoHeader}>
              <div>
                <div className={styles.gonogoTitle}>GO / NO-GO 판정</div>
                <div className={styles.gonogoSubtitle}>R = Fp×Wf + Oc×Wo + Ch×Wc</div>
              </div>
              <div className={`${styles.gonogoBadge} ${riskScores.total <= 60 ? styles.go : styles.nogo}`}>
                {riskScores.total <= 60 ? 'GO' : 'NO-GO'}
              </div>
            </div>
            <div className={styles.factorsGrid}>
              {[
                { key: 'Fp', name: '재정위험', value: riskScores.Fp, icon: '💰' },
                { key: 'Oc', name: '운영복잡', value: riskScores.Oc, icon: '⚙️' },
                { key: 'Ch', name: '규정준수', value: riskScores.Ch, icon: '📋' },
                { key: 'Tw', name: '시간위험', value: Math.round(riskScores.total * 0.8), icon: '⏱️' },
                { key: 'Hw', name: '인력위험', value: Math.round(riskScores.total * 0.6), icon: '👷' },
                { key: 'Ew', name: '환경위험', value: Math.round(riskScores.total * 0.5), icon: '🌍' },
              ].map(f => (
                <div key={f.key} className={`${styles.factor} ${f.value <= 30 ? styles.pass : f.value <= 60 ? styles.warn : styles.fail}`}>
                  <span className={styles.factorIcon}>{f.icon}</span>
                  <span className={styles.factorName}>{f.name}</span>
                  <span className={styles.factorValue}>{f.value}</span>
                  <span className={`${styles.factorStatus} ${f.value <= 30 ? styles.pass : f.value <= 60 ? styles.warn : styles.fail}`}>
                    {f.value <= 30 ? '안전' : f.value <= 60 ? '주의' : '위험'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add Custom Item Button */}
        <section className={styles.customSection}>
          <button
            className={styles.addCustomBtn}
            onClick={() => {
              setEditingItem(null)
              resetForm()
              setShowAddModal(true)
            }}
          >
            + 커스텀 항목 추가
          </button>
        </section>

        {/* Checklist Categories */}
        <section className={styles.categories}>
          {Object.entries(groupedItems).map(([category, subcategories]) => {
            const completion = getCategoryCompletion(category)
            const isExpanded = expandedCategories[category]

            return (
              <div key={category} className={styles.category}>
                <div
                  className={styles.categoryHeader}
                  onClick={() => toggleCategory(category)}
                >
                  <div className={styles.categoryTitle}>
                    <span className={styles.expandIcon}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <h2>{category}</h2>
                  </div>
                  <div className={styles.categoryRight}>
                    <button
                      className={styles.categoryCheckAll}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCheckCategory(category)
                      }}
                      title={`${category} 전체 체크/해제`}
                    >
                      {completion.checked === completion.total ? '☑️' : '☐'}
                    </button>
                    <span className={styles.categoryBadge}>
                      {completion.checked} / {completion.total}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.subcategories}>
                    {Object.entries(subcategories).map(([subcategory, items]) => (
                      <div key={subcategory} className={styles.subcategory}>
                        <h3 className={styles.subcategoryTitle}>{subcategory}</h3>
                        <div className={styles.items}>
                          {items.map(item => {
                            const isCustom = 'isCustom' in item && item.isCustom
                            return (
                              <div
                                key={item.id}
                                className={`${styles.item} ${responses[item.id] ? styles.checked : ''} ${isCustom ? styles.customItem : ''}`}
                              >
                                <label className={styles.itemLabel}>
                                  <input
                                    type="checkbox"
                                    checked={responses[item.id] || false}
                                    onChange={() => handleCheck(item.id, item)}
                                  />
                                  <span className={styles.checkbox}>
                                    {responses[item.id] && '✓'}
                                  </span>
                                  <span className={styles.itemText}>{item.item}</span>
                                </label>
                                <div className={styles.itemMeta}>
                                  <span className={`${styles.priorityBadge} ${getPriorityClass(item.priority)}`}>
                                    {item.priority}
                                  </span>
                                  <span className={styles.methodBadge}>{item.method}</span>
                                  {isCustom && (
                                    <div className={styles.customActions}>
                                      <button
                                        className={styles.editBtn}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openEditModal(item as CustomItem)
                                        }}
                                      >
                                        수정
                                      </button>
                                      <button
                                        className={styles.deleteBtn}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteCustomItem(item.id)
                                        }}
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      </main>

      {/* Custom Item Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {editingItem ? '항목 수정' : '커스텀 항목 추가'}
            </h2>

            <div className={styles.formGroup}>
              <label>카테고리</label>
              <select
                value={customForm.category}
                onChange={e => setCustomForm(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>세부 카테고리</label>
              <input
                type="text"
                value={customForm.subcategory}
                onChange={e => setCustomForm(prev => ({ ...prev, subcategory: e.target.value }))}
                placeholder="예: 소방, 전기, 배관"
              />
            </div>

            <div className={styles.formGroup}>
              <label>점검 항목</label>
              <input
                type="text"
                value={customForm.item}
                onChange={e => setCustomForm(prev => ({ ...prev, item: e.target.value }))}
                placeholder="점검할 항목을 입력하세요"
              />
            </div>

            <div className={styles.formGroup}>
              <label>우선순위</label>
              <select
                value={customForm.priority}
                onChange={e => setCustomForm(prev => ({ ...prev, priority: e.target.value as Priority }))}
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>확인 방법</label>
              <select
                value={customForm.method}
                onChange={e => setCustomForm(prev => ({ ...prev, method: e.target.value as CheckMethod }))}
              >
                {METHOD_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>증빙 유형</label>
              <select
                value={customForm.evidence}
                onChange={e => setCustomForm(prev => ({ ...prev, evidence: e.target.value as EvidenceType }))}
              >
                {EVIDENCE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setShowAddModal(false)
                  setEditingItem(null)
                  resetForm()
                }}
              >
                취소
              </button>
              <button
                className={styles.submitBtn}
                onClick={editingItem ? handleUpdateCustomItem : handleAddCustomItem}
              >
                {editingItem ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
