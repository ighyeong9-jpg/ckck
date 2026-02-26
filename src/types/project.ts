export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed'

export interface Project {
  id: string
  user_id: string
  name: string
  client_name: string
  industry: string
  status: ProjectStatus
  progress: number
  start_date: string
  end_date: string
  risk_score: number
  created_at: string
  updated_at: string
  // 신규 컬럼 (migration: 20260227_projects_new_fields.sql 실행 후 사용 가능)
  address?: string
  budget?: number
  description?: string
  actual_end_date?: string
}

export interface CreateProjectInput {
  name: string
  client_name: string
  industry?: string
  status: ProjectStatus
  start_date: string
  end_date: string
  address?: string
  budget?: number
  description?: string
}

export interface WarrantyRecord {
  id: string
  project_id: string
  trade_type: string
  trade_label: string
  duration_years: number
  start_date: string
  end_date: string
  status: 'active' | 'expiring_soon' | 'expired'
  notes?: string
  created_at: string
}
