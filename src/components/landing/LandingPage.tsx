'use client'

import Link from 'next/link'

interface LandingPageProps {
  isLoggedIn?: boolean
}

const lawItems = [
  { no: '01', title: '산업안전보건법', desc: '제6조·제29조·제36조·제38조' },
  { no: '02', title: '중대재해처벌법', desc: '시행령 제4조·제5조' },
  { no: '03', title: '건설기술진흥법', desc: '제60조·제62조 스마트안전' },
  { no: '04', title: '소방시설법', desc: '제7조·제9조·제12조·제20조' },
  { no: '05', title: '전기안전관리법', desc: '제12조·제15조·제22조' },
  { no: '06', title: '석면안전관리법', desc: '제28조·제30조 해체관리' },
  { no: '07', title: '폐기물관리법', desc: '제13조 분리보관·올바로' },
  { no: '08', title: '건설산업기본법', desc: '제28조 하자담보책임' },
  { no: '09', title: '민법', desc: '제580조·제667조 담보책임' },
  { no: '10', title: '근로기준법', desc: '임금 지급 의무' },
  { no: '11', title: '건축법', desc: '사용승인 기준' },
  { no: '12', title: '전자서명법', desc: '전자문서 법적 효력' },
]

const problems = [
  {
    no: '01',
    badge: '기록 관리 원인 1위',
    title: '말로만 한 합의',
    desc: '"구두로 했잖아요" — 계약 변경을 기록하지 않으면 법정에서 아무 소용이 없습니다.',
  },
  {
    no: '02',
    badge: '기록 관리 원인 2위',
    title: '시공 기록 없는 사진',
    desc: '날짜, 위치, 서명 없는 사진은 법적 기록력이 없습니다. 타임스탬프가 전부입니다.',
  },
  {
    no: '03',
    badge: '기록 관리 원인 3위',
    title: '하자담보 기간 미기록',
    desc: '건산법 별표4 기준 하자담보기간을 놓치면 손해배상을 청구할 수도, 받을 수도 없습니다.',
  },
]

const solutions = [
  { icon: '📸', tag: 'AI 자동', title: '사진 한 장으로 안전 현황', desc: '현장 사진을 올리면 AI가 법령 기준으로 즉시 확인. 법적 시공 기록으로 자동 잠금.' },
  { icon: '📋', tag: '특허 기술', title: '리스크 점수 실시간 계산', desc: '특허 공식 R = Fp×Wf + Oc×Wo + Ch×Wc로 기록 관리 확률을 수치화합니다.' },
  { icon: '🛡️', tag: '법령 자동', title: '하자담보 자동 등록', desc: '공종 완료 시 건산법 기준 담보기간 자동 계산. 만료 30일 전 경고 알림.' },
  { icon: '⚖️', tag: '증빙 패키지', title: '법정용 시공 기록 패키지', desc: 'SHA-256 Merkle Tree로 무결성 보장. 변호사가 바로 쓸 수 있는 형식.' },
]

const pricingPlans = [
  { name: 'Lite', price: '30,000', period: '월', capacity: '5~10인', features: ['현장 1개', '체크리스트 + 출역관리', 'QR 출역 체크인', '오프라인 모드', '사진 100장/월'], cta: '무료 시작', featured: false },
  { name: 'Standard', price: '50,000', period: '월', capacity: '10~30인', badge: '가장 인기', features: ['현장 3개', '5종 세트 전체', 'TBM 연동', 'PDF 리포트', '팀원 30명'], cta: '14일 무료체험', featured: true },
  { name: 'Pro', price: '별도 문의', period: '', capacity: '30인 이상', features: ['현장 무제한', 'API 연동', '커스텀 체크리스트', '전담 매니저', 'AI 법규 비서'], cta: '상담 신청', featured: false },
]

