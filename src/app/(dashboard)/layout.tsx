// import { redirect } from 'next/navigation'  // ── 테스트 바이패스 중 비활성
// import { createClient } from '@/lib/supabase/server'  // ── 테스트 바이패스 중 비활성
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ══════════════════════════════════════════════════════════
  // 테스트 바이패스: 인증 건너뜀 (복구하려면 이 블록 삭제 후 아래 주석 해제)
  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  )
  // ══════════════════════════════════════════════════════════

  /* 실제 인증 코드 — 나중에 위 return 블록 삭제 후 아래 주석 해제
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes - redirect to login if not authenticated
  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  )
  */
}
