'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.scss'

interface FireLawCheck {
  id: string
  status: 'compliant' | 'violated' | 'not_applicable' | 'pending'
  details: Record<string, unknown>
  checked_at: string
  laws: {
    code: string
    name: string
    article: string
    title: string
    description: string
    violation_action: string
    risk_weight: number
  }
}

interface FireChecklist {
  category: string
  label: string
  items: { id: string; item: string; checked: boolean }[]
}

const FIRE_CATEGORIES = [
  { key: 'fire_facility',    label: '소방시설',    icon: '🧯' },
  { key: 'fire_prevention',  label: '화재예방',    icon: '🚧' },
  { key: 'fire_escape',      label: '방화/피난',   icon: '🚪' },
  { key: 'fire_certificate', label: '소방완비증명', icon: '📋' },
]

const FIRE_LAW_CODES = ['FIRE_FACILITY', 'FIRE_PREVENTION', 'SERIOUS_ACCIDENT', 'BUILDING_FIRE', 'MULTI_USE']

const STATUS_CONFIG = {
  compliant:      { icon: '✅', label: '충족',   color: '#10b981' },
  violated:       { icon: '⚠️', label: '미충족', color: '#ef4444' },
  not_applicable: { icon: '➖', label: '해당없음', color: '#6b7280' },
  pending:        { icon: '🔍', label: '확인필요', color: '#f59e0b' },
}

function FireScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f97316' : '#ef4444'
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className={styles.gaugeWrap}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="65" y="60" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="900">{score}</text>
        <text x="65" y="78" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">/ 100</text>
      </svg>
      <div className={styles.gaugeLabel} style={{ color }}>
        {score >= 80 ? '소방 안전' : score >= 60 ? '주의 필요' : '즉시 조치 필요'}
      </div>
    </div>
  )
}

