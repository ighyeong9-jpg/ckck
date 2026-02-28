/* ================================================================
   CHECK-IN 체키 — TAILWIND DESIGN TOKENS v1.0
   tailwind.config.ts에 그대로 붙여넣기
   ================================================================ */

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /* ── 브랜드 ── */
        navy: {
          950: '#060E1A',
          900: '#0A1929',
          800: '#0F2744',  /* PRIMARY */
          700: '#1A3A5C',
          600: '#1E4976',
          500: '#2E6099',
          100: '#E8F0F8',
        },
        orange: {
          600: '#C4511A',
          500: '#E8651A',  /* CTA */
          400: '#FF7020',
          100: '#FFF3ED',
        },
        /* ── 시맨틱 ── */
        go:   { DEFAULT: '#10B981', light: '#ECFDF5' },
        nogo: { DEFAULT: '#EF4444', light: '#FEF2F2' },
        warn: { DEFAULT: '#F59E0B', light: '#FFFBEB' },
        info: { DEFAULT: '#3B82F6', light: '#EFF6FF' },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'Apple SD Gothic Neo', 'sans-serif'],
        mono: ['JetBrains Mono', 'D2Coding', 'monospace'],
      },
      fontSize: {
        'hero': ['clamp(52px,6vw,80px)', { lineHeight: '0.98', letterSpacing: '-0.03em', fontWeight: '900' }],
        'display': ['clamp(36px,4vw,56px)', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '900' }],
        'heading': ['clamp(24px,2.5vw,36px)', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '800' }],
      },
      borderRadius: {
        'sm':  '6px',
        'md':  '10px',
        'lg':  '16px',
        'xl':  '20px',
        '2xl': '28px',
      },
      boxShadow: {
        'xs':     '0 1px 2px rgba(15,39,68,0.06)',
        'sm':     '0 2px 8px rgba(15,39,68,0.08)',
        'md':     '0 4px 16px rgba(15,39,68,0.10)',
        'lg':     '0 8px 32px rgba(15,39,68,0.12)',
        'xl':     '0 16px 48px rgba(15,39,68,0.16)',
        '2xl':    '0 24px 64px rgba(15,39,68,0.20)',
        'orange': '0 4px 24px rgba(232,101,26,0.40)',
        'navy':   '0 4px 24px rgba(15,39,68,0.50)',
        'card':   '0 2px 12px rgba(15,39,68,0.07)',
        'login':  '0 32px 80px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        /* 도면 그리드 — 다크 배경용 */
        'blueprint': `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
        `,
        /* 도면 그리드 — 라이트 배경용 */
        'blueprint-light': `
          linear-gradient(rgba(15,39,68,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(15,39,68,0.04) 1px, transparent 1px)
        `,
        /* 히어로 그라데이션 */
        'hero-gradient': 'radial-gradient(ellipse 80% 60% at 20% 50%, #1A3A5C 0%, #0A1929 40%, #060E1A 100%)',
        /* 로그인 그라데이션 */
        'login-gradient': 'radial-gradient(ellipse 100% 80% at 50% 30%, #1A3A5C 0%, #0A1929 50%, #060E1A 100%)',
        /* 오렌지 CTA 그라데이션 */
        'orange-gradient': 'linear-gradient(135deg, #E8651A 0%, #FF7020 100%)',
        /* 네이비 카드 */
        'navy-gradient': 'linear-gradient(135deg, #0F2744 0%, #1A3A5C 100%)',
        /* CTA 섹션 */
        'cta-gradient': 'linear-gradient(135deg, #E8651A 0%, #C4511A 100%)',
      },
      backgroundSize: {
        'blueprint': '80px 80px, 80px 80px, 20px 20px, 20px 20px',
        'blueprint-light': '40px 40px',
      },
      animation: {
        'float':      'float 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-up':    'fadeUp 0.5s ease both',
        'slide-in':   'slideIn 0.3s ease both',
        'count-up':   'countUp 1.2s ease-out both',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px) rotate(-1.5deg)' },
          '50%':     { transform: 'translateY(-8px) rotate(-1.5deg)' },
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 20px rgba(232,101,26,0.3)' },
          '50%':     { boxShadow: '0 0 40px rgba(232,101,26,0.6)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

export default config


/* ================================================================
   globals.css — CSS 변수 전체 (tailwind 위에 추가)
   ================================================================ */
/*
@layer base {
  :root {
    --navy-950:  #060E1A;
    --navy-900:  #0A1929;
    --navy-800:  #0F2744;
    --navy-700:  #1A3A5C;
    --navy-600:  #1E4976;
    --navy-500:  #2E6099;
    --navy-100:  #E8F0F8;
    --orange-600: #C4511A;
    --orange-500: #E8651A;
    --orange-400: #FF7020;
    --orange-100: #FFF3ED;
    --go-500:    #10B981;
    --go-100:    #ECFDF5;
    --nogo-500:  #EF4444;
    --nogo-100:  #FEF2F2;
    --warn-500:  #F59E0B;
    --warn-100:  #FFFBEB;
  }

  body {
    font-family: 'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
*/


/* ================================================================
   COMPONENT CLASS RECIPES (cn() 사용 기준)
   ================================================================ */

/*
────────────────────────────────────────
  BUTTONS
────────────────────────────────────────

PRIMARY (오렌지 CTA):
  "inline-flex items-center justify-center gap-2
   h-12 px-6 rounded-lg text-[15px] font-bold text-white
   bg-orange-500 shadow-orange
   transition-all duration-200 ease-spring
   hover:bg-orange-400 hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(232,101,26,.5)]
   active:bg-orange-600 active:translate-y-0"

PRIMARY XL (히어로 CTA):
  "inline-flex items-center justify-center gap-2
   h-[52px] px-8 rounded-xl text-[15px] font-bold text-white
   bg-orange-500 shadow-orange
   transition-all duration-300 ease-spring
   hover:bg-orange-400 hover:-translate-y-1"

SECONDARY (네이비 아웃라인):
  "inline-flex items-center justify-center gap-2
   h-10 px-5 rounded-lg text-sm font-semibold
   text-navy-800 border-[1.5px] border-navy-800 bg-transparent
   transition-all duration-200
   hover:bg-navy-100"

GHOST DARK (다크 배경용):
  "inline-flex items-center justify-center gap-2
   h-[52px] px-8 rounded-xl text-[15px] font-semibold text-white/80
   bg-white/6 border border-white/15
   transition-all duration-200
   hover:bg-white/10 hover:-translate-y-0.5"

DANGER:
  "inline-flex items-center justify-center gap-2
   h-10 px-5 rounded-lg text-sm font-bold text-white
   bg-nogo-500 transition-all hover:brightness-110"

SUCCESS:
  "inline-flex items-center justify-center gap-2
   h-10 px-5 rounded-lg text-sm font-bold text-white
   bg-go-500 transition-all hover:brightness-110"

────────────────────────────────────────
  CARDS
────────────────────────────────────────

DEFAULT:
  "bg-white border border-gray-200 rounded-xl p-6
   shadow-card transition-all duration-200
   hover:shadow-md hover:-translate-y-0.5"

FEATURED (상단 라인):
  "bg-white border border-gray-200 rounded-xl p-6
   shadow-card relative overflow-hidden
   before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px]
   before:bg-gradient-to-r before:from-navy-800 before:to-orange-500"

STATUS CARDS:
  PASS:      "border-l-4 border-l-go-500 bg-go-100/50"
  FAIL:      "border-l-4 border-l-nogo-500 bg-nogo-100/50"
  WARN:      "border-l-4 border-l-warn-500 bg-warn-100/50"

NAVY DARK:
  "bg-gradient-to-br from-navy-800 to-navy-700
   border border-white/8 rounded-xl p-6 text-white"

GLASS (다크 배경 위):
  "bg-white/4 backdrop-blur-xl
   border border-white/10 rounded-2xl p-6
   shadow-[0_32px_80px_rgba(0,0,0,.45)]"

ALERT BANNER (리스크 61+):
  "bg-gradient-to-r from-red-500/8 to-red-500/4
   border border-red-500/20 border-l-4 border-l-red-500
   rounded-xl p-4 flex items-center justify-between"

────────────────────────────────────────
  BADGES / STATUS
────────────────────────────────────────

GO:    "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-go-100 text-go-500"
NOGO:  "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-nogo-100 text-nogo-500"
WARN:  "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-warn-100 text-warn-500"
INFO:  "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-500"
HIGH:  "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-500 text-white"

────────────────────────────────────────
  FORM INPUTS
────────────────────────────────────────

LIGHT:
  "w-full h-11 px-4 rounded-lg text-sm
   bg-gray-50 border border-gray-200 text-gray-900
   placeholder:text-gray-400
   focus:outline-none focus:border-orange-500
   focus:ring-2 focus:ring-orange-500/15 focus:bg-white
   transition-all duration-200"

DARK (로그인):
  "w-full h-11 px-4 rounded-lg text-sm
   bg-white/6 border border-white/12 text-white
   placeholder:text-white/25
   focus:outline-none focus:border-orange-500
   focus:ring-2 focus:ring-orange-500/20 focus:bg-white/8
   transition-all duration-200"

LABEL LIGHT: "block text-xs font-bold text-gray-500 mb-1.5 tracking-wide"
LABEL DARK:  "block text-xs font-bold text-white/50 mb-1.5 tracking-wide"

────────────────────────────────────────
  SIDEBAR
────────────────────────────────────────

CONTAINER: "w-60 flex-shrink-0 bg-navy-800 flex flex-col border-r border-white/5"

LOGO: "px-5 py-[22px] text-[18px] font-black text-white border-b border-white/6"

NAV ITEM DEFAULT:
  "flex items-center gap-2.5 px-3 py-2.5 mx-2.5 rounded-lg
   text-[13px] font-medium text-white/50
   cursor-pointer transition-all duration-150
   hover:text-white/85 hover:bg-white/6"

NAV ITEM ACTIVE:
  "flex items-center gap-2.5 px-3 py-2.5 mx-2.5 rounded-lg
   text-[13px] font-medium text-white
   bg-white/10 border-l-2 border-orange-500 cursor-pointer"

SECTION LABEL:
  "font-mono text-[9px] tracking-[0.12em] text-white/25
   uppercase px-5 pt-3.5 pb-1.5"

────────────────────────────────────────
  SECTION HEADERS
────────────────────────────────────────

TAG (오렌지 pill):
  "inline-block text-[11px] font-bold tracking-[0.06em]
   text-orange-500 bg-orange-100
   px-3.5 py-1.5 rounded-full mb-4"

TAG DARK (다크 배경):
  "inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.06em]
   text-orange-400 bg-orange-500/15
   border border-orange-500/30
   px-3.5 py-1.5 rounded-full mb-4"

H2 LIGHT: "text-heading text-navy-800 mb-3"
H2 DARK:  "text-heading text-white mb-3"
SUB:      "text-base text-gray-500 leading-[1.8] max-w-[560px] mb-14"
*/
