'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
        if (error) throw error
        if (data.user?.identities?.length === 0) {
          setError('이미 등록된 이메일입니다.')
        } else {
          setMessage('회원가입 완료! 이메일을 확인해주세요.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/projects')
        router.refresh()
      }
    } catch (err: unknown) {
      setError((err as Error).message || '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const darkInput =
    'w-full h-11 px-4 rounded-lg text-sm ' +
    'bg-white/[0.06] border border-white/[0.12] text-white ' +
    'placeholder:text-white/25 ' +
    'focus:outline-none focus:border-orange-500 ' +
    'focus:ring-2 focus:ring-orange-500/20 ' +
    'transition-all duration-200'

  const labelCls = 'block text-xs font-bold text-white/50 mb-1.5 tracking-wide'

  return (
    <div
      className="min-h-screen bg-login-gradient blueprint flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundSize: '80px 80px, 80px 80px, 20px 20px, 20px 20px' }}
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
      <div className="w-[420px] bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-11 shadow-login relative z-10 fade-up">
        {/* 로고 */}
        <div className="text-[28px] font-black text-white mb-1.5">
          체<span className="text-orange-500">키</span>
        </div>
        <p className="text-sm text-white/40 mb-8">건설 분쟁 예방 플랫폼</p>

        {/* 탭 */}
        <div className="flex gap-1 bg-white/[0.05] rounded-xl p-1 mb-7">
          {(['로그인', '회원가입'] as const).map((tab) => {
            const active = (tab === '로그인') === !isSignUp
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setIsSignUp(tab === '회원가입')}
                className={[
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                  active ? 'bg-orange-500 text-white shadow-orange' : 'text-white/40 hover:text-white/70',
                ].join(' ')}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className={labelCls}>이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                required={isSignUp}
                className={darkInput}
              />
            </div>
          )}
          <div>
            <label className={labelCls}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className={darkInput}
            />
          </div>
          <div>
            <label className={labelCls}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className={darkInput}
            />
          </div>

          {error && (
            <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}
          {message && (
            <div className="text-[13px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3.5 py-2.5">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] rounded-xl text-[15px] font-bold text-white bg-orange-500 shadow-orange transition-all duration-300 hover:bg-orange-400 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
          </button>
        </form>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-xs text-white/30 font-medium">또는</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        {/* 카카오 버튼 */}
        <button
          type="button"
          className="w-full h-11 rounded-xl text-sm font-semibold text-[#3C1E1E] bg-[#FEE500] hover:bg-[#F5DC00] transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.367c0 2.07 1.373 3.887 3.44 4.908l-.875 3.25a.281.281 0 0 0 .43.305L8.12 13.54c.288.04.584.06.88.06 4.142 0 7.5-2.634 7.5-5.867C16.5 4.134 13.142 1.5 9 1.5z" fill="currentColor"/>
          </svg>
          카카오로 시작하기
        </button>

        <p className="text-center text-xs text-white/30 mt-5">
          {isSignUp ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-white/60 hover:text-white font-semibold transition-colors underline underline-offset-2"
          >
            {isSignUp ? '로그인' : '회원가입'}
          </button>
        </p>
      </div>
    </div>
  )
}
