import styles from './page.module.scss'

export default function OfflinePage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>📡</div>
        <h1 className={styles.title}>오프라인 상태입니다</h1>
        <p className={styles.description}>
          인터넷 연결을 확인해주세요.<br />
          연결이 복구되면 자동으로 다시 접속됩니다.
        </p>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>✓</span>
          <span className={styles.logoText}>Check-In</span>
        </div>
        <span className={styles.tagline}>기록의 편</span>
      </div>
    </div>
  )
}
