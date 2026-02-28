import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './layout.module.scss'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>Check-In</h1>
          <span className={styles.subtitle}>공사 현황 확인</span>
        </div>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
