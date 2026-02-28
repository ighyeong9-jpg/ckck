# CHECK-IN 체키 — PAGE IMPLEMENTATION SPEC v1.0
# 페이지별 정밀 구현 사양서
# Claude Code가 각 페이지를 만들 때 이 파일을 기준으로 한다

---

## 공통 원칙

```
모든 페이지 공통:
  - font-family: Pretendard (next/font 또는 Google Fonts)
  - CSS 변수: globals.css에 정의된 토큰 사용
  - 애니메이션: 페이지 진입 시 stagger fadeUp (0.1s 간격)
  - 반응형: mobile-first, 640/1024 브레이크포인트
  - 접근성: WCAG AA 명암비 준수
```

---

## 1. 랜딩페이지 (app/(marketing)/page.tsx)

### 구조
```
<LandingLayout>          ← 공통 마케팅 레이아웃
  <HeroSection>          ← 다크 풀스크린 히어로
  <StatsStrip>           ← 핵심 지표 4개
  <ProblemSection>       ← 문제 정의 (3 카드)
  <SolutionSection>      ← 해결 방법 (4 카드)
  <LawSection>           ← 법령 12개 그리드 (다크)
  <PricingSection>       ← 가격 4종
  <CtaBottom>            ← 오렌지 전체 CTA
  <Footer>
</LandingLayout>
```

### HeroSection 정밀 스펙
```tsx
// 배경
bg-hero-gradient + bg-blueprint bg-blueprint-size-[80px_80px_80px_80px_20px_20px_20px_20px]

// 오렌지 글로우 (absolute)
<div className="absolute w-[600px] h-[600px] rounded-full
  bg-[radial-gradient(circle,rgba(232,101,26,0.18)_0%,transparent_70%)]
  top-1/2 -translate-y-1/2 right-[5%] pointer-events-none" />

// 그리드
<div className="max-w-[1280px] mx-auto px-15 py-20
  grid grid-cols-2 gap-20 items-center min-h-screen">

// 뱃지
<div className="inline-flex items-center gap-2
  bg-orange-500/15 border border-orange-500/30
  text-orange-400 text-[11px] font-bold tracking-[0.06em]
  px-3.5 py-1.5 rounded-full mb-7">
  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
  🏗 특허 등록 확정 · 세계 최초 AI 건설 분쟁 예방
</div>

// 헤딩 (80px)
<h1 className="text-hero text-white mb-6">
  공사 분쟁,<br />이제{' '}
  <em className="not-italic text-orange-500
    [text-shadow:0_0_40px_rgba(232,101,26,0.5)]">체키</em>가<br />막습니다
</h1>

// CTA 버튼 그룹
<div className="flex gap-3 mb-13">
  <PrimaryButtonXL>무료로 시작하기 →</PrimaryButtonXL>
  <GhostButtonXL>데모 보기 ▶</GhostButtonXL>
</div>

// 신뢰 지표
<div className="flex gap-8">
  {['🔒 특허 3건 등록', '⚖️ 법령 12개 자동', '🛡️ 분쟁 예방 보장'].map(t => (
    <div className="flex items-center gap-2 text-white/40 text-xs">{t}</div>
  ))}
</div>

// 우측: 대시보드 프리뷰 카드 (animate-float)
<div className="bg-white/4 backdrop-blur-xl border border-white/10
  rounded-2xl p-5 shadow-[0_32px_80px_rgba(0,0,0,.5)]
  rotate-[-1.5deg] animate-float">
  // KPI 3개 + 경고 배너 + 차트바
</div>
```

### StatsStrip
```tsx
배경: bg-navy-950 + 상하 border
내용: 12 / 526 / 3 / 700만 (각 레이블 포함)
숫자: font-mono text-[32px] font-black text-orange-500
```

### ProblemSection (bg-white)
```tsx
카드 3개:
  hover시 border-top 색상 → red-500
  번호: font-mono text-[44px] font-bold text-red-500/10
  "분쟁 원인 1위" 배지: bg-red-100 text-red-500 rounded-full
```

### SolutionSection (bg-gray-50)
```tsx
카드 4개:
  ::before pseudo 상단 라인 hover 시 reveal
  아이콘 wrap: bg-navy-100 rounded-xl
  태그: bg-navy-100 text-navy-700 rounded-full text-xs
```

