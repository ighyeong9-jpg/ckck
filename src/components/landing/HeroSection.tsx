'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import styles from './HeroSection.module.scss'

export default function HeroSection() {
  const badgeRef = useRef<HTMLDivElement>(null)

  // 안전 현황 확인 카드 루프 애니메이션
  useEffect(() => {
    const items = document.querySelectorAll(`.${styles.checkItem}`)
    let i = 0
    const tick = () => {
      items.forEach(el => el.classList.remove(styles.active))
      items[i % items.length]?.classList.add(styles.active)
      i++
    }
    tick()
    const id = setInterval(tick, 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <section className={styles.hero}>
      {/* 배경 텍스처 그리드 */}
      <div className={styles.grid} aria-hidden />

      <div className={styles.inner}>
        {/* 왼쪽: 카피 */}
        <div className={styles.copy}>
          <div className={styles.badge} ref={badgeRef}>
            <span className={styles.dot} />
            AI 기록 관리 예방 플랫폼
          </div>

          <h1 className={styles.headline}>
            현장 사진<br />
            <span className={styles.accent}>한 장</span>으로<br />
            기록 관리을 막는다
          </h1>

          <p className={styles.sub}>
            월 450건의 인테리어 기록 관리.<br />
            원인은 하나였습니다. <strong>기록이 없어서.</strong>
          </p>

          <div className={styles.ctas}>
            <Link href="/login" className={styles.ctaPrimary}>
              지금 무료로 시작하기
            </Link>
            <a
              href="#demo"
              className={styles.ctaGhost}
              onClick={e => {
                e.preventDefault()
                document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              작동 방식 보기 →
            </a>
          </div>

          <p className={styles.hint}>신용카드 불필요 · 첫 현장 무료</p>
        </div>

        {/* 오른쪽: 안전 현황 미리보기 UI */}
        <div className={styles.preview} aria-hidden>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <span className={styles.previewDot} style={{ background: '#ef4444' }} />
              <span className={styles.previewDot} style={{ background: '#f59e0b' }} />
              <span className={styles.previewDot} style={{ background: '#10b981' }} />
              <span className={styles.previewTitle}>체크인 — 현장 체크</span>
            </div>

            {/* 가상 사진 업로드 영역 */}
            <div className={styles.photoArea}>
              <div className={styles.photoIcon}>📸</div>
              <p>방수 공사 완료 사진</p>
              <div className={styles.analyzing}>
                <span className={styles.analyzeBar} />
                AI 분석 중...
              </div>
            </div>

            {/* 체크 항목 */}
            <div className={styles.checkList}>
              <div className={`${styles.checkItem} ${styles.pass}`}>
                <span className={styles.checkBadge} data-result="GO">GO</span>
                <span>도막 두께 2mm 이상 확인</span>
              </div>
              <div className={`${styles.checkItem} ${styles.fail}`}>
                <span className={styles.checkBadge} data-result="위험 확인">위험 확인</span>
                <span>코너부 보강 처리 미확인</span>
              </div>
              <div className={`${styles.checkItem} ${styles.pass}`}>
                <span className={styles.checkBadge} data-result="GO">GO</span>
                <span>배수구 실링 처리 완료</span>
              </div>
              <div className={`${styles.checkItem} ${styles.warn}`}>
                <span className={styles.checkBadge} data-result="조건">조건</span>
                <span>핀홀 테스트 24시간 후 재확인</span>
              </div>
            </div>

            {/* 최종 현황 */}
            <div className={styles.verdict}>
              <span className={styles.verdictLabel}>최종 현황</span>
              <span className={styles.verdictResult}>
                <span className={styles.verdictIcon}>⚠️</span>
                조건부 통과
              </span>
              <p className={styles.verdictLaw}>
                근거: KS F 4917 방수공사 표준시방서 · 하자담보 3년
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 스크롤 인디케이터 */}
      <div className={styles.scrollHint}>
        <span />
        스크롤
      </div>
    </section>
  )
}
