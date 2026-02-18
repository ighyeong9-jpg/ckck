/**
 * AI Agent 프로젝트 컨텍스트 로더
 * projectId로 Supabase에서 프로젝트 관련 데이터를 로드
 */

import { createClient } from '@/lib/supabase/server'

export interface ProjectContext {
  project: any | null
  diagnosticCount: number
  quoteItems: any[]
  costAnalysis: any | null
  changeOrders: any[]
  evidenceFiles: any[]
  agreements: any[]
  reports: any[]
  processes: any[]
  workforce: any[]
  materials: any[]
}

export async function loadProjectContext(projectId: string): Promise<ProjectContext> {
  const supabase = createClient()

  const [
    { data: project },
    { data: diagnostics, count: diagnosticCount },
    { data: quoteItems },
    { data: costAnalysis },
    { data: changeOrders },
    { data: evidenceFiles },
    { data: agreements },
    { data: reports },
    { data: processes },
    { data: workforce },
    { data: materials },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
    supabase.from('diagnostic_responses').select('*', { count: 'exact' }).eq('project_id', projectId),
    supabase.from('quote_line_items').select('*').eq('project_id', projectId),
    supabase.from('cost_analysis').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('change_orders').select('*').eq('project_id', projectId),
    supabase.from('evidence_files').select('*').eq('project_id', projectId),
    supabase.from('agreements').select('*').eq('project_id', projectId),
    supabase.from('reports').select('*').eq('project_id', projectId),
    supabase.from('processes').select('*').eq('project_id', projectId).order('order_index'),
    supabase.from('workforce').select('*').eq('project_id', projectId),
    supabase.from('materials').select('*').eq('project_id', projectId),
  ])

  return {
    project,
    diagnosticCount: diagnosticCount ?? 0,
    quoteItems: quoteItems || [],
    costAnalysis,
    changeOrders: changeOrders || [],
    evidenceFiles: evidenceFiles || [],
    agreements: agreements || [],
    reports: reports || [],
    processes: processes || [],
    workforce: workforce || [],
    materials: materials || [],
  }
}

export async function loadUserProjects(): Promise<any[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  return data || []
}