### LawSection (bg-navy-800 + blueprint)
```tsx
12개 카드:
  bg-white/6 border-white/10 rounded-xl
  hover: bg-white/10 border-orange-500/30
  번호: font-mono text-orange-500 text-[10px] tracking-widest
```

### PricingSection (bg-white)
```tsx
4개 카드:
  featured 카드: bg-navy-gradient text-white + scale(1.04)
  featured 뱃지: absolute top-[-12px] bg-orange-500 rounded-full
  버튼:
    일반: secondary 버튼 (네이비 아웃라인)
    featured: orange primary 버튼
```

### CtaBottom
```tsx
bg-cta-gradient text-center py-20
h2: text-[40px] font-black text-white
btn: bg-white text-orange-500 font-extrabold
  hover: translateY(-2px) scale(1.02) shadow-xl
```

---

## 2. 로그인 페이지 (app/auth/page.tsx)

```tsx
// 전체 배경
<div className="min-h-screen bg-login-gradient bg-blueprint
  bg-[length:80px_80px,80px_80px,20px_20px,20px_20px]
  flex items-center justify-center p-10 relative overflow-hidden">

  // 글로우 1 (우상단)
  <div className="absolute w-[500px] h-[500px]
    bg-[radial-gradient(circle,rgba(232,101,26,.12),transparent_60%)]
    -top-[100px] -right-[100px] pointer-events-none" />

  // 글로우 2 (좌하단)
  <div className="absolute w-[400px] h-[400px]
    bg-[radial-gradient(circle,rgba(46,96,153,.2),transparent_60%)]
    -bottom-[80px] -left-[80px] pointer-events-none" />

  // 카드
  <div className="w-[420px] bg-white/4 backdrop-blur-xl
    border border-white/10 rounded-3xl p-11
    shadow-login relative z-10">

    // 로고
    <div className="text-[28px] font-black text-white mb-2">
      체<span className="text-orange-500">키</span>
    </div>
    <p className="text-sm text-white/40 mb-8">건설 분쟁 예방 플랫폼</p>

    // 이메일 / 비밀번호 (DARK input)
    // 로그인 버튼 (primary xl w-full)
    // 구분선 "또는"
    // 카카오 버튼
    // 하단 회원가입 링크
  </div>
</div>
```

---

## 3. 대시보드 (app/(dashboard)/page.tsx)

### 레이아웃
```
<DashboardLayout>     ← Sidebar + MainArea
  <Sidebar>           ← navy-800, 240px fixed
  <MainArea>
    <TopBar>          ← white, h-[60px], border-b
    <DashContent>     ← gray-50, padding 28px
      <AlertBanner>   ← 리스크 61+만 표시
      <KpiGrid>       ← 4개 KPI 카드
      <DashGrid>      ← 좌(60%) 우(40%)
        LEFT:
          <AiBriefCard>     ← navy-gradient
          <ProcessCard>     ← 공정 진행 리스트
        RIGHT:
          <RiskCard>        ← 리스크 게이지
          <WarrantyCard>    ← 하자담보 현황
</DashboardLayout>
```

### Sidebar 정밀 스펙
```tsx
// 로고 섹션
<div className="px-5 py-[22px] text-[18px] font-black text-white
  border-b border-white/6 flex items-center justify-between">
  체<span className="text-orange-500">키</span>
  <span className="text-[10px] font-normal text-white/25">v2.0</span>
</div>

// 프로젝트 선택
<div className="mx-2.5 my-3 bg-white/6 border border-white/8
  rounded-xl p-3 cursor-pointer hover:bg-white/10 transition-colors">
  <div className="text-xs font-bold text-white">🏗 강남 카페 인테리어</div>
  <div className="text-[10px] text-white/35 mt-0.5">진행 중 · D+24</div>
</div>

// 섹션 레이블
<div className="font-mono text-[9px] tracking-[0.12em] text-white/25
  uppercase px-5 pt-3.5 pb-1.5">메인</div>

// 메뉴 아이템
const navItem = (active) => cn(
  "flex items-center gap-2.5 px-3 py-2.5 mx-2.5 rounded-lg",
  "text-[13px] font-medium cursor-pointer transition-all duration-150",
  active
    ? "text-white bg-white/10 border-l-2 border-orange-500"
    : "text-white/50 hover:text-white/85 hover:bg-white/6"
)

// 뱃지 (이슈 카운트, 만료임박)
<span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">3</span>
<span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white">D-14</span>
```

