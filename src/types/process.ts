export type ProcessStatus = 'pending' | 'in_progress' | 'completed' | 'delayed'

export interface Process {
  id: string
  project_id: string
  name: string
  description: string | null
  status: ProcessStatus
  progress: number
  start_date: string | null
  end_date: string | null
  sort_order: number
  order_index: number
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const PROCESS_STATUSES = [
  { id: 'pending', name: '대기', color: '#6b7280' },
  { id: 'in_progress', name: '진행중', color: '#3b82f6' },
  { id: 'completed', name: '완료', color: '#10b981' },
  { id: 'delayed', name: '지연', color: '#ef4444' },
] as const

export const PROCESS_STATUS = PROCESS_STATUSES

export const DEFAULT_PROCESSES = [
  '철거공사',
  '전기공사',
  '설비공사',
  '목공사',
  '타일공사',
  '도장공사',
  '도배공사',
  '바닥공사',
  '가구설치',
  '마감정리',
]
