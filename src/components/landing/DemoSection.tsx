'use client'

import styles from './DemoSection.module.scss'
import DemoUpload from './DemoUpload'

export default function DemoSection() {
  return (
    <section id="demo" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>직접 체험해보세요</div>
        <h2 className={styles.title}>
          현장 사진 한 장만 올려보세요<br />
          <span className={styles.accent}>AI가 즉시 확인</span>해드려요
        </h2>
        <p className={styles.sub}>로그인 없이 1회 무료 체험 · 실제 Gemini AI 분석</p>

        <div className={styles.uploadWrap}>
          <DemoUpload />
        </div>

        <ul className={styles.badges}>
          <li>✅ 안전 현황 즉시 확인</li>
          <li>📋 KCS 법령 기준 자동 대조</li>
          <li>⚠️ 기록 관리 예방 포인트 제시</li>
        </ul>
      </div>
    </section>
  )
}