### KPI 카드
```tsx
<div className="bg-white border border-gray-200 rounded-xl p-5
  shadow-card transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
  <div className="text-[11px] font-semibold text-gray-400 uppercase
    tracking-[0.04em] mb-2.5">리스크 점수</div>
  <div className="text-[30px] font-black text-red-500 leading-none mb-2">73</div>
  <span className="inline-flex items-center gap-1 text-xs font-bold
    px-2.5 py-1 rounded-full bg-red-100 text-red-500">⚡ HIGH</span>
</div>
```

### AI 브리핑 카드
```tsx
<div className="bg-gradient-to-br from-navy-800 to-navy-700
  border border-white/8 rounded-xl p-[22px] text-white">
  <div className="flex items-center gap-2.5 mb-3.5">
    <div className="w-9 h-9 rounded-xl bg-orange-500/20
      flex items-center justify-center text-lg
      animate-pulse-glow">🤖</div>
    <div>
      <div className="text-sm font-bold">체키 AI 브리핑</div>
      <div className="text-[10px] text-white/40 mt-0.5">자동 생성</div>
    </div>
  </div>
  <p className="text-sm text-white/75 leading-[1.8]">
    // AI 메시지, <strong className="text-orange-500"> 로 강조
  </p>
</div>
```

### AlertBanner (리스크 61+)
```tsx
<div className="bg-gradient-to-r from-red-500/8 to-red-500/4
  border border-red-500/20 border-l-4 border-l-red-500
  rounded-xl p-[18px] mb-6 flex items-center justify-between">
  <div className="flex items-center gap-3.5">
    <span className="text-2xl">⚠️</span>
    <div>
      <div className="text-sm font-extrabold text-red-500 mb-0.5">
        분쟁 징후 감지 — 리스크 {score}점
      </div>
      <div className="text-sm text-gray-600">
        방치 시 분쟁 비용 평균{' '}
        <strong className="text-red-500 font-black">700만원</strong> 발생
      </div>
    </div>
  </div>
  <button className="btn-primary whitespace-nowrap">
    🛡 증빙 패키지 받기 →
  </button>
</div>
```

---

## 4. 체크리스트 (app/(dashboard)/projects/[id]/checklist/page.tsx)

### 헤더 (navy-gradient)
```tsx
<div className="bg-gradient-to-r from-navy-800 to-navy-700 px-7 py-6">
  // 좌: 제목 + 메타정보
  // 우: 리스크 점수 (giant number) + PASS/FAIL/확인중 카운터
</div>

// NO-GO 배너 (헤더 바로 아래, 조건부 표시)
<div className="bg-red-500/15 border-t border-red-500/25 px-7 py-3
  flex items-center justify-between">
  <span className="text-red-500 font-bold flex items-center gap-2">
    ⛔ NO-GO 판정 — 방수층 핀홀 미보수
  </span>
  <button className="btn-danger text-xs">🛡 증거 확보 →</button>
</div>
```

### 체크 아이템
```tsx
const checkItem = (status: 'pass'|'fail'|'pending') => cn(
  "bg-white border border-gray-200 rounded-xl px-4 py-3.5 mb-2",
  "flex items-center gap-3.5 cursor-pointer transition-all duration-200",
  "border-l-4 hover:shadow-sm hover:translate-x-0.5",
  {
    pass:    "border-l-green-500 bg-green-500/3",
    fail:    "border-l-red-500 bg-red-500/3",
    pending: "border-l-amber-500 bg-amber-500/3",
  }[status]
)

// 체크 아이콘
pass:    "w-[22px] h-[22px] rounded-md bg-green-500 text-white text-xs flex-center"
fail:    "w-[22px] h-[22px] rounded-md bg-red-500 text-white text-xs flex-center"
pending: "w-[22px] h-[22px] rounded-md bg-amber-100 border-2 border-amber-500 text-amber-500"
```

