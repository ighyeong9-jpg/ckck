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
          800: '#0F2744',
          700: '#1A3A5C',
          600: '#1E4976',
          500: '#2E6099',
          100: '#E8F0F8',
        },
        orange: {
          600: '#C4511A',
          500: '#E8651A',
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
        'hero':    ['clamp(52px,6vw,80px)',  { lineHeight: '0.98', letterSpacing: '-0.03em', fontWeight: '900' }],
        'display': ['clamp(36px,4vw,56px)',  { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '900' }],
        'heading': ['clamp(24px,2.5vw,36px)',{ lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '800' }],
      },
      borderRadius: {
        'sm':  '6px',
        'md':  '10px',
        'lg':  '16px',
        'xl':  '20px',
        '2xl': '28px',
        '3xl': '32px',
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
        'blueprint': `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
        `,
        'blueprint-light': `
          linear-gradient(rgba(15,39,68,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(15,39,68,0.04) 1px, transparent 1px)
        `,
        'hero-gradient':   'radial-gradient(ellipse 80% 60% at 20% 50%, #1A3A5C 0%, #0A1929 40%, #060E1A 100%)',
        'login-gradient':  'radial-gradient(ellipse 100% 80% at 50% 30%, #1A3A5C 0%, #0A1929 50%, #060E1A 100%)',
        'orange-gradient': 'linear-gradient(135deg, #E8651A 0%, #FF7020 100%)',
        'navy-gradient':   'linear-gradient(135deg, #0F2744 0%, #1A3A5C 100%)',
        'cta-gradient':    'linear-gradient(135deg, #E8651A 0%, #C4511A 100%)',
      },
      backgroundSize: {
        'blueprint':       '80px 80px, 80px 80px, 20px 20px, 20px 20px',
        'blueprint-light': '40px 40px',
      },
      animation: {
        'float':      'float 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-up':    'fadeUp 0.5s ease both',
        'slide-in':   'slideIn 0.3s ease both',
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
