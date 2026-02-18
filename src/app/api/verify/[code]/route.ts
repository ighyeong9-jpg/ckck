/**
 * GET /api/verify/[code]
 * 인증서 공개 검증 API
 * 인증 불필요 - 누구나 코드로 검증 가능
 */
import { NextResponse } from 'next/server'
import { verifyCertificate } from '@/lib/verification/certificateService'

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: '인증서 코드가 필요합니다.' },
        { status: 400 }
      )
    }

    const result = await verifyCertificate(code)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Certificate verification error:', error)
    return NextResponse.json(
      { valid: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
