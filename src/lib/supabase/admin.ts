/**
 * 서버 전용 Supabase Admin 클라이언트
 * SERVICE_ROLE_KEY를 사용하여 RLS를 우회 (서버 사이드 전용)
 * SERVICE_ROLE_KEY가 없는 경우 ANON_KEY로 폴백 (개발 환경, RLS 비활성화 전제)
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminClient: SupabaseClient<any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): SupabaseClient<any> {
  if (adminClient) return adminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  const key = serviceRoleKey || anonKey
  if (!key) {
    throw new Error('No Supabase key available (SERVICE_ROLE_KEY or ANON_KEY)')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient = createClient<any>(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}
