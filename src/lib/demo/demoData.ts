/**
 * demoData.ts — 데모 모드용 로컬 샘플 데이터
 * Supabase 없이 localStorage로 동작
 */

const DEMO_KEY = 'checkin_demo_mode'
const DEMO_USED_KEY = 'checkin_demo_used'

export interface DemoProject {
  id: string
  name: string
  industry: string
  client_name: string
  status: string
  start_date: string
  end_date: string
  risk_score: number
  progress: number
  address: string
  budget: number
}

const SAMPLE_PROJECTS: DemoProject[] = [
  {
    id: 'demo-1',
    name: '강남 카페 리모델링',
    industry: 'cafe',
    client_name: '홍길동 대표',
    status: 'in_progress',
    start_date: '2026-01-15',
    end_date: '2026-03-15',
    risk_score: 42,
    progress: 65,
    address: '서울 강남구 역삼동 123-4',
    budget: 45000000,
  },
  {
    id: 'demo-2',
    name: '마포 아파트 인테리어',
    industry: 'apartment',
    client_name: '김미래 고객',
    status: 'planning',
    start_date: '2026-03-01',
    end_date: '2026-04-30',
    risk_score: 18,
    progress: 10,
    address: '서울 마포구 공덕동 456',
    budget: 28000000,
  },
]

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DEMO_KEY) === 'true'
}

export function enterDemoMode(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_KEY, 'true')
  localStorage.setItem(DEMO_USED_KEY, JSON.stringify({ timestamp: Date.now() }))
}

export function exitDemoMode(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DEMO_KEY)
}

export function getDemoProjects(): DemoProject[] {
  return SAMPLE_PROJECTS
}
