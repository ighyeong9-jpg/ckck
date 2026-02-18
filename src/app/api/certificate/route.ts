/**
 * POST /api/certificate
 * AI 검증 인증서 발급 API
 * 서버 사이드 전용 - 점수 계산 및 인증서 저장
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { issueCertificate } from '@/lib/verification/certificateService'

export async function POST(request: Request) {
  try {
    // 1. 인증 확인
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 2. 요청 데이터 파싱
    const body = await request.json()
    const { projectId } = body

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { success: false, error: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 3. 인증서 발급
    const result = await issueCertificate(projectId, user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      certificate: result.certificate,
      score: result.score,
    })
  } catch (error) {
    console.error('Certificate issuance error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
