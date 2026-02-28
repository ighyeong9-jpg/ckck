import { createClient } from '@/lib/supabase/server'
import ProjectDetailHeader from './ProjectDetailHeader'
import ProjectContextTracker from '@/components/project/ProjectContextTracker'
import styles from './layout.module.scss'

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const supabase = createClient()
  const projectId = params.id

  // 프로젝트 이름 가져오기
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  if (projectError) {
    console.error('Project load error:', projectError)
  }

  // 탭 상태 판단: 각 테이블에 데이터가 있는지 체크
  const statusChecks = await Promise.all([
    supabase.from('diagnostic_responses').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('quote_line_items').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('cost_analysis').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('change_orders').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('evidence_files').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('agreements').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('processes').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('workforce').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('materials').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('defects').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('evidence_files').select('id', { count: 'exact', head: true }).eq('project_id', projectId).like('file_type', 'image/%'),
  ])

  const tabKeys = [
    'diagnostic', 'sow', 'cost-analysis', 'changes',
    'evidence-package', 'agreement', 'report',
    'process', 'workforce', 'materials', 'defects', 'gallery',
  ]

  const tabStatuses: Record<string, 'completed' | 'in_progress' | 'not_started'> = {}
  tabKeys.forEach((key, index) => {
    const count = statusChecks[index].count ?? 0
    if (count > 0) {
      tabStatuses[key] = 'completed'
    } else {
      tabStatuses[key] = 'not_started'
    }
  })

  return (
    <div className={styles.projectLayout}>
      {/* AI 채팅 컨텍스트 현황 확인: 현재 프로젝트를 localStorage에 저장 */}
      <ProjectContextTracker
        projectId={projectId}
        projectName={project?.name || '프로젝트'}
      />
      <ProjectDetailHeader
        projectId={projectId}
        projectName={project?.name || '프로젝트'}
        tabStatuses={tabStatuses}
      />
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}
