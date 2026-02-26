'use client'

import Link from 'next/link'
import LandingNav from './LandingNav'

interface LandingPageProps {
  isLoggedIn?: boolean
}

const lawItems = [
  { no: '01', title: '건설산업기본법', desc: '제28조 하자담보책임', fire: false },
  { no: '02', title: '민법 제667조', desc: '수급인의 담보책임', fire: false },
  { no: '03', title: '건산법 시행령', desc: '별표4 하자담보기간', fire: false },
  { no: '04', title: '공정거래법', desc: '하도급 부당감액 금지', fire: false },
  { no: '05', title: '민법 제580조', desc: '매도인의 하자담보', fire: false },
  { no: '06', title: '건설분쟁조정', desc: '분쟁조정위원회 절차', fire: false },
  { no: '07', title: '소비자기본법', desc: '소비자 분쟁해결기준', fire: false },
  { no: '08', title: '전자서명법', desc: '전자문서 법적 효력', fire: false },
  { no: '09', title: '근로기준법', desc: '임금 지급 의무', fire: false },
  { no: '10', title: '산업안전법', desc: '현장 안전 관리', fire: false },
  { no: '11', title: '건축법', desc: '사용승인 기준', fire: false },
  { no: '12', title: '민사소송법', desc: '증거보전 절차', fire: false },
  { no: '13', title: '🔥 소방시설법', desc: '소방시설 설치 및 관리', fire: true },
  { no: '14', title: '🔥 화재예방법', desc: '화재 예방 및 안전관리', fire: true },
  { no: '15', title: '🔥 중대재해처벌법', desc: '사업주 안전보건 확보 의무', fire: true },
  { no: '16', title: '🔥 건축법 방화', desc: '방화구획 및 피난시설', fire: true },
  { no: '17', title: '🔥 다중이용업소법', desc: '소방완비증명서 의무', fire: true },
]

const problems = [
  {
    no: '01',
    badge: '분쟁 원인 1위',
    title: '말로만 한 합의',
    desc: '"구두로 했잖아요" — 계약 변경을 기록하지 않으면 법정에서 아무 소용이 없습니다.',
  },
  {
    no: '02',
    badge: '분쟁 원인 2위',
    title: '증거 없는 사진',
    desc: '날짜, 위치, 서명 없는 사진은 법적 증거력이 없습니다. 타임스탬프가 전부입니다.',
  },
  {
    no: '03',
    badge: '분쟁 원인 3위',
    title: '하자담보 기간 미기록',
    desc: '건산법 별표4 기준 하자담보기간을 놓치면 손해배상을 청구할 수도, 받을 수도 없습니다.',
  },
]

const solutions = [
  { icon: '📸', tag: 'AI 자동', title: '사진 한 장으로 리스크 분석', desc: '현장 사진을 올리면 AI가 법령 기준으로 즉시 분석. 법적 증거로 자동 잠금.' },
  { icon: '📋', tag: '특허 기술', title: '리스크 점수 실시간 계산', desc: '특허 공식 R = Fp×Wf + Oc×Wo + Ch×Wc로 분쟁 확률을 수치화합니다.' },
  { icon: '🛡️', tag: '법령 자동', title: '하자담보 자동 등록', desc: '공종 완료 시 건산법 기준 담보기간 자동 계산. 만료 30일 전 경고 알림.' },
  { icon: '⚖️', tag: '증빙 패키지', title: '법정용 증거 패키지', desc: 'SHA-256 Merkle Tree로 무결성 보장. 변호사가 바로 쓸 수 있는 형식.' },
]

const pricingPlans = [
  { name: 'Free', price: '0', period: '영원히', features: ['현장 1개', '기본 체크리스트', 'AI 체크 월 5회', '기본 리포트'], cta: '무료 시작', featured: false },
  { name: 'Starter', price: '29,000', period: '월', features: ['현장 3개', '업종별 체크리스트', 'AI 체크 무제한', '증빙 패키지', '하자담보 추적'], cta: '14일 무료체험', featured: false },
  { name: 'Pro', price: '79,000', period: '월', badge: '가장 인기', features: ['현장 무제한', '전체 기능', 'AI 브리핑 일간', '법적 인증서', '우선 지원'], cta: '14일 무료체험', featured: true },
  { name: 'Enterprise', price: '문의', period: '', features: ['팀 계정', '커스텀 체크리스트', 'API 연동', '전담 매니저', '법무 자문'], cta: '상담 신청', featured: false },
]

