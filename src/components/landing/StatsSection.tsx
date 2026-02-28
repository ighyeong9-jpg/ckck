'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './StatsSection.module.scss'

const STATS = [
  { value: 450, suffix: '건', label: '월 평균 예방 가능 기록 관리', desc: '한국소비자원 인테리어 기록 관리 통계' },
  { value: 7, suffix: '대', label: '자동 감지 기록 관리 유형', desc: '구두합의·추가비용·먹튀 등' },
  { value: 12, suffix: '개', label: '실시간 적용 법령', desc: '민법·건산법·하도급법 등' },
  { value: 9, suffix: '개', label: 'AI 자동 체크 공종', desc: '철거~가구까지 전 공정' },
]

function useCountUp(target: number, started: boolean, duration = 1500) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!started) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start = Math.min(start + step, target)
      setCount(Math.floor(start))
      if (start >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [started, target, duration])

  return count
}

function StatCard({ stat, started }: { stat: typeof STATS[0]; started: boolean }) {
  const count = useCountUp(stat.value, started)
  return (
    <div className={styles.card}>
      <div className={styles.number}>
        <span className={styles.count}>{count}</span>
        <span className={styles.suffix}>{stat.suffix}</span>
      </div>
      <div className={styles.label}>{stat.label}</div>
      <div className={styles.desc}>{stat.desc}</div>
    </div>
  )
}

export default function StatsSection() {
  const ref = useRef<HTMLElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect() } },
      { threshold: 0.3 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>숫자로 보는 체크인</div>
        <h2 className={styles.title}>
          인테리어 기록 관리은 <span className={styles.accent}>운</span>이 아니라<br />
          <span className={styles.accent}>기록</span>의 문제입니다
        </h2>
        <div className={styles.grid}>
          {STATS.map(s => <StatCard key={s.label} stat={s} started={started} />)}
        </div>
      </div>
    </section>
  )
}
