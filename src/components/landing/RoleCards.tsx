'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './RoleCards.module.scss'

const ROLES = [
  {
    id: 'customer',
    icon: '🏠',
    title: '집주인 · 세입자',
    pain: '내 돈 내고 하자투성이?',
    features: ['하자 사진 자동 기록', '담보기간 만료 알림', '기록 관리 징후 즉시 감지', '내용통지 초안 자동 생성'],
    cta: '내 공사 지키기',
  },
  {
    id: 'designer',
    icon: '✏️',
    title: '인테리어 디자이너',
    pain: '시공 잘못인데 내 책임?',
    features: ['공정별 안전 현황 기록', '시공사 귀책 시공 기록 확보', '견적 표준화', 'AI 자동 체크리스트'],
    cta: '책임 범위 명확히',
  },
  {
    id: 'contractor',
    icon: '🔨',
    title: '시공사 · 작업자',
    pain: '말 바꾸는 고객 대응법?',
    features: ['모든 합의 서면 자동 저장', 'AI 인증서 발급', '추가공사 변경계약 관리', '포트폴리오 자동 생성'],
    cta: '기록 관리 없는 현장 만들기',
  },
  {
    id: 'supervisor',
    icon: '📋',
    title: '감리자',
    pain: '기록 없어서 기록 관리 생긴다',
    features: ['체크리스트 디지털 관리', '법령 근거 자동 첨부', '현장별 일보 자동 작성', '다중 현장 통합 관리'],
    cta: '감리 기록 디지털화',
  },
  {
    id: 'subcontractor',
    icon: '👷',
    title: '하도급 업체',
    pain: '기성금 못 받을까봐 걱정',
    features: ['하도급법 즉시 안내', '원도급 미지급 자동 감지', '직불 청구 절차 안내', '임금 체불 시공 기록 보존'],
    cta: '내 공임 지키기',
  },
  {
    id: 'self',
    icon: '🛠️',
    title: '셀프인테리어',
    pain: '전문가 없이 어떻게 하지?',
    features: ['공종별 표준 시방서 안내', '자재 시세 비교', '시공 순서 AI 안내', '하자 예방 체크리스트'],
    cta: '셀프로 완성하기',
  },
]

export default function RoleCards() {
  const [active, setActive] = useState('customer')
  const activeRole = ROLES.find(r => r.id === active)!

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>역할별 맞춤 기능</div>
        <h2 className={styles.title}>
          <span className={styles.accent}>누구에게나</span> 필요한 이유가 있습니다
        </h2>

        {/* 역할 탭 */}
        <div className={styles.tabs}>
          {ROLES.map(r => (
            <button
              key={r.id}
              className={`${styles.tab} ${active === r.id ? styles.activeTab : ''}`}
              onClick={() => setActive(r.id)}
            >
              <span className={styles.tabIcon}>{r.icon}</span>
              <span className={styles.tabTitle}>{r.title}</span>
            </button>
          ))}
        </div>

        {/* 선택된 역할 상세 */}
        <div className={styles.detail} key={active}>
          <div className={styles.detailLeft}>
            <div className={styles.painBubble}>
              <span className={styles.painIcon}>😩</span>
              &ldquo;{activeRole.pain}&rdquo;
            </div>
            <div className={styles.arrowDown}>↓</div>
            <div className={styles.solutionBubble}>
              <span className={styles.solveLabel}>체키의 답변</span>
              <ul className={styles.featureList}>
                {activeRole.features.map(f => (
                  <li key={f}>
                    <span className={styles.check}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className={styles.detailRight}>
            <div className={styles.roleIcon}>{activeRole.icon}</div>
            <div className={styles.roleTitle}>{activeRole.title}</div>
            <Link href="/login" className={styles.roleCtaBtn}>
              {activeRole.cta} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
