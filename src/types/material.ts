export type MaterialStatus = 'pending' | 'ordered' | 'shipped' | 'delivered' | 'returned'

export interface Material {
  id: string
  project_id: string
  name: string
  category: string
  unit: string
  quantity: number
  unit_price: number
  total_price: number
  supplier: string | null
  status: MaterialStatus
  expected_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const MATERIAL_CATEGORIES = [
  { id: 'wood', name: '목재', icon: '🪵' },
  { id: 'tile', name: '타일', icon: '🧱' },
  { id: 'paint', name: '페인트', icon: '🎨' },
  { id: 'electrical', name: '전기자재', icon: '💡' },
  { id: 'plumbing', name: '설비자재', icon: '🚿' },
  { id: 'hardware', name: '철물', icon: '🔩' },
  { id: 'flooring', name: '바닥재', icon: '🟫' },
  { id: 'wallpaper', name: '벽지', icon: '📜' },
  { id: 'furniture', name: '가구', icon: '🪑' },
  { id: 'other', name: '기타', icon: '📦' },
] as const

export const MATERIAL_STATUSES = [
  { id: 'pending', name: '대기', color: '#6b7280' },
  { id: 'ordered', name: '발주', color: '#f59e0b' },
  { id: 'shipped', name: '배송중', color: '#3b82f6' },
  { id: 'delivered', name: '입고완료', color: '#10b981' },
  { id: 'returned', name: '반품', color: '#ef4444' },
] as const

export const MATERIAL_STATUS = MATERIAL_STATUSES
