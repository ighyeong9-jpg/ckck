import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

interface Props {
  params: { shareId: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()

  const { data: shareLink } = await supabase
    .from('shares')
    .select('project_id')
    .eq('share_token', params.shareId)
    .single()

  if (!shareLink) {
    return {
      title: '공유 링크 - Check-In',
      description: '유효하지 않은 공유 링크입니다.',
    }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('name, industry, progress, status')
    .eq('id', shareLink.project_id)
    .single()

  const { data: cert } = await supabase
    .from('verification_certificates')
    .select('grade')
    .eq('project_id', shareLink.project_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const projectName = project?.name || '프로젝트'
  const progress = project?.progress || 0
  const grade = cert?.grade || '-'

  return {
    title: `${projectName} 공사 진행현황 - Check-In`,
    description: `진행률 ${progress}% | AI 검증 ${grade}등급 | Check-In 기록의 편`,
    openGraph: {
      title: `${projectName} 공사 진행현황`,
      description: `진행률 ${progress}% | AI 검증 ${grade}등급 | Check-In`,
      type: 'website',
      siteName: 'Check-In 기록의 편',
    },
  }
}

export default function ShareLayout({ children }: Props) {
  return <>{children}</>
}
