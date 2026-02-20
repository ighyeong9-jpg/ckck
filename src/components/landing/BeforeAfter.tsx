'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './BeforeAfter.module.scss'

const PAIRS = [
  {
    before: { icon: '😰', text: '사진 없어서\n책임을 못 묻는다' },
    after: { icon: '📸', text: '체키가 자동 기록\n증거가 완성된다' },
    law: '민법 제667조 — 수급인 담보책임',
  },
  {
    before: { icon: '🤷', text: '하자담보 기간\n몰라서 포기했다' },
    after: { icon: '🔔', text: '만료 30일 전\n자동으로 알려준다' },
    law: '건설산업기본법 시행령 별표4',
  },
  {
    before: { icon: '😤', text: '추가비용 요구에\n속수무책이었다' },
    after: { icon: '⚖️', text: '민법 665조\n즉시 안내받는다' },
    law: '민법 제665조 — 도급인 보수지급 의무',
  },
]

function useFadeIn(ref: React.RefObject<HTMLElement>) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.2 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return visible
}

export default function BeforeAfter() {
  const ref = useRef<HTMLElement>(null)
  const visible = useFadeIn(ref)

  return (
    <section ref={ref} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>체키 도입 전 · 후</div>
        <h2 className={styles.title}>
          이렇게 <span className={styles.accent}>달라집니다</span>
        </h2>

        <div className={styles.pairs}>
          {PAIRS.map((pair, i) => (
            <div
              key={i}
              className={`${styles.pair} ${visible ? styles.visible : ''}`}
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              {/* Before */}
              <div className={styles.beforeCard}>
                <div className={styles.cardLabel} data-type="before">Before</div>
                <div className={styles.cardIcon}>{pair.before.icon}</div>
                <p className={styles.cardText}>{pair.before.text}</p>
              </div>

              {/* 화살표 */}
              <div className={styles.arrow}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* After */}
              <div className={styles.afterCard}>
                <div className={styles.cardLabel} data-type="after">After</div>
                <div className={styles.cardIcon}>{pair.after.icon}</div>
                <p className={styles.cardText}>{pair.after.text}</p>
                <div className={styles.lawBadge}>{pair.law}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
