'use client'

import { SPACE_TYPES, SpaceType } from '@/lib/ai/quote-chat'
import styles from './QuoteSpaceSelector.module.scss'

interface QuoteSpaceSelectorProps {
  onSelect: (space: SpaceType) => void
}

export default function QuoteSpaceSelector({ onSelect }: QuoteSpaceSelectorProps) {
  const residential = SPACE_TYPES.filter(s => s.category === 'residential')
  const commercial = SPACE_TYPES.filter(s => s.category === 'commercial')

  return (
    <div className={styles.container}>
      <div className={styles.intro}>
        <p className={styles.question}>어떤 공간을 시공할 예정인가요?</p>
        <p className={styles.hint}>공간 유형에 따라 평당 단가가 크게 달라져요</p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🏠 주거공간</h3>
        <div className={styles.grid}>
          {residential.map(space => (
            <button
              key={space.id}
              className={styles.card}
              onClick={() => onSelect(space)}
            >
              <span className={styles.emoji}>{space.emoji}</span>
              <span className={styles.label}>{space.label}</span>
              <span className={styles.desc}>{space.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🏪 상업공간</h3>
        <p className={styles.sectionNote}>상업공간은 인허가·설비 등으로 주거 대비 1.5~3배 비쌀 수 있어요</p>
        <div className={styles.grid}>
          {commercial.map(space => (
            <button
              key={space.id}
              className={`${styles.card} ${styles.commercial}`}
              onClick={() => onSelect(space)}
            >
              <span className={styles.emoji}>{space.emoji}</span>
              <span className={styles.label}>{space.label}</span>
              <span className={styles.desc}>{space.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
