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
}

export interface CreateProjectInput {
  name: string
  client_name: string
  status: ProjectStatus
  start_date: string
  end_date: string
}
