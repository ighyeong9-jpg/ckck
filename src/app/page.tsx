import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/landing/LandingPage'

export const metadata = {
  title: '체키 — 공사 분쟁, 증거가 없어서 집니다',
  description: '체키가 모든 기록을 타임스탬프로 잠급니다. 사진 한 장이 법정에서 증거가 됩니다.',
}

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/projects')
  return <LandingPage />
}
