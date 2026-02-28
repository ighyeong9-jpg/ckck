'use client'

import Link from 'next/link'
import styles from './AIFeatures.module.scss'

const FEATURES = [
  {
    emoji: '💰',
    title: 'AI 예산 가이드',
    desc: '공간 유형·면적·등급 선택만으로 30초 안에 인테리어 예산 범위를 자동 산출합니다.',
    tags: ['아파트', '카페', '사무실', '병원'],
    href: '/login',
    badge: '무료',
  },
  {
    emoji: '📡',
    title: '현장 이슈 AI 분류',
    desc: '현장 상황을 텍스트로 보고하면 AI가 즉시 심각도를 분류하고 조치를 안내합니다.',
    tags: ['안전', '하자', '공정지연', '법규'],
    href: '/login',
    badge: '신규',
  },
  {
    emoji: '⚖️',
    title: '판례 기반 기록 관리 예방',
    desc: '22건 이상의 실제 판례 데이터베이스로 AI가 기록 관리 징후를 자동 감지합니다.',
    tags: ['구두합의', '추가비용', '하자담보', '계약서'],
    href: '/login',
    badge: '판례',
  },
  {
    emoji: '🤖',
    title: 'AI 현장 비서',
    desc: '사진 한 장으로 현장 상태를 자동 분석하고, 법규 미충족·하자 위험을 즉시 알려드립니다.',
    tags: ['사진 분석', '법규 검색', '일보 작성'],
    href: '/login',
    badge: 'AI',
  },
]

export default function AIFeatures() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>AI 기능</span>
          <h2 className={styles.title}>
            현장 소장이 꼭 필요했던<br />
            <span className={styles.accent}>AI 비서 4종</span>
          </h2>
          <p className={styles.subtitle}>
            각각 별도 앱이 아닙니다. 체키 하나로 전부 됩니다.
          </p>
        </div>

        <div className={styles.grid}>
          {FEATURES.map(f => (
            <Link key={f.title} href={f.href} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.cardEmoji}>{f.emoji}</span>
                <span className={styles.cardBadge}>{f.badge}</span>
              </div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
              <div className={styles.cardTags}>
                {f.tags.map(t => (
                  <span key={t} className={styles.tag}>{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
