import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
}