export default function LandingPage({ isLoggedIn }: LandingPageProps) {
  return (
    <div className="font-sans antialiased">
      <LandingNav />

      {/* ──── HERO ──── */}
      <section
        className="min-h-screen blueprint relative overflow-hidden flex items-center pt-16"
        style={{ backgroundColor: '#060E1A' }}
      >
        <div
          className="absolute w-[600px] h-[600px] rounded-full pointer-events-none top-1/2 -translate-y-1/2 right-[5%]"
          style={{ background: 'radial-gradient(circle, rgba(232,101,26,0.18) 0%, transparent 70%)' }}
        />
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 md:px-14 py-20 w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* LEFT */}
          <div className="fade-up">
            <div className="inline-flex items-center gap-2 border border-orange-500/30 text-[11px] font-bold tracking-[0.06em] px-3.5 py-1.5 rounded-full mb-7" style={{ backgroundColor: 'rgba(232,101,26,0.15)', color: '#FF7020' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              🏗 특허 등록 확정 · 세계 최초 AI 건설 분쟁 예방
            </div>
            <h1 className="text-hero text-white mb-6">
              공사 분쟁,<br />이제{' '}
              <em className="not-italic text-orange-500" style={{ textShadow: '0 0 40px rgba(232,101,26,0.5)' }}>
                체크인
              </em>이<br />막습니다
            </h1>
            <p className="text-[16px] max-w-[480px] leading-[1.8] mb-10" style={{ color: 'rgba(255,255,255,0.65)' }}>
              사진 한 장이 법적 증거가 됩니다. AI가 실시간으로 분쟁 리스크를 계산하고,
              하자담보기간을 자동으로 관리합니다.
            </p>
            <div className="flex flex-wrap gap-3 mb-12">
              <Link
                href={isLoggedIn ? '/dashboard' : '/login'}
                className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-xl text-[15px] font-bold text-white transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: '#E8651A', boxShadow: '0 4px 24px rgba(232,101,26,0.4)' }}
              >
                무료로 시작하기 →
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-xl text-[15px] font-semibold transition-all duration-200 hover:-translate-y-0.5"
                style={{ color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.30)' }}
              >
                데모 보기 ▶
              </Link>
            </div>
            <div className="flex flex-wrap gap-6">
              {['🔒 특허 3건 등록', '⚖️ 법령 17개 자동', '🛡️ 분쟁 예방 보장'].map((t) => (
                <div key={t} className="flex items-center gap-2 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.90)' }}>{t}</div>
              ))}
            </div>
          </div>

          {/* RIGHT — 프리뷰 */}
          <div className="w-full lg:block">
            <div className="backdrop-blur-xl rounded-2xl p-5 lg:animate-float" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 32px 80px rgba(0,0,0,.5)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-bold text-white">강남 카페 인테리어</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>리스크 분석 · 실시간</div>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-red-500 text-white">위험</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[{ label: '리스크', value: '73', color: '#F87171' }, { label: '진행률', value: '68%', color: '#FB923C' }, { label: '이슈', value: '4건', color: '#FFFFFF' }].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="text-xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg px-3 py-2 mb-3" style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <div className="text-[11px] font-bold" style={{ color: '#F87171' }}>⚠️ 분쟁 징후 감지 — 즉시 증빙 보강</div>
              </div>
              <div className="space-y-1.5">
                {[{ label: '방수', pct: 85, color: '#10B981' }, { label: '타일', pct: 45, color: '#F59E0B' }, { label: '전기', pct: 20, color: '#EF4444' }].map((bar) => (
                  <div key={bar.label} className="flex items-center gap-2">
                    <div className="text-[9px] w-6 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{bar.label}</div>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <div className="h-full rounded-full" style={{ width: `${bar.pct}%`, backgroundColor: bar.color }} />
                    </div>
                    <div className="text-[9px] w-6 text-right" style={{ color: 'rgba(255,255,255,0.4)' }}>{bar.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── STATS STRIP ──── */}
      <section className="border-y py-10" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
          {[{ num: '17', label: '건설·소방 법령 자동 적용' }, { num: '526', label: '체크리스트 항목' }, { num: '3', label: '특허 등록 확정' }, { num: '700만', label: '평균 분쟁 비용' }].map((stat) => (
            <div key={stat.label}>
              <div className="font-mono text-[32px] font-black leading-none" style={{ color: '#E8651A' }}>{stat.num}</div>
              <div className="text-xs mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ──── PROBLEM ──── */}
      <section className="bg-white py-16 md:py-24 px-4 sm:px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block text-[11px] font-bold tracking-[0.06em] text-orange-500 bg-orange-100 px-3.5 py-1.5 rounded-full mb-4">왜 분쟁이 생기나요?</div>
            <h2 className="text-heading mb-3" style={{ color: '#0F2744' }}>현장에서 매일 일어나는 3가지 실수</h2>
            <p className="text-base text-gray-500 leading-[1.8] max-w-[560px] mx-auto">인테리어 분쟁의 90%는 예방 가능했습니다.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {problems.map((p) => (
              <div key={p.no} className="bg-white border border-gray-200 rounded-xl p-6 shadow-card group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="font-mono text-[44px] font-bold leading-none mb-3" style={{ color: 'rgba(239,68,68,0.10)' }}>{p.no}</div>
                <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-500 mb-3">{p.badge}</span>
                <h3 className="text-[17px] font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-[1.7]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── SOLUTION ──── */}
      <section id="features" className="bg-gray-50 py-16 md:py-24 px-4 sm:px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block text-[11px] font-bold tracking-[0.06em] text-orange-500 bg-orange-100 px-3.5 py-1.5 rounded-full mb-4">체크인이 해결합니다</div>
            <h2 className="text-heading mb-3" style={{ color: '#0F2744' }}>4가지 핵심 기능</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {solutions.map((s, i) => (
              <div key={s.title} className="bg-white border border-gray-200 rounded-xl p-6 shadow-card relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'linear-gradient(90deg, #0F2744, #E8651A)' }} />
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-4" style={{ backgroundColor: '#E8F0F8' }}>{s.icon}</div>
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2" style={{ backgroundColor: '#E8F0F8', color: '#1A3A5C' }}>{s.tag}</span>
                <h3 className="text-[15px] font-bold text-gray-900 mb-2 leading-tight">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-[1.7]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── LAW SECTION ──── */}
      <section id="law" className="blueprint py-16 md:py-24 px-4 sm:px-8" style={{ backgroundColor: '#0F2744' }}>
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.06em] px-3.5 py-1.5 rounded-full mb-4" style={{ color: '#FF7020', backgroundColor: 'rgba(232,101,26,0.15)', border: '1px solid rgba(232,101,26,0.30)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              자동 적용 법령
            </div>
            <h2 className="text-heading text-white mb-3">17개 법령 자동 적용</h2>
            <p className="text-base max-w-[480px] mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>건설·인테리어·소방 관련 핵심 법령을 체크인이 자동으로 적용합니다.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {lawItems.map((law, i) => (
              <div key={law.no}
                className="rounded-xl p-4 transition-all duration-200 cursor-pointer fade-up"
                style={{
                  backgroundColor: law.fire ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${law.fire ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.10)'}`,
                  animationDelay: `${i * 0.05}s`,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.backgroundColor = law.fire ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.10)'
                  el.style.borderColor = law.fire ? 'rgba(239,68,68,0.50)' : 'rgba(232,101,26,0.30)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.backgroundColor = law.fire ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)'
                  el.style.borderColor = law.fire ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.10)'
                }}
              >
                <div className="font-mono text-[10px] tracking-widest mb-1.5" style={{ color: law.fire ? '#fca5a5' : '#E8651A' }}>{law.no}</div>
                <div className="text-sm font-bold leading-tight mb-1" style={{ color: law.fire ? '#fca5a5' : '#fff' }}>{law.title}</div>
                <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.80)' }}>{law.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── PRICING ──── */}
      <section id="pricing" className="py-16 md:py-24 px-4 sm:px-8" style={{ backgroundColor: '#0A1628' }}>
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block text-[11px] font-bold tracking-[0.06em] px-3.5 py-1.5 rounded-full mb-4" style={{ color: '#E8651A', backgroundColor: 'rgba(232,101,26,0.15)', border: '1px solid rgba(232,101,26,0.25)' }}>요금제</div>
            <h2 className="text-heading text-white mb-3">현장 규모에 맞게 선택</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 relative text-white${plan.featured ? ' lg:scale-[1.04]' : ''}`}
                style={plan.featured
                  ? {
                      background: 'linear-gradient(135deg, #0F2744 0%, #1A3A5C 100%)',
                      border: '2px solid #E8913A',
                      boxShadow: '0 0 20px rgba(232,145,58,0.30), 0 8px 32px rgba(15,39,68,0.5)',
                    }
                  : {
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }
                }
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black text-white px-3 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: '#E8651A' }}>{plan.badge}</div>
                )}
                <div className="text-xs font-bold mb-2" style={{ color: plan.featured ? '#FF7020' : 'rgba(255,255,255,0.55)' }}>{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[32px] font-black leading-none" style={{ color: '#E8913A' }}>{plan.price === '문의' ? '문의' : `₩${plan.price}`}</span>
                  {plan.period && <span className="text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>/{plan.period}</span>}
                </div>
                <ul className="mt-4 mb-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      <span className="text-xs" style={{ color: '#E8913A' }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="block text-center py-2.5 rounded-lg text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
                  style={plan.featured
                    ? { backgroundColor: '#E8913A', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(232,145,58,0.35)' }
                    : { border: '1px solid rgba(255,255,255,0.30)', color: '#FFFFFF', backgroundColor: 'transparent' }
                  }
                >{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── CTA BOTTOM ──── */}
      <section id="faq" className="py-14 md:py-20 px-4 sm:px-8 text-center" style={{ background: 'linear-gradient(135deg, #E8651A 0%, #C4511A 100%)' }}>
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-[40px] font-black text-white mb-4 leading-tight">지금 바로 무료로 시작하세요</h2>
          <p className="text-base mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>설치 없이, 카드 등록 없이. 지금 바로 현장을 보호하세요.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl text-[16px] font-extrabold text-white hover:-translate-y-1 hover:scale-[1.03] transition-all duration-200"
            style={{
              backgroundColor: '#E8913A',
              padding: '16px 48px',
              boxShadow: '0 8px 32px rgba(232,145,58,0.45)',
            }}
          >
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer style={{ backgroundColor: '#0f0f1a', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        {/* 3컬럼 본문 */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {/* 왼쪽: 브랜드 */}
          <div>
            <div className="text-[22px] font-black text-white mb-3">
              체크<span style={{ color: '#E8651A' }}>인</span>
            </div>
            <p className="text-sm leading-[1.7] mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
              AI 기반 건설 분쟁 예방 플랫폼
            </p>
            <a
              href="mailto:contact@check-in.kr"
              className="text-sm no-underline transition-colors duration-200"
              style={{ color: 'rgba(255,255,255,0.50)' }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#FFFFFF')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.50)')}
            >
              contact@check-in.kr
            </a>
          </div>

          {/* 가운데: 서비스 */}
          <div>
            <div className="text-xs font-bold tracking-[0.08em] uppercase mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>서비스</div>
            <ul className="space-y-3">
              {[
                { label: '기능 소개', href: '#features' },
                { label: '요금제', href: '#pricing' },
                { label: '법령 안내', href: '#law' },
                { label: 'FAQ', href: '#faq' },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm no-underline transition-colors duration-200"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#FFFFFF')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.55)')}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 오른쪽: 법적 고지 */}
          <div>
            <div className="text-xs font-bold tracking-[0.08em] uppercase mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>법적 고지</div>
            <ul className="space-y-3">
              {[
                { label: '이용약관', href: '#' },
                { label: '개인정보처리방침', href: '#' },
                { label: '사업자 정보', href: '#' },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm no-underline transition-colors duration-200"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#FFFFFF')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.55)')}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 하단 카피라이트 */}
        <div
          className="max-w-[1280px] mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            © 2025 체크인. All rights reserved.
          </span>
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
            특허 출원번호: 10-2024-XXXXXXX
          </span>
        </div>
      </footer>
    </div>
  )
}