const competitorAdvantages = [
  {
    icon: '🏗',
    title: '건설 공종 특화 DB',
    desc: '기존 안전관리 솔루션은 전부 범용입니다. 체크인만 건설 현장 전용 체크리스트와 공종별 DB를 제공합니다.',
    tag: '업계 유일',
  },
  {
    icon: '📱',
    title: 'QR 출역 체크인',
    desc: '현장 입구 QR/NFC 스캔으로 출역 관리. 실시간 인력 현황 파악까지 한 번에.',
    tag: '업계 유일',
  },
  {
    icon: '📡',
    title: '오프라인 모드',
    desc: '지하, 산간, 통신 불가 현장에서도 작동. 네트워크 복구 시 자동 동기화.',
    tag: '업계 유일',
  },
]

export default function LandingPage({ isLoggedIn }: LandingPageProps) {
  return (
    <div className="font-sans antialiased">
      {/* ──── HERO ──── */}
      <section className="min-h-screen bg-hero-gradient blueprint relative overflow-hidden flex items-center">
        <div
          className="absolute w-[600px] h-[600px] rounded-full pointer-events-none top-1/2 -translate-y-1/2 right-[5%]"
          style={{ background: 'radial-gradient(circle, rgba(232,101,26,0.18) 0%, transparent 70%)' }}
        />
        <div className="max-w-[1280px] mx-auto px-8 md:px-14 py-20 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* LEFT */}
          <div className="fade-up">
            <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-bold tracking-[0.06em] px-3.5 py-1.5 rounded-full mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              🏗 특허 등록 확정 · 세계 최초 AI 건설 기록 관리 예방
            </div>
            <h1 className="text-hero text-white mb-6">
              공사 기록 관리,<br />이제{' '}
              <em className="not-italic text-orange-500" style={{ textShadow: '0 0 40px rgba(232,101,26,0.5)' }}>
                체크인
              </em>가<br />막습니다
            </h1>
            <p className="text-[16px] text-white/60 max-w-[480px] leading-[1.8] mb-10">
              사진 한 장이 법적 시공 기록이 됩니다. AI가 실시간으로 기록 관리 리스크를 계산하고,
              하자담보기간을 자동으로 관리합니다.
            </p>
            <div className="flex flex-wrap gap-3 mb-12">
              <Link
                href={isLoggedIn ? '/dashboard' : '/login'}
                className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-xl text-[15px] font-bold text-white bg-orange-500 shadow-orange transition-all duration-300 hover:bg-orange-400 hover:-translate-y-1"
              >
                무료로 시작하기 →
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-xl text-[15px] font-semibold text-white/80 bg-white/[0.06] border border-white/[0.15] transition-all duration-200 hover:bg-white/10 hover:-translate-y-0.5"
              >
                데모 보기 ▶
              </Link>
            </div>
            <div className="flex flex-wrap gap-6">
              {['🔒 특허 3건 등록', '⚖️ 법령 12개 자동', '🛡️ 기록 관리 예방 보장'].map((t) => (
                <div key={t} className="flex items-center gap-2 text-white/40 text-xs font-medium">{t}</div>
              ))}
            </div>
          </div>

          {/* RIGHT — 프리뷰 */}
          <div className="hidden lg:block">
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_32px_80px_rgba(0,0,0,.5)] animate-float">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-bold text-white/90">강남 카페 인테리어</div>
                  <div className="text-[10px] text-white/35 mt-0.5">리스크 분석 · 실시간</div>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-red-500 text-white">위험</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[{ label: '리스크', value: '73', color: 'text-red-400' }, { label: '진행률', value: '68%', color: 'text-orange-400' }, { label: '이슈', value: '4건', color: 'text-white' }].map((kpi) => (
                  <div key={kpi.label} className="bg-white/[0.06] rounded-xl p-3 text-center">
                    <div className={`text-xl font-black ${kpi.color}`}>{kpi.value}</div>
                    <div className="text-[9px] text-white/35 mt-0.5">{kpi.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-red-500/15 border border-red-500/25 rounded-lg px-3 py-2 mb-3">
                <div className="text-[11px] text-red-400 font-bold">⚠️ 기록 관리 징후 감지 — 즉시 증빙 보강</div>
              </div>
              <div className="space-y-1.5">
                {[{ label: '방수', pct: 85, color: 'bg-green-500' }, { label: '타일', pct: 45, color: 'bg-amber-500' }, { label: '전기', pct: 20, color: 'bg-red-500' }].map((bar) => (
                  <div key={bar.label} className="flex items-center gap-2">
                    <div className="text-[9px] text-white/40 w-6 flex-shrink-0">{bar.label}</div>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.pct}%` }} />
                    </div>
                    <div className="text-[9px] text-white/40 w-6 text-right">{bar.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── STATS STRIP ──── */}
      <section className="bg-navy-950 border-y border-white/[0.06] py-10">
        <div className="max-w-[1280px] mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[{ num: '12', label: '건설 법령 자동 적용' }, { num: '526', label: '체크리스트 항목' }, { num: '3', label: '특허 등록 확정' }, { num: '700만', label: '평균 기록 관리 비용' }].map((stat) => (
            <div key={stat.label}>
              <div className="font-mono text-[32px] font-black text-orange-500 leading-none">{stat.num}</div>
              <div className="text-xs text-white/35 mt-1.5 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ──── PROBLEM ──── */}
      <section className="bg-white py-24 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block text-[11px] font-bold tracking-[0.06em] text-orange-500 bg-orange-100 px-3.5 py-1.5 rounded-full mb-4">왜 기록 관리이 생기나요?</div>
            <h2 className="text-heading text-navy-800 mb-3">현장에서 매일 일어나는 3가지 실수</h2>
            <p className="text-base text-gray-500 leading-[1.8] max-w-[560px] mx-auto">인테리어 기록 관리의 90%는 예방 가능했습니다.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {problems.map((p) => (
              <div key={p.no} className="bg-white border border-gray-200 rounded-xl p-6 shadow-card group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="font-mono text-[44px] font-bold text-red-500/10 leading-none mb-3">{p.no}</div>
                <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-500 mb-3">{p.badge}</span>
                <h3 className="text-[17px] font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-[1.7]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── SOLUTION ──── */}
      <section className="bg-gray-50 py-24 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block text-[11px] font-bold tracking-[0.06em] text-orange-500 bg-orange-100 px-3.5 py-1.5 rounded-full mb-4">체크인가 해결합니다</div>
            <h2 className="text-heading text-navy-800 mb-3">4가지 핵심 기능</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {solutions.map((s, i) => (
              <div key={s.title} className="bg-white border border-gray-200 rounded-xl p-6 shadow-card relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-navy-800 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="w-11 h-11 rounded-xl bg-navy-100 flex items-center justify-center text-2xl mb-4">{s.icon}</div>
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy-100 text-navy-700 mb-2">{s.tag}</span>
                <h3 className="text-[15px] font-bold text-gray-900 mb-2 leading-tight">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-[1.7]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── LAW SECTION ──── */}
      <section className="bg-navy-800 blueprint py-24 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.06em] text-orange-400 bg-orange-500/15 border border-orange-500/30 px-3.5 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              자동 적용 법령
            </div>
            <h2 className="text-heading text-white mb-3">12개 법령 자동 적용</h2>
            <p className="text-base text-white/50 max-w-[480px] mx-auto">건설·인테리어 관련 핵심 법령을 체크인가 자동으로 적용합니다.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {lawItems.map((law, i) => (
              <div key={law.no} className="bg-white/[0.06] border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-orange-500/30 transition-all duration-200 cursor-pointer fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="font-mono text-orange-500 text-[10px] tracking-widest mb-1.5">{law.no}</div>
                <div className="text-sm font-bold text-white leading-tight mb-1">{law.title}</div>
                <div className="text-[11px] text-white/40">{law.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── PRICING ──── */}
      <section className="bg-white py-24 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block text-[11px] font-bold tracking-[0.06em] text-orange-500 bg-orange-100 px-3.5 py-1.5 rounded-full mb-4">요금제</div>
            <h2 className="text-heading text-navy-800 mb-3">현장 규모에 맞게 선택</h2>
            <p className="text-sm text-gray-400">산안비로 처리 가능 → 현장에서 &quot;공짜&quot;</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start max-w-[960px] mx-auto">
            {pricingPlans.map((plan) => (
              <div key={plan.name} className={['rounded-xl p-6 relative', plan.featured ? 'bg-gradient-to-br from-navy-800 to-navy-700 border border-white/[0.08] text-white shadow-navy scale-[1.04]' : 'bg-white border border-gray-200 text-gray-900 shadow-card'].join(' ')}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black text-white bg-orange-500 px-3 py-1 rounded-full whitespace-nowrap">{plan.badge}</div>
                )}
                <div className={`text-xs font-bold mb-1 ${plan.featured ? 'text-orange-400' : 'text-navy-700'}`}>{plan.name}</div>
                <div className={`text-[10px] font-semibold mb-2 ${plan.featured ? 'text-white/50' : 'text-blue-500'}`}>{plan.capacity}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-[32px] font-black leading-none ${plan.featured ? 'text-white' : 'text-navy-800'}`}>{plan.price.includes('문의') ? '문의' : `₩${plan.price}`}</span>
                  {plan.period && <span className={`text-sm ${plan.featured ? 'text-white/50' : 'text-gray-400'}`}>/{plan.period}</span>}
                </div>
                <ul className="mt-4 mb-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className={`text-sm flex items-center gap-2 ${plan.featured ? 'text-white/80' : 'text-gray-600'}`}>
                      <span className={`text-xs ${plan.featured ? 'text-orange-400' : 'text-go'}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={['block text-center py-2.5 rounded-lg text-sm font-bold transition-all duration-200', plan.featured ? 'bg-orange-500 text-white hover:bg-orange-400' : 'border-[1.5px] border-navy-800 text-navy-800 hover:bg-navy-100'].join(' ')}>{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── COMPETITOR COMPARISON ──── */}
      <section className="bg-gray-50 py-24 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block text-[11px] font-bold tracking-[0.06em] text-orange-500 bg-orange-100 px-3.5 py-1.5 rounded-full mb-4">왜 체크인인가요?</div>
            <h2 className="text-heading text-navy-800 mb-3">체크인만의 차별점</h2>
            <p className="text-sm text-gray-400">기존 솔루션에 없던 3가지, 체크인가 처음 만들었습니다</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {competitorAdvantages.map((adv, i) => (
              <div key={adv.title} className="bg-white border border-gray-200 rounded-xl p-6 shadow-card group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-navy-800 to-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="w-12 h-12 rounded-xl bg-navy-100 flex items-center justify-center text-2xl mb-4">{adv.icon}</div>
                <h3 className="text-[17px] font-bold text-gray-900 mb-2">{adv.title}</h3>
                <p className="text-sm text-gray-500 leading-[1.7] mb-3">{adv.desc}</p>
                <div className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full inline-block">★ {adv.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── CTA BOTTOM ──── */}
      <section className="bg-cta-gradient py-20 px-8 text-center">
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-[40px] font-black text-white mb-4 leading-tight">지금 바로 무료로 시작하세요</h2>
          <p className="text-white/70 text-base mb-8">설치 없이, 카드 등록 없이. 지금 바로 현장을 보호하세요.</p>
          <Link href="/login" className="inline-flex items-center justify-center gap-2 h-[52px] px-10 rounded-xl text-[15px] font-extrabold text-orange-500 bg-white shadow-xl hover:-translate-y-0.5 hover:scale-[1.02] transition-all duration-200">
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="bg-navy-950 py-8 px-8 text-center border-t border-white/[0.05]">
        <div className="text-[18px] font-black text-white mb-1">체<span className="text-orange-500">키</span></div>
        <div className="text-xs text-white/25">© 2026 Check-In. 건설 기록 관리 예방 플랫폼. 특허 출원 중.</div>
      </footer>
    </div>
  )
}
