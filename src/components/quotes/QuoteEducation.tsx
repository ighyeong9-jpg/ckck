'use client'

import { useState } from 'react'
import styles from './QuoteEducation.module.scss'

interface EduItem {
  id: string
  title: string
  emoji: string
  content: string
}

const EDU_ITEMS: EduItem[] = [
  {
    id: 'material',
    emoji: '🪵',
    title: '자재 등급별 가격 차이',
    content: `자재 선택이 전체 예산의 40~60%를 좌우합니다.

• 경제형: 국산 중저가 자재, 실용적이나 내구성 낮을 수 있음
• 표준형: 품질·가격 균형. 5~10년 사용에 최적
• 고급형: 수입 자재 또는 프리미엄 국산. 내구성 우수
• 프리미엄: 이탈리아산 타일, 독일산 욕실 등. 가격 2배 이상

TIP: 자주 교체 어려운 바닥·타일은 등급 올리고, 소품류는 낮추는 전략 추천`,
  },
  {
    id: 'labor',
    emoji: '👷',
    title: '인건비가 오르는 이유',
    content: `인건비는 전체 공사비의 30~50%를 차지합니다.

• 숙련도: 경력 10년↑ 기술자 = 신인 대비 1.5~2배
• 일정 압박: 야간·주말 작업 시 50~100% 할증
• 동시 작업: 여러 팀 동시 투입 시 조율 비용 발생
• 계절: 한여름/한겨울 외부 작업 할증 가능
• 지역: 서울 강남권 = 수도권 외곽 대비 20~30%↑

TIP: 여유로운 일정이 인건비를 가장 크게 절감합니다`,
  },
  {
    id: 'schedule',
    emoji: '📅',
    title: '일정이 짧으면 왜 비싸나요',
    content: `촉박한 일정은 다방면으로 비용을 높입니다.

• 인력 집중 투입: 동시 다수 팀 운영 → 관리비 상승
• 야간/연장 작업: 기본 인건비의 1.5배 이상
• 자재 빠른 조달: 재고 있는 비싼 자재로 대체
• 실수 증가: 급한 작업 → 하자 → 재시공 비용
• 건조 시간 부족: 습도·접착 문제로 하자 가능성↑

체크인 기준: 2주 이내 +10%, 1주 이내 +15% 할증 적용`,
  },
  {
    id: 'commercial',
    emoji: '🏪',
    title: '상업공간이 비싼 이유',
    content: `상업공간은 주거 대비 1.5~3배 비용이 발생합니다.

• 인허가: 건축 용도 변경, 소방 허가 등 (100~500만원↑)
• 소방시설: 스프링클러, 비상구, 화재감지기 (의무)
• 주방설비: 카페/식당 — 환기덕트, 급배수, 가스 (500~3,000만원)
• 의료기기: 병원 — 의료가스, 위생 특수 마감
• 운동시설: 헬스장 — 환기, 방진 바닥재, 락커
• 전기용량: 상업용 3상 전기 증설 필요한 경우 多

TIP: 상업공간은 반드시 현장 조사 후 실견적 받으세요`,
  },
  {
    id: 'quality',
    emoji: '🔍',
    title: '싼 견적의 함정',
    content: `견적이 지나치게 저렴하다면 이유가 있습니다.

• 자재 등급 하향: "표준" 계약 후 저가 자재 투입
• 하도급 과다: 원청 → 하청 → 재하청 → 품질 저하
• 인건비 삭감: 미숙련 인력 투입
• 항목 누락: 견적서에 없는 항목은 추가 청구
• 보증 없음: 하자 발생 시 연락 두절

체크인로 할 수 있는 것: 진단 체크리스트로 현장 상태 기록, 견적서 항목별 검토, 계약서 특약 사항 기록`,
  },
]

export default function QuoteEducation() {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setOpenId(prev => prev === id ? null : id)
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>📚 인테리어 비용 바로 알기</h3>
      <p className={styles.subtitle}>궁금한 항목을 눌러보세요</p>
      <div className={styles.list}>
        {EDU_ITEMS.map(item => (
          <div key={item.id} className={styles.item}>
            <button
              className={`${styles.header} ${openId === item.id ? styles.open : ''}`}
              onClick={() => toggle(item.id)}
            >
              <span className={styles.itemEmoji}>{item.emoji}</span>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.arrow}>{openId === item.id ? '▲' : '▼'}</span>
            </button>
            {openId === item.id && (
              <div className={styles.content}>
                <pre className={styles.contentText}>{item.content}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
