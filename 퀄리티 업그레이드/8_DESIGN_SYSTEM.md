# CHECK-IN 체키 — DESIGN SYSTEM v1.0
# "Industrial Precision" — 건설 도면의 정밀함 × SaaS의 세련됨

---

## 1. 디자인 철학

### 컨셉: Industrial Precision

체키는 두 세계의 교차점에 있다.
- **현장 (Field)** — 건설 도면, 안전 신호, 정밀한 치수, 공차 없는 시공
- **디지털 (Digital)** — 현대 SaaS, 데이터 시각화, AI 자동화

이 두 세계의 언어를 하나의 디자인으로 합친다.

```
도면 그리드 패턴     → 배경 텍스처 (건설 전문성)
정밀한 타이포그래피  → Pretendard 900 + 400
네이비 + 오렌지     → 법적 권위 + 현장 에너지
날카로운 모서리     → 전문 도구의 정밀함
글로우 효과         → AI의 인텔리전스
```

### 한 줄 기억:
> "이 앱을 열면 '이건 진지한 전문가 도구다'라는 느낌이 먼저 온다"

---

## 2. 레퍼런스 기업 + 체키만의 차별화

| 기업 | 체키가 가져오는 것 | 체키가 버리는 것 |
|------|-----------------|---------------|
| Stripe | 정교한 그라데이션, 깊이감 있는 카드 | 보라/인디고 색상 |
| Linear | 다크 테마 완성도, 정밀한 타이포 | 개발자 전용 느낌 |
| 토스 | 한국인 UX 최적화, 정보 계층 | 핀테크 파랑 |
| Vercel | 다크 + 글로우, 테크 권위 | 흑백 미니멀 |
| 오늘의집 | 감성적 사진 활용 | 인테리어 감성 민트 |

**체키만의 것:**
- 도면 그리드 배경 패턴
- 공사 오렌지 액센트
- GO/NO-GO 판정 배지 시스템
- 법적 증거 패키지 UI

---

## 3. 타이포그래피 시스템

```css
/* Primary: Pretendard — 한국 최고 UI 폰트 */
/* Display: 900 weight — 강력한 임팩트 */
/* Body: 400/500 — 편안한 가독성 */

--font-display: 'Pretendard', -apple-system, sans-serif;
--font-body:    'Pretendard', -apple-system, sans-serif;
--font-mono:    'JetBrains Mono', 'D2Coding', monospace;

/* Scale */
--text-xs:   11px / 1.5  / letter-spacing: 0.02em
--text-sm:   13px / 1.6
--text-base: 15px / 1.7
--text-lg:   18px / 1.5
--text-xl:   24px / 1.3
--text-2xl:  32px / 1.2
--text-3xl:  48px / 1.1 / font-weight: 900
--text-4xl:  64px / 1.0 / font-weight: 900
--text-hero: 80px / 0.95 / font-weight: 900 / letter-spacing: -0.03em
```

---

## 4. 컬러 시스템 (최종)