export default function FireSafetyPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  const [fireLawChecks, setFireLawChecks] = useState<FireLawCheck[]>([])
  const [checklists, setChecklists] = useState<FireChecklist[]>([])
  const [activeTab, setActiveTab] = useState('fire_facility')
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedLaw, setExpandedLaw] = useState<string | null>(null)
  const [accordionStep, setAccordionStep] = useState<number | null>(null)

  // 소방 안전 점수 계산
  const applicableLaws = fireLawChecks.filter(c => c.status !== 'not_applicable')
  const compliantLaws = fireLawChecks.filter(c => c.status === 'compliant')
  const fireScore = applicableLaws.length > 0
    ? Math.round((compliantLaws.length / applicableLaws.length) * 100)
    : 0

  // 소방 체크리스트 요약
  const totalItems = checklists.reduce((sum, cl) => sum + cl.items.length, 0)
  const checkedItems = checklists.reduce((sum, cl) => sum + cl.items.filter(i => i.checked).length, 0)

  // 소방 증빙 사진 카운트
  const [evidenceCount, setEvidenceCount] = useState(0)

  async function load() {
    setLoading(true)
    try {
      // 소방 법령 체크 결과
      const res = await fetch(`/api/projects/${projectId}/law-checks`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          const fire = (json.data as FireLawCheck[]).filter(c =>
            FIRE_LAW_CODES.includes(c.laws?.code)
          )
          setFireLawChecks(fire)
        }
      }

      // 소방 체크리스트 항목
      const clData: FireChecklist[] = []
      for (const cat of FIRE_CATEGORIES) {
        const { data: responses } = await supabase
          .from('diagnostic_responses')
          .select('id, item_id, checked')
          .eq('project_id', projectId)
          .eq('category', cat.key)
        clData.push({
          category: cat.key,
          label: cat.label,
          items: (responses ?? []).map(r => ({
            id: r.item_id ?? r.id,
            item: r.item_id ?? r.id,
            checked: r.checked,
          })),
        })
      }
      setChecklists(clData)

      // 소방 증빙 사진 카운트
      const { count } = await supabase
        .from('evidence_files')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('category', ['소방', 'fire'])
      setEvidenceCount(count ?? 0)
    } finally {
      setLoading(false)
    }
  }

  async function runFireCheck() {
    setRunning(true)
    try {
      await fetch(`/api/projects/${projectId}/law-check`, { method: 'POST' })
      await load()
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const activeChecklist = checklists.find(cl => cl.category === activeTab)

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          {[1, 2, 3].map(i => <div key={i} className={styles.skeleton} />)}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* ── 상단 헤더 (다크 레드 그라데이션) ── */}
      <div className={styles.heroSection}>
        <div className={styles.heroLeft}>
          <div className={styles.heroTag}>🔥 소방 안전 전용 페이지</div>
          <h2 className={styles.heroTitle}>소방 안전 종합 현황</h2>
          <p className={styles.heroSub}>
            소방은 분쟁 예방이 아닌 생명 보호입니다. 중대재해처벌법 시행 이후<br />
            소방 미비는 사업주 형사처벌 대상입니다.
          </p>
          <button
            className={styles.checkBtn}
            onClick={runFireCheck}
            disabled={running}
          >
            {running ? <><span className={styles.spinner} /> 점검 중...</> : '🔥 소방 법령 재점검'}
          </button>
        </div>

        <div className={styles.heroRight}>
          <FireScoreGauge score={fireScore} />
        </div>
      </div>

      {/* ── 요약 카드 3개 ── */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>⚖️</div>
          <div className={styles.summaryTitle}>소방 법령 충족</div>
          <div className={styles.summaryValue}>
            <span style={{ color: '#10b981' }}>{compliantLaws.length}</span>
            <span className={styles.summaryTotal}> / {applicableLaws.length}개</span>
          </div>
          {fireLawChecks.filter(c => c.status === 'violated').length > 0 && (
            <div className={styles.summaryWarn}>
              {fireLawChecks.filter(c => c.status === 'violated').length}개 미충족
            </div>
          )}
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📋</div>
          <div className={styles.summaryTitle}>소방 체크리스트</div>
          <div className={styles.summaryValue}>
            <span style={{ color: '#f97316' }}>{checkedItems}</span>
            <span className={styles.summaryTotal}> / {totalItems}개</span>
          </div>
          <div className={styles.summaryProgress}>
            <div
              className={styles.summaryProgressBar}
              style={{
                width: totalItems > 0 ? `${Math.round(checkedItems / totalItems * 100)}%` : '0%',
                backgroundColor: totalItems > 0 && checkedItems / totalItems >= 0.8 ? '#10b981' : '#f97316',
              }}
            />
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📷</div>
          <div className={styles.summaryTitle}>소방 증빙 사진</div>
          <div className={styles.summaryValue}>
            <span style={{ color: evidenceCount > 0 ? '#10b981' : '#ef4444' }}>{evidenceCount}</span>
            <span className={styles.summaryTotal}>장</span>
          </div>
          {evidenceCount === 0 && (
            <div className={styles.summaryWarn}>사진 촬영 권장</div>
          )}
        </div>
      </div>

      {/* ── 소방 법령 5개 카드 ── */}
      <div className={styles.sectionTitle}>소방 법령 5개 상세</div>
      <div className={styles.lawList}>
        {fireLawChecks.length === 0 ? (
          <div className={styles.emptyLaw}>
            <p>소방 법령 점검 이력이 없습니다. 위 버튼을 눌러 점검을 시작하세요.</p>
          </div>
        ) : (
          fireLawChecks.map((check) => {
            const cfg = STATUS_CONFIG[check.status]
            const isExpanded = expandedLaw === check.id
            const isSeriousAccident = check.laws.code === 'SERIOUS_ACCIDENT'

            return (
              <div
                key={check.id}
                className={`${styles.lawCard} ${isSeriousAccident ? styles.lawCardCritical : ''} ${check.status === 'violated' ? styles.lawCardViolated : ''}`}
                onClick={() => setExpandedLaw(isExpanded ? null : check.id)}
              >
                <div className={styles.lawCardRow}>
                  <span className={styles.lawStatusIcon}>{cfg.icon}</span>
                  <div className={styles.lawCardMain}>
                    <div className={styles.lawCardTitle}>
                      {isSeriousAccident && (
                        <span className={styles.criminalBadge}>⚖️ 형사처벌</span>
                      )}
                      <span className={styles.lawCardName}>{check.laws.name}</span>
                      <span className={styles.lawCardArticle}>{check.laws.article}</span>
                    </div>
                    <div className={styles.lawCardSub}>{check.laws.title}</div>
                    {check.status === 'violated' && !isExpanded && (
                      <div className={styles.lawViolationHint}>{check.laws.violation_action}</div>
                    )}
                  </div>
                  <div className={styles.lawCardRight}>
                    <span className={styles.lawStatusBadge} style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.lawDetail} onClick={e => e.stopPropagation()}>
                    <p className={styles.lawDetailDesc}>{check.laws.description}</p>
                    {check.status === 'violated' && (
                      <div className={styles.actionBox}>
                        <div className={styles.actionTitle}>🔧 권장 조치</div>
                        <p className={styles.actionText}>{check.laws.violation_action}</p>
                      </div>
                    )}
                    {isSeriousAccident && (
                      <div className={styles.criminalWarning}>
                        ⚖️ 형사처벌 대상 — 사업주 1년 이상 징역 또는 10억 이하 벌금
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── 하단 2열 ── */}
      <div className={styles.bottomGrid}>
        {/* 좌측: 소방 체크리스트 */}
        <div className={styles.checklistSection}>
          <div className={styles.sectionTitle}>소방 체크리스트</div>

          {/* 카테고리 탭 */}
          <div className={styles.catTabs}>
            {FIRE_CATEGORIES.map(cat => {
              const cl = checklists.find(c => c.category === cat.key)
              const count = cl?.items.length ?? 0
              const checked = cl?.items.filter(i => i.checked).length ?? 0
              return (
                <button
                  key={cat.key}
                  className={`${styles.catTab} ${activeTab === cat.key ? styles.catTabActive : ''}`}
                  onClick={() => setActiveTab(cat.key)}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span className={styles.catTabPct}>{Math.round(checked / count * 100)}%</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 체크리스트 항목 */}
          <div className={styles.checklistItems}>
            {!activeChecklist || activeChecklist.items.length === 0 ? (
              <div className={styles.emptyChecklist}>
                <p>이 카테고리의 소방 체크리스트가 없습니다.</p>
                <p className={styles.emptyHint}>진단 탭에서 소방 체크리스트를 작성하세요.</p>
              </div>
            ) : (
              <>
                <div className={styles.catProgress}>
                  <div className={styles.catProgressLabel}>
                    {activeChecklist.items.filter(i => i.checked).length} / {activeChecklist.items.length}개 완료
                  </div>
                  <div className={styles.catProgressBar}>
                    <div
                      className={styles.catProgressFill}
                      style={{
                        width: `${Math.round(activeChecklist.items.filter(i => i.checked).length / activeChecklist.items.length * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                {activeChecklist.items.map(item => (
                  <div key={item.id} className={`${styles.checkItem} ${item.checked ? styles.checkItemDone : ''}`}>
                    <span className={styles.checkMark}>{item.checked ? '✅' : '⬜'}</span>
                    <span className={styles.checkItemText}>{item.item}</span>
                    {!item.checked && (
                      <span className={styles.photoHint}>📷</span>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 우측: 소방완비증명서 발급 가이드 */}
        <div className={styles.guideSection}>
          <div className={styles.sectionTitle}>소방완비증명서 발급 가이드</div>
          <div className={styles.accordion}>
            {[
              {
                step: 1,
                title: 'Step 1: 소방시설 설치',
                content: '프로젝트 유형에 맞는 소방시설을 설치하세요. 소방시설 체크리스트의 fire_facility 항목을 모두 완료해야 합니다.',
              },
              {
                step: 2,
                title: 'Step 2: 완공 검사 신청',
                content: '관할 소방서에 소방시설 완공 검사를 신청합니다. 필요 서류: 소방시설 설치 신고서, 도면, 시공 사진. 체크인의 증빙 패키지를 사용하면 필요 서류를 자동으로 정리할 수 있습니다.',
              },
              {
                step: 3,
                title: 'Step 3: 현장 점검',
                content: '소방서 직원이 현장을 방문하여 소방시설 설치 상태를 점검합니다. 체크리스트의 모든 항목이 완료되어 있어야 합니다.',
              },
              {
                step: 4,
                title: 'Step 4: 증명서 발급',
                content: '점검 통과 시 소방완비증명서가 발급됩니다. 다중이용업소(카페, 식당 등)는 이 증명서 없이 영업 신고가 불가합니다.',
              },
              {
                step: 5,
                title: 'Step 5: 정기 점검',
                content: '발급 후에도 정기 점검 의무가 있습니다. 체크인이 점검 주기를 자동으로 알려드립니다.',
              },
            ].map(({ step, title, content }) => (
              <div key={step} className={styles.accordionItem}>
                <button
                  className={`${styles.accordionBtn} ${accordionStep === step ? styles.accordionBtnOpen : ''}`}
                  onClick={() => setAccordionStep(accordionStep === step ? null : step)}
                >
                  <span className={styles.accordionStep}>{step}</span>
                  <span className={styles.accordionTitle}>{title}</span>
                  <span className={styles.accordionArrow}>{accordionStep === step ? '▲' : '▼'}</span>
                </button>
                {accordionStep === step && (
                  <div className={styles.accordionContent}>{content}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
