export type WorkStatus = 'present' | 'absent' | 'half_day'

export interface Workforce {
  id: string
  project_id: string
  name: string
  role: string
  worker_type: string
  phone: string | null
  daily_wage: number
  work_date: string
  hours_worked: number
  work_hours: number
  status: WorkStatus
  attendance_status: WorkStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export const WORK_ROLES = [
  { id: 'foreman', name: '현장소장', icon: '👷' },
  { id: 'carpenter', name: '목수', icon: '🪚' },
  { id: 'electrician', name: '전기기사', icon: '⚡' },
  { id: 'plumber', name: '설비기사', icon: '🔧' },
  { id: 'tiler', name: '타일공', icon: '🧱' },
  { id: 'painter', name: '도장공', icon: '🎨' },
  { id: 'wallpaper', name: '도배공', icon: '📜' },
  { id: 'labor', name: '보조인부', icon: '🏗️' },
  { id: 'other', name: '기타', icon: '👤' },
] as const

export const WORK_STATUSES = [
  { id: 'present', name: '출근', color: '#10b981' },
  { id: 'absent', name: '결근', color: '#ef4444' },
  { id: 'half_day', name: '반차', color: '#f59e0b' },
] as const

export const WORKER_TYPES = WORK_ROLES
export const ATTENDANCE_STATUS = WORK_STATUSES
