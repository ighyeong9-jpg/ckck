export type ClientType = 'client' | 'contractor' | 'supplier' | 'other'

export interface Client {
  id: string
  user_id: string
  name: string
  company: string | null
  client_type: ClientType
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const CLIENT_TYPES = [
  { id: 'client', name: '발주자', icon: '👤' },
  { id: 'contractor', name: '시공사', icon: '🏗️' },
  { id: 'supplier', name: '자재업체', icon: '🚚' },
  { id: 'other', name: '기타', icon: '📋' },
] as const
