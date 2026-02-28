/**
 * GET /api/photos/:id/verify
 * 개별 증빙 파일 SHA-256 무결성 검증
 *
 * Supabase Storage에서 파일을 다운로드하여 SHA-256 재계산 후
 * DB 저장값과 비교.
 */
import { NextResponse } from 'next/server'
import { verifyFileIntegrity } from '@/lib/engines/evidenceEngine'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await verifyFileIntegrity(params.id)

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: result.valid ? 200 : 409 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