```css
:root {
  /* ━━━ BRAND CORE ━━━ */
  --navy-950:  #060E1A;   /* 최심층 다크 */
  --navy-900:  #0A1929;   /* 히어로 배경 */
  --navy-800:  #0F2744;   /* 브랜드 네이비 (PRIMARY) */
  --navy-700:  #1A3A5C;   /* 사이드바 */
  --navy-600:  #1E4976;   /* hover */
  --navy-500:  #2E6099;   /* 라이트 네이비 */
  --navy-100:  #E8F0F8;   /* 네이비 틴트 배경 */

  --orange-600: #C4511A;  /* 다크 오렌지 */
  --orange-500: #E8651A;  /* PRIMARY CTA */
  --orange-400: #FF7020;  /* hover */
  --orange-100: #FFF3ED;  /* 소프트 배경 */

  /* ━━━ SEMANTIC ━━━ */
  --green-500:  #10B981;
  --green-100:  #ECFDF5;
  --red-500:    #EF4444;
  --red-100:    #FEF2F2;
  --amber-500:  #F59E0B;
  --amber-100:  #FFFBEB;
  --blue-500:   #3B82F6;
  --blue-100:   #EFF6FF;

  /* ━━━ NEUTRAL ━━━ */
  --white:      #FFFFFF;
  --gray-50:    #F8FAFC;
  --gray-100:   #F1F5F9;
  --gray-200:   #E2E8F0;
  --gray-300:   #CBD5E1;
  --gray-400:   #94A3B8;
  --gray-500:   #64748B;
  --gray-600:   #475569;
  --gray-700:   #334155;
  --gray-800:   #1E293B;
  --gray-900:   #0F172A;

  /* ━━━ SURFACE ━━━ */
  --surface-page:    #F8FAFC;   /* 대시보드 배경 */
  --surface-card:    #FFFFFF;   /* 카드 */
  --surface-input:   #F8FAFC;   /* 입력창 */
  --surface-hover:   #F1F5F9;   /* hover */

  /* ━━━ SHADOW ━━━ */
  --shadow-xs:  0 1px 2px rgba(15,39,68,0.06);
  --shadow-sm:  0 2px 8px rgba(15,39,68,0.08);
  --shadow-md:  0 4px 16px rgba(15,39,68,0.10);
  --shadow-lg:  0 8px 32px rgba(15,39,68,0.12);
  --shadow-xl:  0 16px 48px rgba(15,39,68,0.16);
  --shadow-2xl: 0 24px 64px rgba(15,39,68,0.20);
  --shadow-orange: 0 4px 24px rgba(232,101,26,0.40);
  --shadow-navy:   0 4px 24px rgba(15,39,68,0.50);

  /* ━━━ BORDER RADIUS ━━━ */
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-xl:  20px;
  --radius-2xl: 28px;
  --radius-full: 9999px;

  /* ━━━ SPACING (8px base) ━━━ */
  --sp-1:  4px;  --sp-2:  8px;  --sp-3: 12px;
  --sp-4: 16px;  --sp-5: 20px;  --sp-6: 24px;
  --sp-8: 32px;  --sp-10:40px;  --sp-12:48px;
  --sp-16:64px;  --sp-20:80px;  --sp-24:96px;
}
```

---

## 5. 컴포넌트 시스템

### Buttons
```
PRIMARY:   bg orange-500, text white, shadow-orange, radius-md, px-24 py-12, fw-700
           hover: orange-400, translateY(-1px), shadow 커짐
           active: orange-600, translateY(0)

SECONDARY: bg white, border 1.5px navy-800, text navy-800, radius-md
           hover: bg navy-100

GHOST:     transparent, border gray-200, text gray-600
           hover: bg gray-50

DANGER:    bg red-500, text white
SUCCESS:   bg green-500, text white

DARK(랜딩용): bg transparent, border rgba(white,0.2), text white
           hover: bg rgba(white,0.08)

SIZE:
  sm: h-32, px-16, text-sm
  md: h-40, px-20, text-base (DEFAULT)
  lg: h-48, px-24, text-lg
  xl: h-56, px-32, text-xl (히어로 CTA)
```

### Cards
```
DEFAULT:   bg white, border gray-200, radius-xl, shadow-sm, p-24
           hover: shadow-md, translateY(-2px), border gray-300

FEATURED:  border-top 3px orange-500 (강조 카드)
DANGER:    border-left 4px red-500, bg red-100
SUCCESS:   border-left 4px green-500, bg green-100
WARN:      border-left 4px amber-500, bg amber-100
NAVY:      bg navy-800, border navy-700, text white (다크 카드)
GLASS:     bg rgba(white,0.08), backdrop-blur, border rgba(white,0.12) (다크 배경 위)
```

