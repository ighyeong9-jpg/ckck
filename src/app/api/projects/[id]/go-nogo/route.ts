/**
 * GET /api/projects/:id/go-nogo
 * GO/NO-GO 판정 조회
 *
 * 판정 기준:
 *   - violated 법령 존재 → NOGO
 *   - risk_score >= 76 → NOGO
 *   - 필수 체크리스트 완료율 < 80% → NOGO
 */
import { NextResponse } from 'next/server'
import { getGoNoGo } from '@/lib/engines/riskEngine'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getGoNoGo(params.id)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
