'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const navLinks = [
  { label: '기능', href: '#features' },
  { label: '법령', href: '#law' },
  { label: '요금제', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 메뉴 열릴 때 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return
    e.preventDefault()
    setMenuOpen(false)
    const target = document.getElementById(href.slice(1))
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 64
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300"
        style={{
          backgroundColor: scrolled || menuOpen ? 'rgba(6,14,26,0.95)' : '#060E1A',
          backdropFilter: scrolled || menuOpen ? 'blur(16px)' : 'none',
          borderBottom: scrolled || menuOpen ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 w-full flex items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="text-[20px] font-black text-white no-underline flex-shrink-0">
            체크<span style={{ color: '#E8651A' }}>인</span>
          </Link>

          {/* 가운데 메뉴 — 데스크탑 */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleAnchor(e, link.href)}
                className="text-sm font-medium transition-colors duration-200 no-underline"
                style={{ color: 'rgba(255,255,255,0.65)' }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#E8911A')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.65)')}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* 오른쪽 — 데스크탑 버튼 + 모바일 햄버거 */}
          <div className="flex items-center gap-3">
            {/* 데스크탑 버튼 */}
            <Link
              href="/login"
              className="hidden sm:block text-sm font-semibold no-underline transition-colors duration-200"
              style={{ color: 'rgba(255,255,255,0.65)' }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#E8911A')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.65)')}
            >
              로그인
            </Link>
            <Link
              href="/login"
              className="hidden sm:block text-sm font-bold text-white no-underline px-4 py-2 rounded-lg transition-all duration-200 hover:-translate-y-0.5"
              style={{ backgroundColor: '#E8651A', boxShadow: '0 2px 12px rgba(232,101,26,0.35)' }}
            >
              무료 시작
            </Link>

            {/* 햄버거 버튼 — 모바일 전용 */}
            <button
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg transition-colors duration-200"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="메뉴"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <span
                className="block w-5 h-0.5 bg-white transition-all duration-300 origin-center"
                style={{ transform: menuOpen ? 'translateY(8px) rotate(45deg)' : 'none' }}
              />
              <span
                className="block w-5 h-0.5 bg-white transition-all duration-300"
                style={{ opacity: menuOpen ? 0 : 1 }}
              />
              <span
                className="block w-5 h-0.5 bg-white transition-all duration-300 origin-center"
                style={{ transform: menuOpen ? 'translateY(-8px) rotate(-45deg)' : 'none' }}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <div
          className="fixed top-16 left-0 right-0 bottom-0 z-40 md:hidden flex flex-col"
          style={{ backgroundColor: 'rgba(6,14,26,0.98)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex flex-col px-6 pt-8 pb-10 gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleAnchor(e, link.href)}
                className="text-lg font-semibold py-4 no-underline transition-colors duration-200"
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {link.label}
              </a>
            ))}

            <div className="flex flex-col gap-3 mt-8">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="w-full text-center py-3.5 rounded-xl text-sm font-semibold no-underline transition-all duration-200"
                style={{ color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.20)', backgroundColor: 'transparent' }}
              >
                로그인
              </Link>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="w-full text-center py-3.5 rounded-xl text-sm font-bold text-white no-underline transition-all duration-200"
                style={{ backgroundColor: '#E8651A', boxShadow: '0 4px 16px rgba(232,101,26,0.40)' }}
              >
                무료로 시작하기 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
