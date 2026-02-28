import styles from './page.module.scss'

const offlineFeatures = [
  { icon: '✅', label: 'TBM 체크리스트', supported: true },
  { icon: '📱', label: 'QR 출역 체크인', supported: true },
  { icon: '📸', label: '사진 촬영/저장', supported: true },
  { icon: '📋', label: '체크리스트 조회', supported: true },
  { icon: '🤖', label: 'AI 채팅', supported: false },
  { icon: '📄', label: 'PDF 리포트', supported: false },
]

export default function OfflinePage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>📡</div>
        <h1 className={styles.title}>오프라인 상태입니다</h1>
        <p className={styles.description}>
          인터넷 연결을 확인해주세요.<br />
          연결이 복구되면 자동으로 동기화됩니다.
        </p>

        <div className={styles.featureList}>
          <p className={styles.featureTitle}>오프라인에서 사용 가능한 기능</p>
          {offlineFeatures.map((f) => (
            <div key={f.label} className={styles.featureItem}>
              <span>{f.icon}</span>
              <span className={styles.featureLabel}>{f.label}</span>
              <span className={f.supported ? styles.supported : styles.unsupported}>
                {f.supported ? '사용 가능' : '온라인 필수'}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.logo}>
          <span className={styles.logoText}>체<span className={styles.logoAccent}>키</span></span>
        </div>
        <span className={styles.tagline}>기록의 편 · 오프라인에서도 현장을 지킵니다</span>
      </div>
    </div>
  )
}
