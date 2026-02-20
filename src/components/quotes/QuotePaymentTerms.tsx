'use client'

import { useState, useEffect } from 'react'
import styles from './QuotePaymentTerms.module.scss'

interface PaymentTerm {
  stage: string
  ratio: number
  note: string
}

const DEFAULT_TERMS: PaymentTerm[] = [
  { stage: '계약금', ratio: 10, note: '계약 당일' },
  { stage: '착공금', ratio: 30, note: '공사 시작일' },
  { stage: '중도금', ratio: 30, note: '공사 50% 완료' },
  { stage: '잔금', ratio: 30, note: '완공 및 인수인계' },
]

const SAFE_CONTRACT_TERM: PaymentTerm[] = [
  { stage: '계약금', ratio: 10, note: '계약 당일 (최대 10%)' },
  { stage: '착공금', ratio: 30, note: '착공일' },
  { stage: '중도금', ratio: 30, note: '50% 공정 완료' },
  { stage: '잔금', ratio: 30, note: '완공 후 검수 통과' },
]

export default function QuotePaymentTerms() {
  const [terms, setTerms] = useState<PaymentTerm[]>(DEFAULT_TERMS)
  const [totalBudget, setTotalBudget] = useState<number>(0)
  const [warnings, setWarnings] = useState<string[]>([])

  const totalRatio = terms.reduce((sum, t) => sum + t.ratio, 0)

  useEffect(() => {
    const ws: string[] = []
    const contractTerm = terms.find(t => t.stage === '계약금')
    if (contractTerm && contractTerm.ratio > 10) {
      ws.push(`⚠️ 계약금이 ${contractTerm.ratio}%입니다. 10% 초과 시 업체 파산·먹튀 위험이 높아집니다.`)
    }
    const upfrontTotal = terms
      .filter(t => ['계약금', '착공금'].includes(t.stage))
      .reduce((sum, t) => sum + t.ratio, 0)
    if (upfrontTotal > 50) {
      ws.push(`⚠️ 계약금+착공금 합계가 ${upfrontTotal}%입니다. 50% 초과 시 주의하세요.`)
    }
    if (totalRatio !== 100) {
      ws.push(`합계가 ${totalRatio}%입니다. 100%가 되도록 조정해주세요.`)
    }
    setWarnings(ws)
  }, [terms, totalRatio])

  const updateRatio = (index: number, value: number) => {
    setTerms(prev => prev.map((t, i) => i === index ? { ...t, ratio: value } : t))
  }

  const applyTemplate = () => {
    setTerms(SAFE_CONTRACT_TERM)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>💰 대금 지급 조건 가이드</h3>
        <button className={styles.templateBtn} onClick={applyTemplate}>
          안전 계약 적용
        </button>
      </div>

      {/* 예산 입력 */}
      <div className={styles.budgetRow}>
        <label className={styles.budgetLabel}>총 예산 (만원)</label>
        <input
          type="number"
          className={styles.budgetInput}
          placeholder="예: 3000"
          value={totalBudget || ''}
          onChange={e => setTotalBudget(Number(e.target.value))}
          min={0}
        />
      </div>

      {/* 지급 단계 */}
      <div className={styles.terms}>
        {terms.map((term, i) => (
          <div key={i} className={styles.termRow}>
            <div className={styles.termInfo}>
              <span className={styles.termStage}>{term.stage}</span>
              <span className={styles.termNote}>{term.note}</span>
            </div>
            <div className={styles.termRight}>
              <input
                type="number"
                className={styles.ratioInput}
                value={term.ratio}
                onChange={e => updateRatio(i, Number(e.target.value))}
                min={0}
                max={100}
              />
              <span className={styles.ratioUnit}>%</span>
              {totalBudget > 0 && (
                <span className={styles.ratioAmount}>
                  {Math.round(totalBudget * term.ratio / 100).toLocaleString()}만원
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 합계 */}
      <div className={`${styles.totalRow} ${totalRatio === 100 ? styles.totalOk : styles.totalError}`}>
        <span>합계</span>
        <span>{totalRatio}%</span>
      </div>

      {/* 경고 */}
      {warnings.length > 0 && (
        <div className={styles.warnings}>
          {warnings.map((w, i) => (
            <p key={i} className={styles.warning}>{w}</p>
          ))}
        </div>
      )}

      {/* 안전 계약 팁 */}
      <div className={styles.tips}>
        <p className={styles.tipTitle}>✅ 안전한 계약 기준 (표준)</p>
        <ul className={styles.tipList}>
          <li>계약금: 최대 10% (법적 상한 없으나 관행적 기준)</li>
          <li>선급금 총합: 50% 이내 권장</li>
          <li>잔금: 완공 검수 후 지급 (하자 협의 후)</li>
          <li>특수 상황: 수입 자재 사전 구매 시 별도 협의</li>
        </ul>
      </div>
    </div>
  )
}