### Badges / Status
```
GO:         bg green-100, text green-600, border green-200, radius-full
NO-GO:      bg red-100, text red-600, border red-200, radius-full
CONDITIONAL: bg amber-100, text amber-600, border amber-200, radius-full
HIGH-RISK:  bg red-500, text white, radius-full (긴급)
NEW:        bg orange-100, text orange-600
```

### Form Inputs
```
DEFAULT:
  bg surface-input, border gray-200, radius-md, h-44, px-16
  focus: border orange-500, ring 2px orange-100, bg white
  label: text-sm, gray-600, fw-600, mb-6
  placeholder: gray-400
  error: border red-500, bg red-50

DARK(로그인용):
  bg rgba(white,0.06), border rgba(white,0.12)
  focus: border orange-500, ring rgba(orange,0.2)
  text: white, placeholder rgba(white,0.4)
```

### Navigation / Sidebar
```
SIDEBAR:
  width: 240px (expanded) / 60px (collapsed)
  bg: navy-800
  border-right: 1px rgba(white,0.06)

  LOGO:
    padding: 20px 20px 16px
    font-size: 20px, fw-900, text-white
    "체" in orange-500

  NAV ITEM:
    height: 40px, px-16, radius-md, mx-8
    icon: 18px, mr-10
    text: text-sm, fw-500
    DEFAULT: text rgba(white,0.55)
    HOVER: text rgba(white,0.85), bg rgba(white,0.06)
    ACTIVE: text white, bg rgba(white,0.10), border-left 2px orange-500

  SECTION LABEL:
    text-xs, letter-spacing 0.1em, text rgba(white,0.3)
    uppercase, px-24, py-8, mt-8

  BOTTOM:
    user avatar + name + 로그아웃
    border-top rgba(white,0.06)
```

---

## 6. 페이지별 레이아웃 스펙

### 랜딩페이지
```
HERO:
  min-height: 100vh
  bg: radial-gradient(ellipse at 30% 50%, navy-700 0%, navy-900 50%, navy-950 100%)
  도면 그리드 오버레이: 1px 라인, rgba(white,0.03), 40px 간격
  오렌지 글로우: position absolute, blur 120px, opacity 0.15

  Layout: 좌우 2칸
  LEFT:
    - 상단 뱃지 (pill): "🏗 특허 등록 확정 · 세계 최초"
    - 헤딩 (80px, fw-900): "공사 분쟁,\n이제 체키가\n막습니다"
    - 헤딩 내 "체키" = orange-500 + text-shadow glow
    - 서브: 16px, rgba(white,0.6), max-width 480px
    - CTA 버튼 그룹: PRIMARY(xl) + GHOST
    - 신뢰 지표 row: "특허 3건" "법령 12개" "분쟁 예방"
  RIGHT:
    - 대시보드 미니 프리뷰 (glass card)
    - 떠있는 느낌: shadow-2xl + rotate(-2deg)
    - 실제 데이터처럼 보이는 KPI, 차트

SECTIONS:
  Problem: bg white, 카드 3개
  Solution: bg gray-50, 기능 4개 (아이콘 + 설명)
  Trust: bg navy-800, 법령 12개 그리드
  Pricing: bg white
  CTA Bottom: bg orange-500 (전체 오렌지)
```

### 로그인 페이지
```
bg: radial-gradient(navy-950 → navy-800)
도면 그리드 오버레이
중앙 정렬 카드 (width 400px)

카드:
  bg: rgba(white,0.04)
  border: 1px rgba(white,0.10)
  backdrop-filter: blur(20px)
  border-radius: 24px
  padding: 40px
  shadow: 0 32px 80px rgba(0,0,0,0.4)

상단: 로고 + "체키에 오신걸 환영합니다"
입력: DARK 스타일
버튼: PRIMARY(lg) w-full
소셜: 구분선 "또는" + 카카오 버튼
```

