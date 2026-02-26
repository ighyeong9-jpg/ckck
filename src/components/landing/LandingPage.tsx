'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './LandingPage.module.scss'

// ─── 카운터 훅 ────────────────────────────────────────────
function useCounter(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return value
}

// ─── Intersection Observer 훅 ─────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, inView }
}

// ─── 가격 데이터 ──────────────────────────────────────────
const B2C_PLANS = [
  {
    name: '기본 리포트',
    price: '99,000',
    unit: '건',
    desc: '단일 현장 분쟁 대응 패키지',
    features: ['현장 진단 리포트 1건', '증빙 패키지 생성', 'PDF 다운로드', '30일 보관'],
    cta: '지금 시작',
  },
  {
    name: '프리미엄',
    price: '199,000',
    unit: '건',
    desc: 'AI 인증서 + 법적 효력 강화',
    features: ['기본 리포트 전체 포함', 'AI 인증서 발급', 'Merkle 무결성 검증', '분쟁 대응 가이드', '1년 보관 + QR 공유'],
    cta: '프리미엄 시작',
    hot: true,
  },
]

const B2B_PLANS = [
  {
    name: '소규모',
    price: '39,000',
    unit: '월',
    desc: '인테리어 업체 / 소규모 팀',
    features: ['현장 5개', '팀원 3명', '모든 AI 기능', '이메일 지원'],
    cta: '무료로 시작',
  },
  {
    name: '기업',
    price: '129,000',
    unit: '월',
    desc: '대형 시공사 / 건설사',
    features: ['현장 무제한', '팀원 무제한', '전담 지원 담당자', 'API 액세스', 'SLA 99.9%'],
    cta: '영업팀 문의',
    hot: true,
  },
]

const STEPS = [
  {
    num: '01',
    icon: '🔍',
    label: '진단',
    title: '526개 체크항목 진단',
    desc: '13개 업종 맞춤 체크리스트. 카테고리별 완료율과 리스크 점수가 실시간으로 계산됩니다.',
  },
  {
    num: '02',
    icon: '📷',
    label: '증빙',
    title: '타임스탬프 증빙 패키지',
    desc: '사진·영수증·계약서를 업로드하면 SHA-256으로 해싱되어 변조 불가능한 증거로 잠깁니다.',
  },
  {
    num: '03',
    icon: '📄',
    label: 'PDF',
    title: 'AI 인증 리포트 원클릭',
    desc: 'AI가 4개 항목 25점씩 100점 만점으로 검증하고, 인증 번호가 부여된 공식 리포트를 생성합니다.',
  },
  {
    num: '04',
    icon: '🔗',
    label: '공유',
    title: 'QR·링크로 즉시 공유',
    desc: '분쟁 현장을 QR코드 하나로 공유. 상대방도 인증된 증거를 실시간으로 확인할 수 있습니다.',
  },
]

const STATS = [
  { value: 5400, suffix: '건+', label: '연간 인테리어 분쟁 신고', desc: '소비자원 기준' },
  { value: 62, suffix: '%', label: '미해결 비율', desc: '증거 부족이 주요 원인' },
  { value: 700, suffix: '만원', label: '평균 피해액', desc: '1건당 기준' },
]

interface LandingPageProps {
  isLoggedIn?: boolean
}

