import styles from './layout.module.scss'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.logo}>
          체크<span className={styles.accent}>인</span>
        </div>
        <span className={styles.subtitle}>고객 포털</span>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
