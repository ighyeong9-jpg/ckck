export type AgreementStatus = 'pending' | 'partial' | 'completed'

export interface Agreement {
  id: string
  project_id: string
  // 발주자
  client_agreed: boolean
  client_name: string | null
  client_signed_at: string | null
  client_signature: string | null
  // 시공사
  contractor_agreed: boolean
  contractor_name: string | null
  contractor_signed_at: string | null
  contractor_signature: string | null
  // 관리자
  manager_agreed: boolean
  manager_name: string | null
  manager_signed_at: string | null
  manager_signature: string | null
  // 합의 내용
  agreement_content: string | null
  total_amount: number
  notes: string | null
  status: AgreementStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Party {
  id: 'client' | 'contractor' | 'manager'
  name: string
  icon: string
  color: string
}

export const PARTIES: Party[] = [
  { id: 'client', name: '발주자', icon: '👤', color: '#3b82f6' },
  { id: 'contractor', name: '시공사', icon: '🏗️', color: '#f59e0b' },
  { id: 'manager', name: '관리자', icon: '📋', color: '#10b981' },
]
