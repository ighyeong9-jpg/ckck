import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { project_id, expires_days = 7 } = await request.json()

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const share_token = generateToken()
    const expires_at = new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString()

    const share_url = `/share/${share_token}`

    const { data, error } = await supabase
      .from('shares')
      .insert([{
        project_id,
        created_by: user.id,
        share_token,
        share_url,
        expires_at,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      share_token: data.share_token,
      share_url: data.share_url,
      expires_at: data.expires_at,
    })
  } catch (err: any) {
    console.error('[API /share] 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
