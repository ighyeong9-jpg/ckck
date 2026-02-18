export interface UserSettings {
  id: string
  user_id: string
  display_name: string | null
  phone: string | null
  company: string | null
  notify_email: boolean
  notify_push: boolean
  notify_sms: boolean
  theme: 'light' | 'dark'
  language: string
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  project_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  description: string | null
  created_at: string
}