### 우측 사이드바
```tsx
// 리스크 점수 카드 (navy-gradient)
<div className="bg-gradient-to-br from-navy-800 to-navy-700 rounded-xl p-5">
  <div className="text-[56px] font-black text-red-500 leading-none text-center
    [text-shadow:0_0_30px_rgba(239,68,68,0.4)]">{score}</div>
  <div className="text-center text-sm text-white/50 mt-1.5 mb-4">
    분쟁 확률 <strong className="text-red-500">{prob}%</strong>
  </div>
  <button className="btn-primary w-full">🛡 지금 증거 확보</button>
</div>

// 사진 자동 체크 카드
<div className="bg-white border border-gray-200 rounded-xl p-4">
  // 드래그앤드롭 영역
  // hover: border-orange-500 bg-orange-50
  // "AI 자동 체크 시작" 버튼 (navy)
</div>
```

---

## 5. 현장 이슈 (app/(dashboard)/issues/page.tsx)

### 이슈 카드 구조
```tsx
<div className="bg-white border border-gray-200 rounded-xl overflow-hidden
  transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">

  {/* 상단: 이슈 내용 */}
  <div className="p-4 border-b border-gray-100 flex items-start gap-3.5">
    {/* 긴급도 dot (8px, 색상별) */}
    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
      style={urgency === 'critical' ? { background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,.5)' } : ...} />

    {/* 내용 */}
    <div className="flex-1">
      <span className="type-badge" />  {/* 시공하자/비용추가/자재변경 */}
      <div className="title" />
      <div className="desc text-sm text-gray-500 leading-[1.7]" />
      <div className="meta flex gap-3 text-xs text-gray-400 mt-2" />
    </div>
  </div>

  {/* 하단: AI 가이드 + 액션 버튼 */}
  <div className="px-[18px] py-3 bg-gray-50
    flex items-center justify-between">

    {/* AI 가이드 */}
    <div className="text-xs text-navy-700 flex items-center gap-1.5">
      🤖 체키 AI:
      <strong className="text-orange-500">법조문 자동 적용됨</strong>
    </div>

    {/* 3버튼 */}
    <div className="flex gap-2">
      <button className="approve-btn">✓ 승인</button>   {/* go-500 */}
      <button className="reject-btn">✗ 거절</button>   {/* nogo-100 → nogo-500 hover */}
      <button className="discuss-btn">💬 협의</button> {/* orange-100 → orange-500 hover */}
    </div>
  </div>
</div>
```

### 타임라인 사이드바 (320px)
```tsx
// 각 아이템
<div className="flex gap-3 mb-5 relative">
  // 연결선: ::before absolute left-[10px] top-[22px] w-px bg-gray-200
  <div className="dot" />  {/* 22px circle, 타입별 색상 */}
  <div>
    <div className="text-xs font-bold text-gray-800">{event}</div>
    <div className="text-[11px] text-gray-500 leading-[1.6]">{desc}</div>
    <div className="text-[10px] text-gray-300 mt-1 font-mono">{time}</div>
  </div>
</div>
```

---

## 공통 반응형

### 모바일 (< 640px)
```
- 사이드바: display:none → 하단 탭바로 교체
- 히어로 그리드: grid-cols-1
- KPI: grid-cols-2
- hero-preview 카드: hidden
- 버튼: w-full 또는 flex-col
```

### 태블릿 (640 ~ 1024px)
```
- 사이드바: 아이콘 only (60px)
- 그리드: 2열로 축소
```

---

## 애니메이션 구현

### 페이지 진입 stagger
```tsx
// 각 섹션의 children에 적용
{items.map((item, i) => (
  <div
    key={i}
    className="animate-fade-up opacity-0"
    style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}
  >
    {item}
  </div>
))}
```

### 숫자 카운트업 (KPI)
```tsx
// useEffect + requestAnimationFrame
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * ease))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}
```

### 버튼 마이크로 인터랙션
```css
/* spring bounce */
transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
hover: translateY(-1px) 또는 -2px
active: translateY(1px) scale(0.98)
```
