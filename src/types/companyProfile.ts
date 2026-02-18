export interface CompanyProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: string
  company_name?: string | null
  description?: string | null
  specialty_tags?: string[]
  address?: string | null
  logo_url?: string | null
  portfolio_images?: string[]
  avg_verification_score?: number
  total_projects?: number
  avg_duration_days?: number
  profile_token?: string | null
  is_public?: boolean
  created_at: string
  updated_at: string
}

export const SPECIALTY_OPTIONS = [
  '카페', '음식점', '주점/바', '베이커리', '미용실', '병원/클리닉',
  '피트니스', '소매점', '사무실', '학원', '아파트', '빌라', '단독주택',
  '리모델링', '인테리어', '전기공사', '설비공사', '도장공사', '타일공사',
]
