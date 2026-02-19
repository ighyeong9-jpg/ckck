'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COST_FACTORS } from '@/types/costAnalysis'
import { calculateCost, formatKRW, type CostFactor } from '@/lib/utils/costCalculator'
import QuickActions from '@/components/ui/QuickActions'
import styles from './page.module.scss'

export default function CostAnalysisPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [baseCost, setBaseCost] = useState(0)
  const [analysisId, setAnalysisId] = useState<string | null>(null)

  // 요인별 데이터
  const [factors, setFactors] = useState<Record<string, { weight: number; factor: number }>>({
    complexity: { weight: 0.15, factor: 0 },
    timeline: { weight: 0.10, factor: 0 },
    material: { weight: 0.12, factor: 0 },
    labor: { weight: 0.08, factor: 0 },
    risk: { weight: 0.10, factor: 0 },
  })
  const [notes, setNotes] = useState('')

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 견적서 총액 가져오기 (Cb)
        const { data: quoteItems } = await supabase
          .from('quote_line_items')
          .select('quantity, unit_price')
          .eq('project_id', projectId)

        if (quoteItems && quoteItems.length > 0) {
          const subtotal = quoteItems.reduce(
            (sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)),
            0
          )
          setBaseCost(subtotal)
        }

        // 기존 비용분석 데이터
        const { data: analysis } = await supabase
          .from('cost_analysis')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle()

        if (analysis) {
          setAnalysisId(analysis.id)
          if (analysis.base_cost > 0) {
            setBaseCost(analysis.base_cost)
          }
          setFactors({
            complexity: { weight: Number(analysis.complexity_weight), factor: Number(analysis.complexity_factor) },
            timeline: { weight: Number(analysis.timeline_weight), factor: Number(analysis.timeline_factor) },
            material: { weight: Number(analysis.material_weight), factor: Number(analysis.material_factor) },
            labor: { weight: Number(analysis.labor_weight), factor: Number(analysis.labor_factor) },
            risk: { weight: Number(analysis.risk_weight), factor: Number(analysis.risk_factor) },
          })
          setNotes(analysis.notes || '')
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [projectId])

  // ΔC = Cb × (1 + Σ(Wi × Fi)) 계산 - costCalculator 유틸리티 사용
  const calculation = useMemo(() => {
    const costFactors: CostFactor[] = Object.entries(factors).map(([id, { weight, factor }]) => ({
      id,
      name: COST_FACTORS.find(cf => cf.id === id)?.name || id,
      description: COST_FACTORS.find(cf => cf.id === id)?.description || '',
      weight,
      factor,
    }))

    return calculateCost({ baseCost, factors: costFactors })
  }, [baseCost, factors])

  // 저장
  const handleSave = async () => {
    setSaving(true)
    try {
      const data = {
        project_id: projectId,
        base_cost: baseCost,
        complexity_weight: factors.complexity.weight,
        complexity_factor: factors.complexity.factor,
        timeline_weight: factors.timeline.weight,
        timeline_factor: factors.timeline.factor,
        material_weight: factors.material.weight,
        material_factor: factors.material.factor,
        labor_weight: factors.labor.weight,
        labor_factor: factors.labor.factor,
        risk_weight: factors.risk.weight,
        risk_factor: factors.risk.factor,
        adjustment_rate: calculation.adjustmentRate,
        adjusted_cost: calculation.adjustedCost,
        cost_difference: calculation.costDifference,
        notes,
        updated_at: new Date().toISOString(),
      }

      if (analysisId) {
        const { error } = await supabase
          .from('cost_analysis')
          .update(data)
          .eq('id', analysisId)

        if (error) throw error
      } else {
        const { data: newData, error } = await supabase
          .from('cost_analysis')
          .insert([data])
          .select()
          .single()

        if (error) throw error
        setAnalysisId(newData.id)
      }

      alert('저장되었습니다.')
    } catch (err: any) {
      console.error('Error saving:', err)
      alert(`저장 오류: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
  }

  // 요인 업데이트
  const updateFactor = (id: string, field: 'weight' | 'factor', value: number) => {
    setFactors(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
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
          { icon: '💵', label: '적정가 분석', description: '비용 적정성 분석', message: '비용 적정성 분석해줘' },
          { icon: '📉', label: '비용 예측', description: 'AI 비용 예측', message: '비용 예측해줘' },
          { icon: '📊', label: '예산 대비', description: '예산 대비 실제 지출', message: '예산 대비 실제 지출 비교해줘' },
        ]} />

        {/* Formula Card */}
        <section className={styles.formulaCard}>
          <div className={styles.formulaHeader}>
            <h2>비용 조정 공식</h2>
            <span className={styles.formula}>ΔC = Cb × (1 + Σ(Wi × Fi))</span>
          </div>
          <div className={styles.formulaDesc}>
            <p><strong>Cb</strong>: 기본비용 (견적서 총액)</p>
            <p><strong>Wi</strong>: 요인별 가중치</p>
            <p><strong>Fi</strong>: 요인별 영향도 (0~1)</p>
          </div>
        </section>

        {/* Base Cost */}
        <section className={styles.baseCostSection}>
          <div className={styles.baseCostCard}>
            <div className={styles.baseCostLabel}>
              <span>기본비용 (Cb)</span>
              <span className={styles.source}>견적서 공급가액 기준</span>
            </div>
            <div className={styles.baseCostValue}>{formatKRW(baseCost)}</div>
          </div>
        </section>

        {/* Factors */}
        <section className={styles.factorsSection}>
          <h2 className={styles.sectionTitle}>비용 영향 요인</h2>

          <div className={styles.factorsTable}>
            <div className={styles.tableHeader}>
              <span>요인</span>
              <span>설명</span>
              <span>가중치 (Wi)</span>
              <span>영향도 (Fi)</span>
              <span>기여도</span>
            </div>

            {COST_FACTORS.map((cf) => {
              const f = factors[cf.id]
              const contribution = f.weight * f.factor
              return (
                <div key={cf.id} className={styles.tableRow}>
                  <span className={styles.factorName}>{cf.name}</span>
                  <span className={styles.factorDesc}>{cf.description}</span>
                  <span className={styles.inputCell}>
                    <input
                      type="number"
                      value={f.weight}
                      onChange={(e) => updateFactor(cf.id, 'weight', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="1"
                      step="0.01"
                    />
                  </span>
                  <span className={styles.inputCell}>
                    <input
                      type="range"
                      value={f.factor}
                      onChange={(e) => updateFactor(cf.id, 'factor', parseFloat(e.target.value))}
                      min="0"
                      max="1"
                      step="0.1"
                      className={styles.slider}
                    />
                    <span className={styles.sliderValue}>{(f.factor * 100).toFixed(0)}%</span>
                  </span>
                  <span className={styles.contribution}>
                    +{(contribution * 100).toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Result */}
        <section className={styles.resultSection}>
          <h2 className={styles.sectionTitle}>계산 결과</h2>

          <div className={styles.resultGrid}>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>총 조정률</span>
              <span className={styles.resultValue}>
                +{(calculation.adjustmentRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>추가 비용</span>
              <span className={styles.resultValue}>
                +{formatKRW(calculation.costDifference)}
              </span>
            </div>
            <div className={`${styles.resultCard} ${styles.total}`}>
              <span className={styles.resultLabel}>최종 예상 비용</span>
              <span className={styles.resultValue}>
                {formatKRW(calculation.adjustedCost)}
              </span>
            </div>
          </div>

          <div className={styles.calculationBreakdown}>
            <p>
              {formatKRW(baseCost)} × (1 + {(calculation.adjustmentRate * 100).toFixed(1)}%)
              = <strong>{formatKRW(calculation.adjustedCost)}</strong>
            </p>
          </div>
        </section>

        {/* Notes */}
        <section className={styles.notesSection}>
          <h2 className={styles.sectionTitle}>비고</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="비용분석 관련 메모..."
            rows={3}
          />
        </section>

        {/* Actions */}
        <section className={styles.actions}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : '분석 결과 저장'}
          </button>
          <button
            className={styles.saveBtn}
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}
            onClick={() => {
              const btn = document.querySelector('[aria-label="AI 비서 체키"]') as HTMLButtonElement
              if (btn) btn.click()
            }}
          >
            🤖 AI 적정가 분석
          </button>
        </section>
      </main>
    </div>
  )
}
