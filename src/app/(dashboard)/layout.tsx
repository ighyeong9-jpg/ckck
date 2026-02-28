// import { redirect } from 'next/navigation'  // ── 인증 꺼짐
// import { createClient } from '@/lib/supabase/server'  // ── 인증 꺼짐
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  /* 인증 가드 — 켜려면 위 import 주석 해제 + 아래 주석 해제
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  */

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  )
}
