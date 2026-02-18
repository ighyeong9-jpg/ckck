export interface ShareLink {
  id: string
  project_id: string
  created_by: string
  share_token: string
  share_url: string
  masked_fields?: string[] | null
  is_active?: boolean
  expires_at: string
  view_count?: number
  created_at: string
  updated_at?: string
}