export default function LandingPage({ isLoggedIn = false }: LandingPageProps) {
  const [pricingTab, setPricingTab] = useState<'b2c' | 'b2b'>('b2c')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const statsRef = useInView(0.3)
  const riskRef = useInView(0.3)

  const stat0 = useCounter(STATS[0].value, 1600, statsRef.inView)
  const stat1 = useCounter(STATS[1].value, 1400, statsRef.inView)
  const stat2 = useCounter(STATS[2].value, 1800, statsRef.inView)
  const riskScore = useCounter(73, 2000, riskRef.inView)

  const statValues = [stat0, stat1, stat2]

  return (
    <div className={styles.page}>

      {/* ─── NAV ─────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.navLogo}>
            <span className={styles.logoMark}>체키</span>
            <span className={styles.logoSub}>CHECK-IN</span>
          </a>
          <div className={`${styles.navLinks} ${mobileMenuOpen ? styles.navOpen : ''}`}>
            <a href="#features">기능</a>
            <a href="#pricing">요금</a>
            {isLoggedIn ? (
              <a href="/projects" className={styles.navCta}>대시보드 →</a>
            ) : (
              <>
                <a href="/login" className={styles.navLogin}>로그인</a>
                <a href="/login" className={styles.navCta}>무료로 시작</a>
              </>
            )}
          </div>
          <button
            className={styles.hamburger}
            onClick={() => setMobileMenuOpen(p => !p)}
            aria-label="메뉴"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />
        <div className={styles.heroInner}>
          <div className={styles.heroEye}>공사 현장 분쟁 예방 플랫폼</div>
          <h1 className={styles.heroTitle}>
            공사 분쟁,<br />
            <span className={styles.heroAccent}>증거가 없어서</span><br />
            집니다
          </h1>
          <p className={styles.heroSub}>
            체키가 모든 기록을 타임스탬프로 잠급니다.<br />
            사진 한 장이 법정에서 증거가 됩니다.
          </p>
          <div className={styles.heroCtas}>
            <a href="/login" className={styles.heroBtn}>
              무료 진단 시작하기
              <span className={styles.heroBtnArrow}>→</span>
            </a>
            <a href="#features" className={styles.heroSecondary}>
              어떻게 작동하나요?
            </a>
          </div>
          <div className={styles.heroHint}>신용카드 불필요 · 5분이면 첫 현장 등록</div>

          {/* 플로팅 배지 */}
          <div className={styles.heroBadge1}>
            <span>🔒</span> SHA-256 증거 잠금
          </div>
          <div className={styles.heroBadge2}>
            <span>🤖</span> AI 검증 인증서
          </div>
        </div>
      </section>

      {/* ─── STATS ───────────────────────────────────────── */}
      <section className={styles.stats} ref={statsRef.ref}>
        <div className={styles.statsInner}>
          <p className={styles.statsEye}>왜 지금 기록이 필요한가</p>
          <div className={styles.statsGrid}>
            {STATS.map((s, i) => (
              <div key={i} className={styles.statCard}>
                <div className={styles.statValue}>
                  {statValues[i].toLocaleString()}{s.suffix}
                </div>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statDesc}>{s.desc}</div>
              </div>
            ))}
          </div>
          <p className={styles.statsCaption}>
            분쟁의 <strong>72%는 기록 부재</strong>가 원인입니다. 체키가 이 문제를 해결합니다.
          </p>
        </div>
      </section>

      {/* ─── FEATURES (4단계) ────────────────────────────── */}
      <section className={styles.features} id="features">
        <div className={styles.featuresInner}>
          <p className={styles.sectionEye}>어떻게 작동하나요</p>
          <h2 className={styles.sectionTitle}>
            진단부터 공유까지,<br />4단계로 완성
          </h2>
          <div className={styles.stepsGrid}>
            {STEPS.map((step, i) => (
              <div key={i} className={styles.stepCard}>
                <div className={styles.stepConnector} />
                <div className={styles.stepNum}>{step.num}</div>
                <div className={styles.stepIcon}>{step.icon}</div>
                <div className={styles.stepLabel}>{step.label}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── RISK PREVIEW ────────────────────────────────── */}
      <section className={styles.riskPreview} ref={riskRef.ref}>
        <div className={styles.riskInner}>
          <div className={styles.riskLeft}>
            <p className={styles.sectionEye}>실시간 리스크 분석</p>
            <h2 className={styles.sectionTitle}>
              현장 리스크 점수,<br />숫자로 확인하세요
            </h2>
            <p className={styles.riskDesc}>
              체키의 특허 공식 R = Fp×Wf + Oc×Wo + Ch×Wc으로 현장 위험도를 A~F 6등급으로 산출합니다.
              수치로 확인하면 발주처도 납득합니다.
            </p>
            <ul className={styles.riskFeatureList}>
              <li><span>✓</span> 13개 업종 × 526개 체크항목</li>
              <li><span>✓</span> 카테고리별 위험 분류 (안전/법규/품질/설비/마감)</li>
              <li><span>✓</span> AI GO/NO-GO 자동 판정</li>
            </ul>
          </div>
          <div className={styles.riskRight}>
            <div className={styles.riskGaugeWrap}>
              {/* SVG 게이지 */}
              <svg viewBox="0 0 200 120" className={styles.riskGaugeSvg}>
                {/* 배경 아크 */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14" strokeLinecap="round"
                />
                {/* 진행 아크 - 73/100 → 약 73% of 180deg */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="url(#riskGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(riskScore / 100) * 251.2} 251.2`}
                />
                <defs>
                  <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                {/* 점수 */}
                <text x="100" y="88" textAnchor="middle" fill="white" fontSize="32" fontWeight="800">
                  {riskScore}
                </text>
                <text x="100" y="108" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11">
                  MED 등급
                </text>
              </svg>
              {/* 등급 레이블 */}
              <div className={styles.riskGradeRow}>
                {['A', 'B', 'C', 'D', 'E', 'F'].map((g, i) => (
                  <span key={g} className={`${styles.riskGrade} ${i === 2 ? styles.riskGradeActive : ''}`}>{g}</span>
                ))}
              </div>
              {/* 경고 아이템 */}
              <div className={styles.riskWarnings}>
                <div className={styles.riskWarnItem}>
                  <span className={styles.riskWarnDot} style={{ background: '#ef4444' }} />
                  방수 시공 미확인 — 즉시 점검 필요
                </div>
                <div className={styles.riskWarnItem}>
                  <span className={styles.riskWarnDot} style={{ background: '#f59e0b' }} />
                  전기 안전 검사 일정 확인 요망
                </div>
                <div className={styles.riskWarnItem}>
                  <span className={styles.riskWarnDot} style={{ background: '#10b981' }} />
                  철거 완료 · 증빙 3건 등록됨
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────────── */}
      <section className={styles.pricing} id="pricing">
        <div className={styles.pricingInner}>
          <p className={styles.sectionEye}>요금 안내</p>
          <h2 className={styles.sectionTitle}>
            현장 규모에 맞게<br />선택하세요
          </h2>

          {/* B2C / B2B 탭 */}
          <div className={styles.pricingTabs}>
            <button
              className={`${styles.pricingTab} ${pricingTab === 'b2c' ? styles.pricingTabActive : ''}`}
              onClick={() => setPricingTab('b2c')}
            >
              건당 결제 <span>(개인·소비자)</span>
            </button>
            <button
              className={`${styles.pricingTab} ${pricingTab === 'b2b' ? styles.pricingTabActive : ''}`}
              onClick={() => setPricingTab('b2b')}
            >
              월 구독 <span>(업체·기업)</span>
            </button>
          </div>

          <div className={styles.plansGrid}>
            {(pricingTab === 'b2c' ? B2C_PLANS : B2B_PLANS).map((plan, i) => (
              <div key={i} className={`${styles.planCard} ${plan.hot ? styles.planHot : ''}`}>
                {plan.hot && <span className={styles.planHotBadge}>추천</span>}
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planDesc}>{plan.desc}</p>
                <div className={styles.planPrice}>
                  <span className={styles.planAmount}>{plan.price}원</span>
                  <span className={styles.planUnit}>/ {plan.unit}</span>
                </div>
                <ul className={styles.planFeatures}>
                  {plan.features.map((f, j) => (
                    <li key={j}><span>✓</span>{f}</li>
                  ))}
                </ul>
                <a href="/login" className={`${styles.planCta} ${plan.hot ? styles.planCtaHot : ''}`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
          <p className={styles.pricingNote}>
            {pricingTab === 'b2c'
              ? '* 건당 결제는 가입 없이도 이용 가능합니다.'
              : '* 월 구독은 최초 14일 무료 체험 후 자동 결제됩니다.'}
          </p>
        </div>
      </section>

      {/* ─── FINAL CTA ───────────────────────────────────── */}
      <section className={styles.finalCta}>
        <div className={styles.finalBg} aria-hidden />
        <div className={styles.finalInner}>
          <p className={styles.finalEye}>지금 시작하세요</p>
          <h2 className={styles.finalTitle}>
            분쟁이 생기고 나서는<br />
            <span className={styles.finalAccent}>늦습니다</span>
          </h2>
          <p className={styles.finalSub}>
            지금 기록을 시작하면 모든 증거가 자동으로 쌓입니다.<br />
            첫 현장 등록은 5분이면 충분합니다.
          </p>
          <a href="/login" className={styles.finalBtn}>
            무료 진단 시작하기 →
          </a>
          <p className={styles.finalHint}>신용카드 불필요 · 언제든 해지 가능</p>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>체키</span>
            <span className={styles.footerTagline}>현장 기록이 분쟁을 막는다</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="/login">로그인</a>
            <span>·</span>
            <a href="/login">회원가입</a>
            <span>·</span>
            <a href="#pricing">요금</a>
          </div>
          <p className={styles.footerCopy}>© 2025 Check-In. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
