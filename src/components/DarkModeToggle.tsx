'use client'

import { useEffect, useState } from 'react'
import styles from './DarkModeToggle.module.scss'

type Theme = 'light' | 'dark'

export default function DarkModeToggle() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // 마운트 후 localStorage에서 테마 복원
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial: Theme = saved ?? (prefersDark ? 'dark' : 'light')
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  // SSR hydration 불일치 방지
  if (!mounted) {
    return <div className={styles.placeholder} aria-hidden="true" />
  }

  return (
    <button
      className={styles.toggle}
      onClick={toggle}
      aria-label={theme === 'light' ? '다크모드로 전환' : '라이트모드로 전환'}
      title={theme === 'light' ? '다크모드' : '라이트모드'}
    >
      <span className={styles.icon} aria-hidden="true">
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
      <span className={styles.srOnly}>
        {theme === 'light' ? '다크모드' : '라이트모드'}
      </span>
    </button>
  )
}
