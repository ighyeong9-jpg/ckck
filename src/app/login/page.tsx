'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
// import { createClient } from '@/lib/supabase/client'  // ── 인증 꺼짐

export default function LoginPage() {
  const router = useRouter()
  // const supabase = createClient()  // ── 인증 꺼짐

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    router.push('/dashboard')
  }

  const darkInput =
    'w-full h-11 px-4 rounded-lg text-sm ' +
    'focus:outline-none transition-all duration-200'

  const labelCls = 'block text-xs font-bold mb-1.5 tracking-wide'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 30%, #1A3A5C 0%, #0A1929 50%, #060E1A 100%)' }}
    >
      {/* 글로우 1 — 우상단 */}
      <div
        className="absolute w-[500px] h-[500px] pointer-events-none -top-[100px] -right-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(232,101,26,.12), transparent 60%)' }}
      />
      {/* 글로우 2 — 좌하단 */}
      <div
        className="absolute w-[400px] h-[400px] pointer-events-none -bottom-[80px] -left-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(46,96,153,.2), transparent 60%)' }}
      />

      {/* 카드 */}
      <div
        className="w-[420px] rounded-3xl p-11 relative z-10 fade-up"
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
        }}
      >
        {/* 로고 */}
        <div className="text-[28px] font-black text-white mb-1.5">
          체크<span className="text-orange-500">인</span>
        </div>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>건설 분쟁 예방 플랫폼</p>

        {/* 탭 */}
        <div className="flex gap-1 rounded-xl p-1 mb-7" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          {(['로그인', '회원가입'] as const).map((tab) => {
            const active = (tab === '로그인') === !isSignUp
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setIsSignUp(tab === '회원가입')}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                style={active
                  ? { backgroundColor: '#E8651A', color: '#FFFFFF', boxShadow: '0 4px 24px rgba(232,101,26,0.4)' }
                  : { color: 'rgba(255,255,255,0.65)' }
                }
              >
                {tab}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className={labelCls} style={{ color: 'rgba(255,255,255,0.60)' }}>이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className={darkInput}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                }}
              />
            </div>
          )}
          <div>
            <label className={labelCls} style={{ color: 'rgba(255,255,255,0.60)' }}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className={darkInput}
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#FFFFFF',
              }}
            />
          </div>
          <div>
            <label className={labelCls} style={{ color: 'rgba(255,255,255,0.60)' }}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={darkInput}
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#FFFFFF',
              }}
            />
          </div>

          {error && (
            <div className="text-[13px] rounded-lg px-3.5 py-2.5" style={{ color: '#F87171', backgroundColor: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
              {error}
            </div>
          )}
          {message && (
            <div className="text-[13px] rounded-lg px-3.5 py-2.5" style={{ color: '#34D399', backgroundColor: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] rounded-xl text-[15px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            style={{ backgroundColor: '#E8651A', boxShadow: '0 4px 24px rgba(232,101,26,0.4)' }}
          >
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.30)' }}>또는</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* 카카오 버튼 */}
        <button
          type="button"
          className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-200"
          style={{ color: '#3C1E1E', backgroundColor: '#FEE500' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.367c0 2.07 1.373 3.887 3.44 4.908l-.875 3.25a.281.281 0 0 0 .43.305L8.12 13.54c.288.04.584.06.88.06 4.142 0 7.5-2.634 7.5-5.867C16.5 4.134 13.142 1.5 9 1.5z" fill="currentColor"/>
          </svg>
          카카오로 시작하기
        </button>

        <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.30)' }}>
          {isSignUp ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-semibold transition-colors underline underline-offset-2"
            style={{ color: 'rgba(255,255,255,0.60)' }}
          >
            {isSignUp ? '로그인' : '회원가입'}
          </button>
        </p>
      </div>
    </div>
  )
}