### 대시보드
```
Layout:
  Sidebar (240px fixed) + Main (flex-1)
  Main > TopBar (64px) + Content

TopBar:
  bg white, border-bottom gray-200
  좌: 페이지 타이틀
  우: 알림벨 + 프로젝트 선택 + 유저 아바타

Content:
  bg surface-page (#F8FAFC)
  padding: 32px

KPI ROW (4개):
  카드 높이 120px
  숫자: text-3xl, fw-900
  레이블: text-sm, gray-500
  트렌드 배지 우측 상단

ALERT BANNER (리스크 61+):
  bg: linear-gradient(135deg, rgba(red,0.08), rgba(red,0.04))
  border: 1px rgba(red,0.2)
  border-left: 4px solid red-500
  "분쟁 비용 700만원" → red-600, fw-900, text-2xl
  오른쪽 CTA 버튼

AI BRIEFING:
  bg navy-800 카드
  텍스트 흰색
  왼쪽에 AI 아이콘 (오렌지 글로우)

GRID:
  좌 (60%): 공정 진행 + 이슈 목록
  우 (40%): 리스크 게이지 + 하자담보
```

### 체크리스트
```
헤더: bg navy-800, 텍스트 흰색, 리스크 점수 크게
메인: bg surface-page

체크 아이템:
  카드 형태, radius-lg
  좌측 border-left 4px (상태별 색상)
  PASS: green / FAIL: red / PENDING: amber
  hover: shadow-md 상승

리스크 점수 게이지:
  원형 프로그레스 (SVG)
  0-30: 초록 / 31-60: 앰버 / 61+: 빨강
  중앙에 숫자 크게

GO/NO-GO 판정:
  전체 너비 배너
  GO: bg green-500, 흰 텍스트
  NO-GO: bg red-500 + 오렌지 CTA
```

---

## 7. 애니메이션 시스템

```css
/* 기본 전환 */
--transition-fast:   0.12s cubic-bezier(0.4,0,0.2,1);
--transition-base:   0.20s cubic-bezier(0.4,0,0.2,1);
--transition-slow:   0.35s cubic-bezier(0.4,0,0.2,1);
--transition-spring: 0.40s cubic-bezier(0.34,1.56,0.64,1);

/* 페이지 진입 (stagger) */
.fade-up { animation: fadeUp 0.5s ease both; }
.fade-up:nth-child(1) { animation-delay: 0.0s; }
.fade-up:nth-child(2) { animation-delay: 0.1s; }
.fade-up:nth-child(3) { animation-delay: 0.2s; }

@keyframes fadeUp {
  from { opacity:0; transform: translateY(20px); }
  to   { opacity:1; transform: translateY(0); }
}

/* 버튼 hover */
button: transition-spring, translateY(-1px)

/* 카드 hover */
card: transition-base, translateY(-2px), shadow 상승

/* 숫자 카운트업 */
kpi-number: countUp animation, 1.2s ease-out

/* 글로우 pulse (AI 아이콘) */
@keyframes pulse-glow {
  0%,100% { box-shadow: 0 0 20px rgba(orange,0.3); }
  50%     { box-shadow: 0 0 40px rgba(orange,0.6); }
}
```

---

## 8. 도면 그리드 패턴 (시그니처 텍스처)

```css
/* 체키만의 배경 텍스처 — 건설 도면 느낌 */
.bg-blueprint {
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size: 80px 80px, 80px 80px, 20px 20px, 20px 20px;
}

/* 라이트 버전 (대시보드) */
.bg-blueprint-light {
  background-image:
    linear-gradient(rgba(15,39,68,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,39,68,0.04) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

---

## 9. 반응형 브레이크포인트

```
mobile:  < 640px   (모바일 우선)
tablet:  640-1024px
desktop: > 1024px

사이드바:
  mobile: 하단 탭바로 전환
  tablet: 아이콘 only (60px)
  desktop: 전체 사이드바 (240px)
```
